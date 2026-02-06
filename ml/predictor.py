"""
Hava Tahmini Dogrulama Sistemi (Tarlaya Ozel)
================================================
Her tarla (field_id) icin bagimsiz bir Random Forest Classifier modeli egitir.

AMAC: Hava durumu servisi "yagmur yagacak" dediginde, BU TARLAYA gercekten
yagmur gelip gelmeyecegini gecmis verilere bakarak dogrulamak.

Mantik:
  - Hava tahmini yagmur diyor -> ML modeline sor
  - ML: "Bu tarlada, bu ayda, bu kosullarda hava tahmini yagmur dediginde
         gecmiste %35 oraninda gercekten yagmur yagmis" -> GUVENME, SULA
  - ML: "Bu tarlada, bu kosullarda hava tahmini yagmur dediginde
         gecmiste %85 oraninda gercekten yagmur yagmis" -> GUVEN, BEKLE

Modeller ml_models/field_{id}.pkl olarak saklanir.
"""

import os
import json
import datetime
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

import pandas as pd
import numpy as np
import joblib
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, f1_score

import models
from database import SessionLocal

logger = logging.getLogger("ml.predictor")

# Model dosyalari dizini
ML_MODELS_DIR = Path(__file__).parent.parent / "ml_models"
ML_MODELS_DIR.mkdir(exist_ok=True)

# Model meta bilgileri dosyasi
META_FILE = ML_MODELS_DIR / "meta.json"


# ============================================================
# 1. OTOMATIK SUTUN TESPITI
# ============================================================

def auto_detect_columns() -> Dict[str, List[str]]:
    """SQLAlchemy model siniflarindan ML'e uygun sutunlari otomatik tespit eder."""
    result = {}
    for model_cls in [models.SensorLog, models.WeatherForecast]:
        table_name = model_cls.__tablename__
        mapper = sa_inspect(model_cls)
        numeric_cols, boolean_cols, datetime_cols = [], [], []
        for col in mapper.columns:
            col_type = str(col.type).upper()
            if col.primary_key or col.foreign_keys:
                continue
            if "FLOAT" in col_type or "INTEGER" in col_type:
                numeric_cols.append(col.key)
            elif "BOOLEAN" in col_type:
                boolean_cols.append(col.key)
            elif "DATETIME" in col_type or "DATE" in col_type:
                datetime_cols.append(col.key)
        result[table_name] = {"numeric": numeric_cols, "boolean": boolean_cols, "datetime": datetime_cols}
    return result


# ============================================================
# 2. EGITIM VERISI HAZIRLAMA
# ============================================================

def build_training_dataframe(db: Session, field_id: int) -> Tuple[pd.DataFrame, str]:
    """
    Tarlaya ozel egitim verisi olusturur.

    WeatherForecast (tahmin) ile SensorLog (gercek) zaman bazli eslestirilir:
      - Feature: Hava tahmininin soyledigi + ortam kosullari + zaman
      - Target:  Gercekte yagmur yagdi mi? (is_raining from SensorLog)

    Model ogrenir: "Tahmin yagmur dediginde BU TARLADA gercekten yagiyor mu?"
    """
    sensor_logs = db.query(models.SensorLog).filter(
        models.SensorLog.field_id == field_id
    ).order_by(models.SensorLog.timestamp).all()

    if len(sensor_logs) < 20:
        raise ValueError(f"Tarla {field_id}: yetersiz veri ({len(sensor_logs)} kayit, min 20)")

    sensor_data = [{
        "timestamp": log.timestamp,
        "moisture": log.moisture,
        "temperature": log.temperature,
        "is_raining": int(log.is_raining),
    } for log in sensor_logs]

    df = pd.DataFrame(sensor_data)

    # Temporal feature'lar
    df["hour"] = df["timestamp"].dt.hour
    df["month"] = df["timestamp"].dt.month
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # WeatherForecast ile birlestir
    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.field_id == field_id
    ).all()

    if forecasts:
        fc_df = pd.DataFrame([{
            "fc_timestamp": fc.forecast_date,
            "rain_probability": fc.rain_probability,
            "expected_rain_amount": fc.expected_rain_amount,
        } for fc in forecasts]).sort_values("fc_timestamp")

        df = df.sort_values("timestamp")
        df = pd.merge_asof(
            df, fc_df,
            left_on="timestamp", right_on="fc_timestamp",
            direction="nearest", tolerance=pd.Timedelta("6h"),
        )

        df["rain_probability"] = df["rain_probability"].fillna(
            df["rain_probability"].median() if df["rain_probability"].notna().any() else 30.0
        )
        df["expected_rain_amount"] = df["expected_rain_amount"].fillna(0.0)
        if "fc_timestamp" in df.columns:
            df = df.drop(columns=["fc_timestamp"])

        # ONEMLI: "Tahmin yagmur diyor mu?" binary feature
        df["tahmin_yagmur_diyor"] = (df["rain_probability"] > 40).astype(int)

        # Tarla gecmisindeki tahmin isabet penceresi (son 10 kayitlik rolling)
        df["son_tahmin_isabeti"] = (
            (df["tahmin_yagmur_diyor"] == df["is_raining"])
            .rolling(window=10, min_periods=1).mean().values
        )
    else:
        df["rain_probability"] = 30.0
        df["expected_rain_amount"] = 0.0
        df["tahmin_yagmur_diyor"] = 0
        df["son_tahmin_isabeti"] = 0.5

    df = df.drop(columns=["timestamp"]).fillna(0)

    # Istatistik
    rain_pct = df["is_raining"].mean() * 100
    tahmin_diyor = df[df["tahmin_yagmur_diyor"] == 1]
    if len(tahmin_diyor) > 0:
        gercek_oran = tahmin_diyor["is_raining"].mean() * 100
        guv_msg = f"Tahmin yagmur dediginde gercekte %{gercek_oran:.0f} yagmis"
    else:
        guv_msg = "Yeterli tahmin-gercek eslesmesi yok"

    info = f"Tarla {field_id}: {len(df)} satir, yagmurlu: %{rain_pct:.1f}, {guv_msg}"
    return df, info


# ============================================================
# 3. TAHMIN GUVENILIRLIGI HESAPLAMA
# ============================================================

def _hesapla_tahmin_guvenilirligi(db: Session, field_id: int) -> Dict[str, Any]:
    """
    Bu tarlada hava tahmininin gecmiste ne kadar tutarli oldugunu hesaplar.
    "Hava tahmini yagmur dediginde bu tarlaya gercekten yagmur gelmis mi?"
    """
    sensor_logs = db.query(models.SensorLog).filter(
        models.SensorLog.field_id == field_id
    ).order_by(models.SensorLog.timestamp).all()

    forecasts = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.field_id == field_id
    ).all()

    if not sensor_logs or not forecasts:
        return {"genel_isabet": 50.0, "guvenilir_mi": False, "mesaj": "Yetersiz veri"}

    sensor_df = pd.DataFrame([{
        "timestamp": s.timestamp, "is_raining": int(s.is_raining),
    } for s in sensor_logs]).sort_values("timestamp")

    fc_df = pd.DataFrame([{
        "fc_timestamp": f.forecast_date, "rain_probability": f.rain_probability,
    } for f in forecasts]).sort_values("fc_timestamp")

    merged = pd.merge_asof(
        sensor_df, fc_df,
        left_on="timestamp", right_on="fc_timestamp",
        direction="nearest", tolerance=pd.Timedelta("6h"),
    ).dropna(subset=["rain_probability"])

    if len(merged) < 10:
        return {"genel_isabet": 50.0, "guvenilir_mi": False, "mesaj": "Yetersiz eslestirme"}

    # Tahmin yagmur dedigi satirlar
    tahmin_yagmur = merged[merged["rain_probability"] > 40]

    if len(tahmin_yagmur) == 0:
        return {"genel_isabet": 50.0, "guvenilir_mi": False, "mesaj": "Tahmin hic yagmur dememis"}

    genel_isabet = round(tahmin_yagmur["is_raining"].mean() * 100, 1)

    # Aylik kirilim
    merged["month"] = merged["timestamp"].dt.month
    aylik_isabet = {}
    for month in range(1, 13):
        month_data = merged[(merged["month"] == month) & (merged["rain_probability"] > 40)]
        if len(month_data) >= 3:
            aylik_isabet[month] = float(round(month_data["is_raining"].mean() * 100, 1))

    return {
        "genel_isabet": float(genel_isabet),
        "aylik_isabet": {int(k): float(v) for k, v in aylik_isabet.items()},
        "toplam_tahmin_yagmur": int(len(tahmin_yagmur)),
        "gercekte_yagan": int(tahmin_yagmur["is_raining"].sum()),
        "guvenilir_mi": bool(genel_isabet >= 60),
        "esik": 60,
    }


# ============================================================
# 4. MODEL EGITIMI
# ============================================================

def get_feature_columns(df: pd.DataFrame) -> list:
    return [c for c in df.columns if c != "is_raining"]


def train_model(db: Session, field_id: int) -> Dict[str, Any]:
    """
    Tarla icin Random Forest egitir.
    Ogrenir: "Hava tahmini yagmur dediginde bu tarlada gercekten yagiyor mu?"
    """
    df, info = build_training_dataframe(db, field_id)

    feature_cols = get_feature_columns(df)
    X = df[feature_cols]
    y = df["is_raining"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100, max_depth=12, min_samples_split=5,
        min_samples_leaf=2, random_state=42, n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    report = classification_report(y_test, y_pred, output_dict=True)

    importances = dict(zip(feature_cols, model.feature_importances_.tolist()))
    sorted_imp = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

    # Tahmin guvenilirligi
    tahmin_guvenilirligi = _hesapla_tahmin_guvenilirligi(db, field_id)

    model_path = ML_MODELS_DIR / f"field_{field_id}.pkl"
    joblib.dump({
        "model": model,
        "feature_cols": feature_cols,
        "field_id": field_id,
        "trained_at": datetime.datetime.now().isoformat(),
        "accuracy": accuracy,
        "f1_score": f1,
        "sample_count": len(df),
        "tahmin_guvenilirligi": tahmin_guvenilirligi,
    }, model_path)

    _update_meta(field_id, {
        "accuracy": round(accuracy, 4),
        "f1_score": round(f1, 4),
        "sample_count": len(df),
        "trained_at": datetime.datetime.now().isoformat(),
        "feature_count": len(feature_cols),
        "rain_ratio": round(float(y.mean()), 4),
        "tahmin_guvenilirligi": tahmin_guvenilirligi,
    })

    result = {
        "field_id": field_id,
        "accuracy": round(accuracy, 4),
        "f1_score": round(f1, 4),
        "sample_count": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "feature_importances": {k: round(v, 4) for k, v in sorted_imp.items()},
        "tahmin_guvenilirligi": tahmin_guvenilirligi,
        "classification_report": report,
        "model_path": str(model_path),
        "info": info,
    }

    logger.info(f"Model egitildi: field_{field_id} | Acc: {accuracy:.4f} | Guvenilirlik: {tahmin_guvenilirligi}")
    return result


def train_all_models(db: Session) -> List[Dict[str, Any]]:
    fields = db.query(models.Field).all()
    results = []
    for field in fields:
        try:
            results.append(train_model(db, field.id))
        except Exception as e:
            logger.error(f"Tarla {field.id} egitim hatasi: {e}")
            results.append({"field_id": field.id, "error": str(e)})
    return results


# ============================================================
# 5. TAHMIN - HAVA TAHMINI DOGRULAMA
# ============================================================

def predict_rain(field_id: int, current_data: Dict[str, float]) -> Dict[str, Any]:
    """
    ML modeli ile hava tahmini dogrulama.

    Hava durumu servisi yagmur diyor -> bu fonksiyon dogrular:
    "Gecmise bakarak, bu tarlada bu kosullarda gercekten yagmur yagar mi?"

    Dondurur:
      - sulama_karari: GUVEN_BEKLE / GUVENME_SULA / NORMAL_SULAMA / DIKKAT_SURPRIZ
    """
    model_path = ML_MODELS_DIR / f"field_{field_id}.pkl"
    if not model_path.exists():
        raise FileNotFoundError(f"Tarla {field_id} icin model bulunamadi. Once /prediction/train/{field_id} cagirin.")

    data = joblib.load(model_path)
    model = data["model"]
    feature_cols = data["feature_cols"]
    trained_at = data["trained_at"]
    model_accuracy = data["accuracy"]
    tahmin_guvenilirligi = data.get("tahmin_guvenilirligi", {})

    now = datetime.datetime.now()
    api_rain_prob = current_data.get("rain_probability", 30.0)

    features = {
        "moisture": current_data.get("moisture", 40.0),
        "temperature": current_data.get("temperature", 10.0),
        "hour": now.hour,
        "month": now.month,
        "day_of_year": now.timetuple().tm_yday,
        "day_of_week": now.weekday(),
        "hour_sin": np.sin(2 * np.pi * now.hour / 24),
        "hour_cos": np.cos(2 * np.pi * now.hour / 24),
        "month_sin": np.sin(2 * np.pi * now.month / 12),
        "month_cos": np.cos(2 * np.pi * now.month / 12),
        "rain_probability": api_rain_prob,
        "expected_rain_amount": current_data.get("expected_rain_amount", 0.0),
        "tahmin_yagmur_diyor": 1 if api_rain_prob > 40 else 0,
        "son_tahmin_isabeti": tahmin_guvenilirligi.get("genel_isabet", 50.0) / 100.0,
    }

    input_df = pd.DataFrame([{col: features.get(col, 0.0) for col in feature_cols}])

    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    classes = model.classes_.tolist()
    rain_idx = classes.index(1) if 1 in classes else -1
    ml_rain_prob = round(float(probabilities[rain_idx]) * 100, 1) if rain_idx >= 0 else 0.0

    # === KARAR MEKANIZMASI ===
    genel_isabet = tahmin_guvenilirligi.get("genel_isabet", 50.0)
    aylik = tahmin_guvenilirligi.get("aylik_isabet", {})
    bu_ay_isabet = aylik.get(now.month, aylik.get(str(now.month), genel_isabet))

    if api_rain_prob > 40:  # Hava tahmini yagmur diyor
        if ml_rain_prob >= 60 and bu_ay_isabet >= 55:
            sulama_karari = "GUVEN_BEKLE"
            karar_aciklama = (
                f"Hava tahmini yagmur diyor (%{api_rain_prob:.0f}) ve ML modeli "
                f"de bu tarlada yagmur olasiligin %{ml_rain_prob} olarak hesapliyor. "
                f"Bu ayda tahmin isabeti: %{bu_ay_isabet:.0f}. "
                f"Tahmine GUVEN, sulamayi ERTELE."
            )
        else:
            sulama_karari = "GUVENME_SULA"
            karar_aciklama = (
                f"Hava tahmini yagmur diyor (%{api_rain_prob:.0f}) AMA ML modeli "
                f"bu tarlada gercek yagmur olasiligin sadece %{ml_rain_prob} olarak goruyor. "
                f"Bu ayda tahmin isabeti: %{bu_ay_isabet:.0f}. "
                f"Gecmiste bu tarlaya yagmur gelmemis, tahmine GUVENME, savunmaci sulama yap."
            )
    else:  # Hava tahmini yagmur demiyor
        if ml_rain_prob >= 50:
            sulama_karari = "DIKKAT_SURPRIZ"
            karar_aciklama = (
                f"Hava tahmini yagmur demiyor (%{api_rain_prob:.0f}) ama ML modeli "
                f"bu tarlada %{ml_rain_prob} yagmur olasiligi goruyor. "
                f"Gecmiste bu kosullarda surpriz yagmur yagmis olabilir."
            )
        else:
            sulama_karari = "NORMAL_SULAMA"
            karar_aciklama = (
                f"Ne hava tahmini ne ML yagmur beklemiyor. "
                f"Normal sulama programina devam."
            )

    return {
        "field_id": field_id,
        "hava_tahmini_yagmur_olasiligi": round(api_rain_prob, 1),
        "ml_gercek_yagmur_olasiligi": ml_rain_prob,
        "bu_ay_tahmin_isabeti": round(float(bu_ay_isabet), 1),
        "genel_tahmin_isabeti": round(genel_isabet, 1),
        "hava_tahmini_guvenilir_mi": tahmin_guvenilirligi.get("guvenilir_mi", False),
        "sulama_karari": sulama_karari,
        "karar_aciklama": karar_aciklama,
        "model_dogrulugu": round(model_accuracy * 100, 1),
        "son_egitim": trained_at,
    }


def predict_rain_from_db(db: Session, field_id: int) -> Dict[str, Any]:
    """DB'den son verileri cekip tahmin dogrulama yapar."""
    last_sensor = db.query(models.SensorLog).filter(
        models.SensorLog.field_id == field_id
    ).order_by(models.SensorLog.timestamp.desc()).first()

    if not last_sensor:
        raise ValueError(f"Tarla {field_id} icin sensor verisi bulunamadi.")

    now = datetime.datetime.now()
    last_forecast = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.field_id == field_id,
        models.WeatherForecast.forecast_date <= now
    ).order_by(models.WeatherForecast.forecast_date.desc()).first()

    current_data = {
        "moisture": last_sensor.moisture,
        "temperature": last_sensor.temperature,
    }
    if last_forecast:
        current_data["rain_probability"] = last_forecast.rain_probability
        current_data["expected_rain_amount"] = last_forecast.expected_rain_amount

    return predict_rain(field_id, current_data)


# ============================================================
# 6. MODEL DURUM VE META BILGILERI
# ============================================================

def _load_meta() -> dict:
    if META_FILE.exists():
        with open(META_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def _update_meta(field_id: int, info: dict):
    meta = _load_meta()
    meta[str(field_id)] = info
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

def get_model_status(field_id: int) -> Dict[str, Any]:
    model_path = ML_MODELS_DIR / f"field_{field_id}.pkl"
    meta = _load_meta()
    field_meta = meta.get(str(field_id))

    if not model_path.exists() or not field_meta:
        return {"field_id": field_id, "egitilmis": False, "mesaj": "Model henuz egitilmedi."}

    guv = field_meta.get("tahmin_guvenilirligi", {})
    return {
        "field_id": field_id,
        "egitilmis": True,
        "dogruluk": field_meta.get("accuracy"),
        "f1_skor": field_meta.get("f1_score"),
        "ornek_sayisi": field_meta.get("sample_count"),
        "feature_sayisi": field_meta.get("feature_count"),
        "yagmur_orani": field_meta.get("rain_ratio"),
        "son_egitim": field_meta.get("trained_at"),
        "tahmin_guvenilirligi": guv,
        "model_boyutu_kb": round(model_path.stat().st_size / 1024, 1),
    }

def get_all_models_status() -> List[Dict[str, Any]]:
    meta = _load_meta()
    results = []
    for fid, info in meta.items():
        model_path = ML_MODELS_DIR / f"field_{fid}.pkl"
        guv = info.get("tahmin_guvenilirligi", {})
        results.append({
            "field_id": int(fid),
            "egitilmis": model_path.exists(),
            "dogruluk": info.get("accuracy"),
            "f1_skor": info.get("f1_score"),
            "genel_isabet": guv.get("genel_isabet"),
            "guvenilir_mi": guv.get("guvenilir_mi"),
            "son_egitim": info.get("trained_at"),
        })
    return results
