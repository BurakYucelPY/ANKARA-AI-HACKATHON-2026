"""
Sensör Cihazları API
- Kullanıcının tarlalarındaki fiziksel sensörleri listeler
- Her sensörün son ölçüm değerini SensorLog'dan çeker
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import SessionLocal
import models
import schemas

router = APIRouter(prefix="/sensors", tags=["Sensörler"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/user/{user_id}")
def get_sensors_by_user(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının tüm tarlalarındaki sensörleri son ölçümle birlikte döndür"""
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Kullanıcının tarlalarını bul
    fields = db.query(models.Field).filter(models.Field.owner_id == user_id).all()
    field_ids = [f.id for f in fields]
    field_map = {f.id: f for f in fields}
    
    # Bu tarlalardaki sensörleri çek
    sensors = db.query(models.Sensor).filter(models.Sensor.field_id.in_(field_ids)).all()
    
    result = []
    for sensor in sensors:
        field = field_map[sensor.field_id]
        
        # Son sensor log kaydını al
        last_log = db.query(models.SensorLog).filter(
            models.SensorLog.field_id == sensor.field_id
        ).order_by(desc(models.SensorLog.timestamp)).first()
        
        # Sensör tipine göre değeri belirle
        value = None
        unit = ""
        if last_log:
            if sensor.type == "moisture":
                value = last_log.moisture
                unit = "%"
            elif sensor.type == "temperature":
                value = last_log.temperature
                unit = "°C"
        
        result.append({
            "id": sensor.id,
            "sensor_code": sensor.sensor_code,
            "name": sensor.name,
            "type": sensor.type,
            "type_label": "Nem Sensörü" if sensor.type == "moisture" else "Sıcaklık Sensörü",
            "status": sensor.status,
            "battery": sensor.battery,
            "field_id": sensor.field_id,
            "field_name": field.name,
            "location": field.location,
            "value": round(value, 1) if value is not None else None,
            "unit": unit,
            "last_data": last_log.timestamp.isoformat() if last_log else None,
            "installed_at": sensor.installed_at.isoformat() if sensor.installed_at else None,
        })
    
    return result


@router.get("/field/{field_id}")
def get_sensors_by_field(field_id: int, db: Session = Depends(get_db)):
    """Belirli bir tarladaki sensörleri döndür"""
    
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Tarla bulunamadı")
    
    sensors = db.query(models.Sensor).filter(models.Sensor.field_id == field_id).all()
    
    result = []
    for sensor in sensors:
        last_log = db.query(models.SensorLog).filter(
            models.SensorLog.field_id == field_id
        ).order_by(desc(models.SensorLog.timestamp)).first()
        
        value = None
        unit = ""
        if last_log:
            if sensor.type == "moisture":
                value = last_log.moisture
                unit = "%"
            elif sensor.type == "temperature":
                value = last_log.temperature
                unit = "°C"
        
        result.append({
            "id": sensor.id,
            "sensor_code": sensor.sensor_code,
            "name": sensor.name,
            "type": sensor.type,
            "type_label": "Nem Sensörü" if sensor.type == "moisture" else "Sıcaklık Sensörü",
            "status": sensor.status,
            "battery": sensor.battery,
            "field_name": field.name,
            "location": field.location,
            "value": round(value, 1) if value is not None else None,
            "unit": unit,
            "last_data": last_log.timestamp.isoformat() if last_log else None,
        })
    
    return result


@router.get("/summary/{user_id}")
def get_sensor_summary(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının sensör özetini döndür (toplam, aktif, uyarı, pasif, bakımda)"""
    
    fields = db.query(models.Field).filter(models.Field.owner_id == user_id).all()
    field_ids = [f.id for f in fields]
    
    sensors = db.query(models.Sensor).filter(models.Sensor.field_id.in_(field_ids)).all()
    
    total = len(sensors)
    active = sum(1 for s in sensors if s.status == "active")
    warning = sum(1 for s in sensors if s.status == "warning")
    inactive = sum(1 for s in sensors if s.status == "inactive")
    maintenance = sum(1 for s in sensors if s.status == "maintenance")
    
    return {
        "total": total,
        "active": active,
        "warning": warning,
        "inactive": inactive,
        "maintenance": maintenance,
    }
