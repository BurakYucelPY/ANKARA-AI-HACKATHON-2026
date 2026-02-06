"""Veritabanını örnek verilerle doldurma scripti"""
import hashlib
import random
import datetime
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ============================================================
# 1. KULLANICILAR (3 çiftçi)
# ============================================================
def h(pw): return hashlib.sha256(pw.encode()).hexdigest()

users_data = [
    {"email": "ahmet@ciftci.com", "hashed_password": h("ahmet123"), "full_name": "Ahmet Yılmaz"},
    {"email": "fatma@ciftci.com", "hashed_password": h("fatma123"), "full_name": "Fatma Demir"},
    {"email": "mehmet@ciftci.com", "hashed_password": h("mehmet123"), "full_name": "Mehmet Kaya"},
]

created_users = []
for u in users_data:
    existing = db.query(models.User).filter(models.User.email == u["email"]).first()
    if existing:
        created_users.append(existing)
    else:
        user = models.User(**u)
        db.add(user)
        db.commit()
        db.refresh(user)
        created_users.append(user)

print(f"✅ {len(created_users)} kullanıcı hazır")

# ============================================================
# 2. TARLALAR (Her kullanıcıya 2-3 tarla)
# ============================================================
# Mevcut bitki türlerini al
plant_types = db.query(models.PlantType).all()
if not plant_types:
    print("❌ Bitki türleri bulunamadı! Önce /plant-types/seed çağırın.")
    exit()

pt_map = {p.name: p.id for p in plant_types}

fields_data = [
    # Ahmet'in tarlaları
    {"name": "Polatlı Buğday Tarlası", "location": "Polatlı, Ankara", "ilce": "polatli", "latitude": 39.5842, "longitude": 32.1469, "pump_flow_rate": 120.0, "water_unit_price": 1.2, "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Buğday", 1)},
    {"name": "Ayaş Domates Serası", "location": "Ayaş, Ankara", "ilce": "ayas", "latitude": 40.0167, "longitude": 32.3333, "pump_flow_rate": 80.0, "water_unit_price": 1.8, "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Domates", 1)},
    {"name": "Haymana Ayçiçeği Tarlası", "location": "Haymana, Ankara", "ilce": "haymana", "latitude": 39.4333, "longitude": 32.5000, "pump_flow_rate": 150.0, "water_unit_price": 1.0, "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Ayçiçeği", 1)},
    # Fatma'nın tarlaları
    {"name": "Çubuk Patates Tarlası", "location": "Çubuk, Ankara", "ilce": "cubuk", "latitude": 40.2333, "longitude": 33.0333, "pump_flow_rate": 100.0, "water_unit_price": 1.5, "owner_id": created_users[1].id, "plant_type_id": pt_map.get("Patates", 1)},
    {"name": "Beypazarı Biber Bahçesi", "location": "Beypazarı, Ankara", "ilce": "beypazari", "latitude": 40.1667, "longitude": 31.9167, "pump_flow_rate": 90.0, "water_unit_price": 1.6, "owner_id": created_users[1].id, "plant_type_id": pt_map.get("Kapya Biber", 1)},
    # Mehmet'in tarlaları
    {"name": "Kalecik Çilek Bahçesi", "location": "Kalecik, Ankara", "ilce": "kalecik", "latitude": 40.1000, "longitude": 33.4167, "pump_flow_rate": 70.0, "water_unit_price": 2.0, "owner_id": created_users[2].id, "plant_type_id": pt_map.get("Çilek", 1)},
    {"name": "Şereflikoçhisar Soğan Tarlası", "location": "Şereflikoçhisar, Ankara", "ilce": "sereflikochisar", "latitude": 38.9433, "longitude": 33.5383, "pump_flow_rate": 110.0, "water_unit_price": 1.3, "owner_id": created_users[2].id, "plant_type_id": pt_map.get("Soğan", 1)},
    {"name": "Nallıhan Mısır Tarlası", "location": "Nallıhan, Ankara", "ilce": "nallihan", "latitude": 40.1833, "longitude": 30.7333, "pump_flow_rate": 130.0, "water_unit_price": 1.4, "owner_id": created_users[2].id, "plant_type_id": pt_map.get("Mısır", 1)},
]

created_fields = []
for f in fields_data:
    existing = db.query(models.Field).filter(models.Field.name == f["name"]).first()
    if existing:
        created_fields.append(existing)
    else:
        field = models.Field(**f)
        db.add(field)
        db.commit()
        db.refresh(field)
        created_fields.append(field)

print(f"✅ {len(created_fields)} tarla hazır")

# ============================================================
# 2.5 SENSÖR CİHAZLARI (Her tarla için 2 sensör: nem + sıcaklık)
# ============================================================
now = datetime.datetime.now()
sensor_device_count = 0
created_sensors = []

for idx, field in enumerate(created_fields):
    existing = db.query(models.Sensor).filter(models.Sensor.field_id == field.id).count()
    if existing > 0:
        sensor_device_count += existing
        existing_sensors = db.query(models.Sensor).filter(models.Sensor.field_id == field.id).all()
        created_sensors.extend(existing_sensors)
        continue
    
    base_num = idx * 2 + 1  # SNS-001, SNS-002, ...
    
    # Nem sensörü
    nem_sensor = models.Sensor(
        sensor_code=f"SNS-{base_num:03d}",
        name=f"Nem Sensörü #{idx + 1}",
        type="moisture",
        status=random.choice(["active", "active", "active", "active", "warning"]),  # %80 aktif
        battery=random.randint(35, 100),
        field_id=field.id,
        installed_at=now - datetime.timedelta(days=random.randint(30, 365)),
    )
    db.add(nem_sensor)
    
    # Sıcaklık sensörü
    sicaklik_sensor = models.Sensor(
        sensor_code=f"SNS-{base_num + 1:03d}",
        name=f"Sıcaklık Sensörü #{idx + 1}",
        type="temperature",
        status=random.choice(["active", "active", "active", "maintenance"]),  # %75 aktif
        battery=random.randint(20, 100),
        field_id=field.id,
        installed_at=now - datetime.timedelta(days=random.randint(30, 365)),
    )
    db.add(sicaklik_sensor)
    
    sensor_device_count += 2

db.commit()
print(f"✅ {sensor_device_count} sensör cihazı hazır")

# ============================================================
# 3. SENSOR LOGLARI (Her tarla için son 7 gün, günde 4 ölçüm)
# ============================================================
now = datetime.datetime.now()
sensor_count = 0

for field in created_fields:
    # Bu tarla için zaten log var mı?
    existing_count = db.query(models.SensorLog).filter(models.SensorLog.field_id == field.id).count()
    if existing_count > 0:
        sensor_count += existing_count
        continue
    
    for day_offset in range(7, 0, -1):
        for hour in [6, 10, 14, 18]:
            ts = now - datetime.timedelta(days=day_offset, hours=random.randint(0, 1))
            ts = ts.replace(hour=hour, minute=random.randint(0, 59))
            
            # Gerçekçi nem değerleri (gün içinde azalır, sulama sonrası artar)
            base_moisture = random.uniform(25, 65)
            if hour >= 14:
                base_moisture -= random.uniform(5, 15)  # Öğleden sonra nem düşer
            
            temp = random.uniform(2, 12) if day_offset > 3 else random.uniform(5, 15)  # Kış havası
            is_raining = random.random() < 0.15  # %15 yağmur ihtimali
            
            if is_raining:
                base_moisture += random.uniform(10, 25)
            
            base_moisture = max(8, min(85, base_moisture))
            
            log = models.SensorLog(
                field_id=field.id,
                timestamp=ts,
                moisture=round(base_moisture, 1),
                temperature=round(temp, 1),
                is_raining=is_raining,
            )
            db.add(log)
            sensor_count += 1

db.commit()
print(f"✅ {sensor_count} sensör kaydı hazır")

# ============================================================
# 4. SULAMA LOGLARI (Her tarla için son 7 günde 2-4 sulama)
# ============================================================
irrigation_count = 0

for field in created_fields:
    existing_count = db.query(models.IrrigationLog).filter(models.IrrigationLog.field_id == field.id).count()
    if existing_count > 0:
        irrigation_count += existing_count
        continue
    
    num_irrigations = random.randint(2, 4)
    used_days = random.sample(range(1, 8), num_irrigations)
    
    for day_offset in sorted(used_days, reverse=True):
        start = now - datetime.timedelta(days=day_offset)
        start = start.replace(hour=random.choice([6, 7, 17, 18]), minute=random.randint(0, 30))
        
        duration = round(random.uniform(15, 60), 1)
        water = round(field.pump_flow_rate * (duration / 60), 1)
        cost = round(water * field.water_unit_price / 1000, 2)
        
        irr = models.IrrigationLog(
            field_id=field.id,
            start_time=start,
            duration_minutes=duration,
            water_amount_liters=water,
            cost_total=cost,
        )
        db.add(irr)
        irrigation_count += 1

db.commit()
print(f"✅ {irrigation_count} sulama kaydı hazır")

# ============================================================
# 5. HAVA DURUMU TAHMİNLERİ (Her tarla için 5 gün ileri)
# ============================================================
forecast_count = 0

for field in created_fields:
    existing_count = db.query(models.WeatherForecast).filter(models.WeatherForecast.field_id == field.id).count()
    if existing_count > 0:
        forecast_count += existing_count
        continue
    
    for day_offset in range(0, 5):
        forecast_date = now + datetime.timedelta(days=day_offset)
        forecast_date = forecast_date.replace(hour=12, minute=0, second=0)
        
        rain_prob = round(random.uniform(0, 80), 1)
        rain_amount = round(random.uniform(0, 15), 1) if rain_prob > 40 else round(random.uniform(0, 2), 1)
        
        fc = models.WeatherForecast(
            field_id=field.id,
            forecast_date=forecast_date,
            rain_probability=rain_prob,
            expected_rain_amount=rain_amount,
        )
        db.add(fc)
        forecast_count += 1

db.commit()
print(f"✅ {forecast_count} hava tahmini hazır")

# ============================================================
# 6. BİLDİRİMLER (Her kullanıcıya 3-5 bildirim)
# ============================================================
notification_messages = [
    "⚠️ {field} tarlasında nem seviyesi kritik düzeye düştü! Acil sulama gerekli.",
    "✅ {field} tarlası başarıyla sulandı. Süre: {dur} dk, Maliyet: {cost} ₺",
    "🌧️ Yarın {field} bölgesinde yağmur bekleniyor. Sulama ertelenebilir.",
    "📊 {field} tarlası haftalık raporu hazır. Ortalama nem: %{nem}",
    "🌡️ {field} bölgesinde sıcaklık düşüşü bekleniyor. Don riski olabilir!",
    "💧 {field} tarlasında sulama tamamlandı. Su tasarrufu: %{tasarruf}",
    "🔔 {field} tarlası için yeni sensör verisi alındı. Nem: %{nem}",
    "⏰ {field} tarlası {saat} saattir sulanmadı. Kontrol ediniz.",
]

notif_count = 0

for i, user in enumerate(created_users):
    existing_count = db.query(models.Notification).filter(models.Notification.user_id == user.id).count()
    if existing_count > 0:
        notif_count += existing_count
        continue
    
    user_fields = [f for f in created_fields if f.owner_id == user.id]
    num_notifs = random.randint(4, 6)
    
    for j in range(num_notifs):
        field = random.choice(user_fields)
        msg_template = random.choice(notification_messages)
        msg = msg_template.format(
            field=field.name.split()[0],  # İlk kelime
            dur=random.randint(15, 45),
            cost=round(random.uniform(0.5, 5.0), 2),
            nem=random.randint(25, 70),
            tasarruf=random.randint(10, 35),
            saat=random.randint(8, 48),
        )
        
        created_at = now - datetime.timedelta(
            days=random.randint(0, 5),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        notif = models.Notification(
            user_id=user.id,
            message=msg,
            created_at=created_at,
            is_read=random.random() < 0.4,  # %40 okunmuş
        )
        db.add(notif)
        notif_count += 1

db.commit()
print(f"✅ {notif_count} bildirim hazır")

# ============================================================
db.close()
print("\n🎉 Veritabanı başarıyla dolduruldu!")
print("=" * 50)
print("📧 Giriş Bilgileri:")
print("  1) ahmet@ciftci.com  / ahmet123")
print("  2) fatma@ciftci.com  / fatma123")
print("  3) mehmet@ciftci.com / mehmet123")
print("=" * 50)
