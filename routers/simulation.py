from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal
import datetime

router = APIRouter(prefix="/simulation", tags=["Simulation & Sensors"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. SENSÖR VERİSİ GÖNDER
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

# 2. SULAMA KARARI SOR
@router.get("/check-irrigation/{field_id}")
def check_irrigation_status(field_id: int, db: Session = Depends(get_db)):
    last_log = db.query(models.SensorLog)\
        .filter(models.SensorLog.field_id == field_id)\
        .order_by(models.SensorLog.timestamp.desc())\
        .first()

    if not last_log:
        return {"durum": "Veri Yok", "karar": "Bekle"}

    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    
    if last_log.moisture < field.plant_type.min_moisture:
        karar = "SULAMA BAŞLAT"
        sebep = f"Nem %{last_log.moisture} (Alt Sınır: %{field.plant_type.min_moisture})"
    elif last_log.moisture > field.plant_type.max_moisture:
        karar = "SULAMAYI DURDUR"
        sebep = f"Nem %{last_log.moisture} (Çok Islak)"
    else:
        karar = "İDEAL"
        sebep = "Nem seviyesi uygun."

    return {
        "field": field.name,
        "plant": field.plant_type.name,
        "last_moisture": last_log.moisture,
        "decision": karar,
        "reason": sebep
    }