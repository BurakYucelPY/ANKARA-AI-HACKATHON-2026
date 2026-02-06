"""
Hava Tahmini Doğrulama API Endpoint'leri
=========================================
Tarlaya özel Random Forest modelleri ile hava tahminini doğrulama.
ML modeli, hava tahmini yağmur dediğinde bu tarlaya gerçekten
yağmur gelip gelmeyeceğini geçmiş verilere bakarak doğrular.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

import models
from database import SessionLocal
from ml.predictor import (
    train_model,
    train_all_models,
    predict_rain,
    predict_rain_from_db,
    get_model_status,
    get_all_models_status,
    auto_detect_columns,
)

router = APIRouter(prefix="/prediction", tags=["ML Prediction"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Request Modelleri ---
class PredictionInput(BaseModel):
    moisture: float
    temperature: float
    rain_probability: Optional[float] = 30.0
    expected_rain_amount: Optional[float] = 0.0


# ============================================================
# 1. MODEL EĞİTİMİ
# ============================================================

@router.post("/train/{field_id}")
def train_field_model(field_id: int, db: Session = Depends(get_db)):
    """Belirli bir tarlanın yağmur tahmin modelini eğitir."""
    # Tarla var mı kontrol et
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Tarla {field_id} bulunamadı")
    
    try:
        result = train_model(db, field_id)
        return {
            "mesaj": f"✅ {field.name} tarlası için model başarıyla eğitildi!",
            **result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model eğitim hatası: {str(e)}")


@router.post("/train-all")
def train_all_field_models(db: Session = Depends(get_db)):
    """Tüm tarlaların modellerini toplu olarak eğitir."""
    results = train_all_models(db)
    
    basarili = sum(1 for r in results if "error" not in r)
    hatali = sum(1 for r in results if "error" in r)
    
    return {
        "mesaj": f"✅ {basarili} model eğitildi, {hatali} hata oluştu.",
        "sonuclar": results,
    }


# ============================================================
# 2. TAHMİN
# ============================================================

@router.post("/rain/{field_id}")
def predict_field_rain(field_id: int, data: PredictionInput, db: Session = Depends(get_db)):
    """
    Manuel sensör verisiyle yağmur tahmini yapar.
    Girdiler: moisture, temperature, rain_probability (opsiyonel), expected_rain_amount (opsiyonel)
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Tarla {field_id} bulunamadı")
    
    try:
        result = predict_rain(field_id, data.dict())
        result["tarla_adi"] = field.name
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tahmin hatası: {str(e)}")


@router.get("/rain/{field_id}")
def predict_field_rain_auto(field_id: int, db: Session = Depends(get_db)):
    """
    Son sensör verisini kullanarak otomatik yağmur tahmini yapar.
    Saatlik cron job bu endpoint'i çağırır.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Tarla {field_id} bulunamadı")
    
    try:
        result = predict_rain_from_db(db, field_id)
        result["tarla_adi"] = field.name
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tahmin hatası: {str(e)}")


@router.get("/rain-all")
def predict_all_fields_rain(db: Session = Depends(get_db)):
    """Tüm tarlalar için yağmur tahmini yapar."""
    fields = db.query(models.Field).all()
    results = []
    
    for field in fields:
        try:
            result = predict_rain_from_db(db, field.id)
            result["tarla_adi"] = field.name
            results.append(result)
        except Exception as e:
            results.append({
                "field_id": field.id,
                "tarla_adi": field.name,
                "hata": str(e),
            })
    
    return {
        "tarla_sayisi": len(fields),
        "tahminler": results,
    }


# ============================================================
# 3. MODEL DURUMU
# ============================================================

@router.get("/status/{field_id}")
def get_field_model_status(field_id: int, db: Session = Depends(get_db)):
    """Belirli bir tarlanın model durumunu döndürür."""
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Tarla {field_id} bulunamadı")
    
    status = get_model_status(field_id)
    status["tarla_adi"] = field.name
    return status


@router.get("/status")
def get_all_model_statuses():
    """Tüm modellerin durumunu döndürür."""
    return {
        "modeller": get_all_models_status(),
    }


# ============================================================
# 4. YARDIMCI
# ============================================================

@router.get("/columns")
def detected_columns():
    """Veritabanı şemasından tespit edilen ML sütunlarını gösterir."""
    return auto_detect_columns()
