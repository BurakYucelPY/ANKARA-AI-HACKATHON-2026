from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal
import datetime
import requests # İnternete çıkıp hava durumunu kontrol etmek için şart

router = APIRouter(prefix="/simulation", tags=["Simulation & Sensors"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. SENSÖR VERİSİ GÖNDER (Nemi veritabanına kaydeder)
@router.post("/sensor-log/", response_model=schemas.SensorLog)
def create_sensor_log(log: schemas.SensorLogCreate, db: Session = Depends(get_db)):
    field = db.query(models.Field).filter(models.Field.id == log.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Tarla bulunamadı!")

    db_log = models.SensorLog(**log.dict(), timestamp=datetime.datetime.now())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# 2. AKILLI KARAR MEKANİZMASI (Hava Durumu + Toprak Nemi)
@router.get("/check-irrigation/{field_id}")
def check_irrigation_status(field_id: int, db: Session = Depends(get_db)):
    # A. Veritabanından son toprak nemini bul
    last_log = db.query(models.SensorLog)\
        .filter(models.SensorLog.field_id == field_id)\
        .order_by(models.SensorLog.timestamp.desc())\
        .first()

    if not last_log:
        return {"mesaj": "Henüz sensör verisi gelmedi, karar verilemiyor."}

    # B. Tarla ve Bitki bilgilerini çek (Alt/Üst nem sınırları için)
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    
    # C. CANLI HAVA DURUMUNA SOR (Senin yazdığın weather endpoint'ini kullanıyoruz)
    try:
        # Kendi sunucuna istek atıp hava durumunu alıyorsun
        weather_res = requests.get("http://127.0.0.1:8000/weather/current")
        weather_data = weather_res.json()
        is_raining = weather_data.get("is_it_raining", False)
    except:
        is_raining = False # Hava durumu servisi patlarsa yağmur yokmuş gibi güvenli moda geç

    # D. KARAR MANTĞI (Asıl Zeka Burası)
    status = "İDEAL"
    recommendation = "Sulama gerekmiyor."

    # Toprak susuz mu kalmış?
    if last_log.moisture < field.plant_type.min_moisture:
        # KURU ama YAĞMUR VAR MI?
        if is_raining:
            status = "SULAMA İPTAL EDİLDİ"
            recommendation = f"Toprak kuru (%{last_log.moisture}) fakat hava yağışlı. Bedava su yolda, pompa açılmadı!"
        else:
            status = "SULAMA BAŞLATILDI"
            recommendation = f"Toprak kuru (%{last_log.moisture}) ve yağış yok. Pompa çalıştırılıyor."
            
    elif last_log.moisture > field.plant_type.max_moisture:
        status = "SULAMA DURDURULDU"
        recommendation = "Toprak yeterince ıslak, su israfını önlemek için pompa kapatıldı."

    return {
        "tarla_adi": field.name,
        "bitki": field.plant_type.name,
        "anlik_nem": last_log.moisture,
        "disarida_yagmur_var_mi": is_raining,
        "karar": status,
        "aciklama": recommendation
    }