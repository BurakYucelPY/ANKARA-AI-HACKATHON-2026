from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- ORTAK TABAN MODELLER ---

# 1. KULLANICI ŞEMALARI
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str  # Kayıt olurken şifre istenir

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    id: int
    # Şifreyi geri döndürmüyoruz, güvenlik açığı olur!
    
    class Config:
        from_attributes = True

# 2. BITKI TURU ŞEMALARI
class PlantTypeBase(BaseModel):
    name: str
    min_moisture: float
    max_moisture: float

class PlantTypeCreate(PlantTypeBase):
    pass

class PlantType(PlantTypeBase):
    id: int
    
    class Config:
        from_attributes = True

# 3. SENSOR LOG ŞEMALARI (Veri Girişi)
class SensorLogBase(BaseModel):
    moisture: float
    temperature: float
    is_raining: bool = False

class SensorLogCreate(SensorLogBase):
    field_id: int  # Hangi tarladan geldiği

class SensorLog(SensorLogBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# 4. TARLA ŞEMALARI
class FieldBase(BaseModel):
    name: str
    location: str
    pump_flow_rate: float = 100.0
    water_unit_price: float = 1.5

class FieldCreate(FieldBase):
    plant_type_id: int # Hangi bitki ekili?

class Field(FieldBase):
    id: int
    owner_id: int
    plant_type: Optional[PlantType] = None # Bitki detayını da göster
    sensor_logs: List[SensorLog] = [] # Son sensör verilerini de göster
    
    class Config:
        from_attributes = True

# 5. SULAMA KAYIT ŞEMALARI
class IrrigationLogBase(BaseModel):
    duration_minutes: float
    water_amount_liters: float
    cost_total: float

class IrrigationLogCreate(IrrigationLogBase):
    field_id: int

class IrrigationLog(IrrigationLogBase):
    id: int
    start_time: datetime
    
    class Config:
        from_attributes = True