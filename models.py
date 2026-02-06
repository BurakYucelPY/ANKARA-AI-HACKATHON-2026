from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

# 1. BITKI TURLERI
class PlantType(Base):
    __tablename__ = "plant_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    min_moisture = Column(Float)  # Alt nem sınırı (örn: %30)
    max_moisture = Column(Float)  # Üst nem sınırı (örn: %70)
    critical_moisture = Column(Float, default=10.0)  # KRİTİK sınır - acil sulama (örn: %10)
    max_wait_hours = Column(Integer, default=6)  # Yağmur için max bekleme süresi (saat)
    
    # Zengin bitki bilgileri
    icon = Column(String, default="🌱")
    category = Column(String, default="Genel")
    planting_time = Column(String, nullable=True)
    harvest_time = Column(String, nullable=True)
    water_need = Column(String, default="Orta")
    water_amount = Column(String, nullable=True)
    soil_type = Column(String, nullable=True)
    ideal_temp = Column(String, nullable=True)
    tips = Column(String, nullable=True)  # JSON array string
    
    fields = relationship("Field", back_populates="plant_type")

# 2. KULLANICILAR (CIFTCI)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)

    fields = relationship("Field", back_populates="owner")
    notifications = relationship("Notification", back_populates="user")

# 3. TARLALAR
class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) 
    location = Column(String)  # Genel adres/açıklama
    ilce = Column(String, default="cankaya")  # İlçe kodu (weather API için)
    latitude = Column(Float, nullable=True)  # Özel koordinat (opsiyonel)
    longitude = Column(Float, nullable=True)  # Özel koordinat (opsiyonel)
    
    # Maliyet verileri
    pump_flow_rate = Column(Float, default=100.0)
    water_unit_price = Column(Float, default=1.5)

    owner_id = Column(Integer, ForeignKey("users.id")) 
    plant_type_id = Column(Integer, ForeignKey("plant_types.id")) 

    owner = relationship("User", back_populates="fields")
    plant_type = relationship("PlantType", back_populates="fields")
    sensor_logs = relationship("SensorLog", back_populates="field")
    sensors = relationship("Sensor", back_populates="field")
    irrigation_logs = relationship("IrrigationLog", back_populates="field")
    weather_forecasts = relationship("WeatherForecast", back_populates="field")

# 4. SENSOR CIHAZLARI (Fiziksel sensörler)
class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_code = Column(String, unique=True, index=True)  # SNS-001
    name = Column(String)  # Nem Sensörü #1
    type = Column(String)  # moisture / temperature
    status = Column(String, default="active")  # active / inactive / warning / maintenance
    battery = Column(Integer, default=100)  # 0-100
    field_id = Column(Integer, ForeignKey("fields.id"))
    installed_at = Column(DateTime, default=datetime.datetime.now)

    field = relationship("Field", back_populates="sensors")

# 5. SENSOR KAYITLARI
class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    timestamp = Column(DateTime, default=datetime.datetime.now)
    moisture = Column(Float)
    temperature = Column(Float)
    is_raining = Column(Boolean, default=False)

    field = relationship("Field", back_populates="sensor_logs")

# 5. SULAMA GECMISI
class IrrigationLog(Base):
    __tablename__ = "irrigation_logs"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    start_time = Column(DateTime, default=datetime.datetime.now)
    duration_minutes = Column(Float)
    water_amount_liters = Column(Float)
    cost_total = Column(Float)
    
    field = relationship("Field", back_populates="irrigation_logs")

# 6. HAVA DURUMU TAHMINI
class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"))
    forecast_date = Column(DateTime)
    rain_probability = Column(Float)
    expected_rain_amount = Column(Float)

    field = relationship("Field", back_populates="weather_forecasts")

# 7. BILDIRIMLER
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.now)
    is_read = Column(Boolean, default=False)

    user = relationship("User", back_populates="notifications")