"""
Chatbot / Tarım Danışmanı API
===============================
Groq LLM entegrasyonu ile çiftçiye doğal dilde soru sorma imkânı.
Mevcut sistem verilerini (sensör, hava durumu, bitki, ML tahmin) context olarak kullanır.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import datetime
import requests
import json

from database import SessionLocal
import models

router = APIRouter(prefix="/chatbot", tags=["Chatbot - Tarım Danışmanı"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Request / Response Modelleri ───────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" veya "assistant"
    content: str


class ChatRequest(BaseModel):
    user_id: int
    field_id: int
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str


class FieldSummary(BaseModel):
    id: int
    name: str
    location: str
    plant_type_name: Optional[str] = None
    plant_icon: Optional[str] = None


# ─── Yardımcı: Anlık Hava Durumu ───────────────────────────
def _get_current_weather(ilce: str) -> dict:
    """Open-Meteo'dan anlık hava durumu çeker."""
    try:
        resp = requests.get(
            f"http://127.0.0.1:8000/weather/current?ilce={ilce}",
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def _get_hourly_forecast(ilce: str) -> dict:
    """Saatlik hava tahmini çeker."""
    try:
        resp = requests.get(
            f"http://127.0.0.1:8000/weather/hourly-forecast?ilce={ilce}&saat=24",
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


# ─── Yardımcı: ML Tahmin ───────────────────────────────────
def _get_ml_prediction(field_id: int) -> dict:
    """ML yağmur tahmin sonucunu çeker."""
    try:
        resp = requests.get(
            f"http://127.0.0.1:8000/prediction/rain/{field_id}",
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


# ─── Yardımcı: Sulama Kararı ───────────────────────────────
def _get_irrigation_decision(field_id: int) -> dict:
    """Akıllı sulama karar sonucunu çeker."""
    try:
        resp = requests.get(
            f"http://127.0.0.1:8000/simulation/check-irrigation/{field_id}",
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


# ─── Tarla Bağlamı (Context) Oluştur ───────────────────────
def _build_field_context(db: Session, field_id: int) -> str:
    """Tarla için tüm mevcut verileri toplayıp metin contexti oluşturur."""

    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        return "Tarla bulunamadı."

    parts = []

    # 1. TARLA BİLGİLERİ
    parts.append("=== TARLA BİLGİLERİ ===")
    parts.append(f"Tarla Adı: {field.name}")
    parts.append(f"Konum: {field.location}")
    parts.append(f"İlçe: {field.ilce}")
    if field.latitude and field.longitude:
        parts.append(f"Koordinat: {field.latitude}, {field.longitude}")
    parts.append(f"Pompa Debi: {field.pump_flow_rate} L/dk")
    parts.append(f"Su Birim Fiyatı: {field.water_unit_price} TL/L")

    # 2. BİTKİ BİLGİLERİ
    bitki = field.plant_type
    if bitki:
        parts.append("\n=== BİTKİ BİLGİLERİ ===")
        parts.append(f"Bitki: {bitki.icon} {bitki.name}")
        parts.append(f"Kategori: {bitki.category}")
        parts.append(f"Minimum Nem: %{bitki.min_moisture}")
        parts.append(f"Maksimum Nem: %{bitki.max_moisture}")
        parts.append(f"Kritik Nem (ACİL): %{bitki.critical_moisture}")
        parts.append(f"Yağmur için Max Bekleme: {bitki.max_wait_hours} saat")
        parts.append(f"Su İhtiyacı: {bitki.water_need}")
        if bitki.water_amount:
            parts.append(f"Su Miktarı: {bitki.water_amount}")
        if bitki.soil_type:
            parts.append(f"Uygun Toprak: {bitki.soil_type}")
        if bitki.ideal_temp:
            parts.append(f"İdeal Sıcaklık: {bitki.ideal_temp}")
        if bitki.planting_time:
            parts.append(f"Ekim Zamanı: {bitki.planting_time}")
        if bitki.harvest_time:
            parts.append(f"Hasat Zamanı: {bitki.harvest_time}")
        if bitki.tips:
            try:
                tips_list = json.loads(bitki.tips)
                parts.append(f"Uzman Tüyoları: {', '.join(tips_list)}")
            except Exception:
                parts.append(f"Uzman Tüyoları: {bitki.tips}")

    # 3. SON SENSÖR VERİLERİ (son 10 kayıt)
    sensor_logs = (
        db.query(models.SensorLog)
        .filter(models.SensorLog.field_id == field_id)
        .order_by(models.SensorLog.timestamp.desc())
        .limit(10)
        .all()
    )
    if sensor_logs:
        parts.append("\n=== SON SENSÖR VERİLERİ (en yeniden eskiye) ===")
        for log in sensor_logs:
            ts = log.timestamp.strftime("%d.%m.%Y %H:%M") if log.timestamp else "?"
            rain_str = "Yağmur VAR" if log.is_raining else "Yağmur YOK"
            parts.append(
                f"  {ts} → Nem: %{log.moisture}, Sıcaklık: {log.temperature}°C, {rain_str}"
            )
        # En son değerler
        son = sensor_logs[0]
        parts.append(f"\n📊 ANLIK: Nem %{son.moisture}, Sıcaklık {son.temperature}°C")

    # 4. SENSÖR CİHAZLARI
    sensors = db.query(models.Sensor).filter(models.Sensor.field_id == field_id).all()
    if sensors:
        parts.append("\n=== SENSÖR CİHAZLARI ===")
        for s in sensors:
            parts.append(
                f"  {s.name} ({s.sensor_code}) - Tip: {s.type}, Durum: {s.status}, Batarya: %{s.battery}"
            )

    # 5. SULAMA GEÇMİŞİ (son 5 kayıt)
    irrigation_logs = (
        db.query(models.IrrigationLog)
        .filter(models.IrrigationLog.field_id == field_id)
        .order_by(models.IrrigationLog.start_time.desc())
        .limit(5)
        .all()
    )
    if irrigation_logs:
        parts.append("\n=== SON SULAMA GEÇMİŞİ ===")
        for ilog in irrigation_logs:
            ts = ilog.start_time.strftime("%d.%m.%Y %H:%M") if ilog.start_time else "?"
            parts.append(
                f"  {ts} → Süre: {ilog.duration_minutes} dk, Su: {ilog.water_amount_liters} L, Maliyet: {ilog.cost_total} TL"
            )

    # 6. HAVA TAHMİNLERİ (DB'deki)
    forecasts = (
        db.query(models.WeatherForecast)
        .filter(models.WeatherForecast.field_id == field_id)
        .order_by(models.WeatherForecast.forecast_date.asc())
        .limit(5)
        .all()
    )
    if forecasts:
        parts.append("\n=== DB HAVA TAHMİNLERİ (5 günlük) ===")
        for f in forecasts:
            fd = f.forecast_date.strftime("%d.%m.%Y") if f.forecast_date else "?"
            parts.append(
                f"  {fd} → Yağış Olasılığı: %{f.rain_probability}, Beklenen Yağış: {f.expected_rain_amount} mm"
            )

    # 7. ANLIK HAVA DURUMU (Open-Meteo API)
    ilce = field.ilce or "cankaya"
    current_weather = _get_current_weather(ilce)
    if current_weather and "hata" not in current_weather:
        parts.append("\n=== ANLIK HAVA DURUMU (Open-Meteo) ===")
        parts.append(f"Konum: {current_weather.get('konum', ilce)}")
        parts.append(f"Sıcaklık: {current_weather.get('sicaklik')}°C")
        parts.append(f"Hissedilen: {current_weather.get('hissedilen')}°C")
        parts.append(f"Nem: %{current_weather.get('nem')}")
        parts.append(f"Rüzgar: {current_weather.get('ruzgar_hizi')} km/s {current_weather.get('ruzgar_yonu_text', '')}")
        parts.append(f"Durum: {current_weather.get('emoji', '')} {current_weather.get('durum', '')}")
        parts.append(f"Yağış Var mı: {'Evet' if current_weather.get('yagis_var_mi') else 'Hayır'}")

    # 8. SAATLİK TAHMİN (Open-Meteo)
    hourly = _get_hourly_forecast(ilce)
    if hourly and "hata" not in hourly:
        parts.append("\n=== ÖNÜMÜZDEKİ 24 SAAT TAHMİNİ ===")
        parts.append(f"1 saat içinde yağış: {'Evet' if hourly.get('onumuzdeki_1_saat_yagis') else 'Hayır'}")
        parts.append(f"3 saat içinde yağış: {'Evet' if hourly.get('onumuzdeki_3_saat_yagis') else 'Hayır'}")
        parts.append(f"6 saat içinde yağış: {'Evet' if hourly.get('onumuzdeki_6_saat_yagis') else 'Hayır'}")
        ilk_yagis = hourly.get("ilk_yagis")
        if ilk_yagis:
            parts.append(f"İlk Yağış: {ilk_yagis.get('kac_saat_sonra', '?')} saat sonra ({ilk_yagis.get('saat', '')})")

    # 9. ML TAHMİN SONUCU
    ml_result = _get_ml_prediction(field_id)
    if ml_result and "hata" not in str(ml_result):
        parts.append("\n=== ML YAĞMUR TAHMİN DOĞRULAMA ===")
        parts.append(f"Sulama Kararı: {ml_result.get('sulama_karari', 'Bilinmiyor')}")
        parts.append(f"Karar Açıklaması: {ml_result.get('karar_aciklama', '')}")
        parts.append(f"Tahmin: {'Yağmur gelecek' if ml_result.get('tahmin') == 1 else 'Yağmur gelmeyecek'}")
        parts.append(f"Güven: %{round(ml_result.get('guven', 0) * 100, 1)}")

    # 10. AKILLI SULAMA KARARI
    irrigation_decision = _get_irrigation_decision(field_id)
    if irrigation_decision and "hata" not in str(irrigation_decision):
        parts.append("\n=== AKILLI SULAMA KARAR SİSTEMİ ===")
        parts.append(f"Durum: {irrigation_decision.get('durum', '')}")
        parts.append(f"Aksiyon: {irrigation_decision.get('aksiyon', '')}")
        parts.append(f"Aciliyet: {irrigation_decision.get('aciliyet', '')}")
        parts.append(f"Detay: {irrigation_decision.get('detay', '')}")
        parts.append(f"Pompa: {irrigation_decision.get('pompa', '')}")

    # 11. BİLDİRİMLER (owner'ın son 5 bildirimi)
    if field.owner_id:
        notifications = (
            db.query(models.Notification)
            .filter(models.Notification.user_id == field.owner_id)
            .order_by(models.Notification.created_at.desc())
            .limit(5)
            .all()
        )
        if notifications:
            parts.append("\n=== SON BİLDİRİMLER ===")
            for n in notifications:
                ts = n.created_at.strftime("%d.%m.%Y %H:%M") if n.created_at else "?"
                read_str = "✓ Okundu" if n.is_read else "● Okunmadı"
                parts.append(f"  [{read_str}] {ts}: {n.message}")

    parts.append(f"\n📅 Şu anki tarih ve saat: {datetime.datetime.now().strftime('%d.%m.%Y %H:%M')}")

    return "\n".join(parts)


# ─── SYSTEM PROMPT ──────────────────────────────────────────
SYSTEM_PROMPT = """Sen "AquaSmart" akıllı tarım ve sulama sisteminin yapay zeka tarım danışmanısın.

GÖREV:
- Çiftçilere tarlalarıyla ilgili kişiselleştirilmiş, veri odaklı tavsiyeler ver.
- Sensör verileri, hava durumu, ML tahminleri ve sulama geçmişi bilgilerini kullanarak cevap ver.
- Türkçe cevap ver, samimi ama profesyonel ol.
- Cevaplarında emoji kullan ama abartma.

KURALLAR:
1. SADECE tarımla, sulamayla, bitkilerle, hava durumuyla ve tarla yönetimiyle ilgili sorulara cevap ver.
2. Tarımla ilgisi olmayan sorularda nazikçe "Ben tarım danışmanıyım, sadece tarımla ilgili konularda yardımcı olabilirim" de.
3. Verilen context bilgilerini kullanarak SOMUT ve KİŞİSELLEŞTİRİLMİŞ cevaplar ver.
4. Genel tavsiye yerine, eldeki verilere dayanarak spesifik öneriler sun.
5. Eğer bir veri mevcut değilse, bunu belirt ve genel bilgi ver.
6. Cevapları kısa ve öz tut. Uzun paragraflar yerine maddeler halinde yaz.
7. Sulama kararlarında her zaman ML tahmin sonuçlarını ve hava durumunu göz önünde bulundur.
8. Su tasarrufu ve maliyet optimizasyonunu ön planda tut.

CONTEXT BİLGİSİ (Bu tarla için güncel veriler):
{context}
"""


# ─── Endpoint: Tarla Listesi ───────────────────────────────
@router.get("/fields/{user_id}", response_model=List[FieldSummary])
def get_user_fields_for_chat(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının tarlalarını chatbot için basit liste olarak döndürür."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    fields = db.query(models.Field).filter(models.Field.owner_id == user_id).all()

    result = []
    for f in fields:
        plant_name = f.plant_type.name if f.plant_type else None
        plant_icon = f.plant_type.icon if f.plant_type else None
        result.append(
            FieldSummary(
                id=f.id,
                name=f.name,
                location=f.location,
                plant_type_name=plant_name,
                plant_icon=plant_icon,
            )
        )
    return result


# ─── Endpoint: Mesaj Gönder ────────────────────────────────
@router.post("/message", response_model=ChatResponse)
def send_message(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Chatbot mesaj endpoint'i.
    Tarla verilerini toplayıp Groq LLM'e context olarak gönderir.
    """
    # API key kontrolü
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY tanımlı değil!")

    # Kullanıcı ve tarla kontrolü
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    field = db.query(models.Field).filter(
        models.Field.id == req.field_id,
        models.Field.owner_id == req.user_id,
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Tarla bulunamadı veya bu kullanıcıya ait değil")

    # Tarla context'ini oluştur
    context = _build_field_context(db, req.field_id)

    # System prompt'u context ile birleştir
    system_message = SYSTEM_PROMPT.replace("{context}", context)

    # Mesaj geçmişini hazırla
    messages = [{"role": "system", "content": system_message}]

    # Önceki konuşma geçmişi (varsa)
    if req.history:
        for msg in req.history:
            messages.append({"role": msg.role, "content": msg.content})

    # Yeni mesajı ekle
    messages.append({"role": "user", "content": req.message})

    # Groq API'ye gönder
    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            top_p=0.9,
        )

        reply = completion.choices[0].message.content
        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM hatası: {str(e)}")
