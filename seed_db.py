"""
AquaSmart — Veritabanı Seed Script
===================================
12 tarla | 3 iklim bölgesi (Konya, Antalya, Ağrı) | 60 gün geçmiş veri
Her tarla belirli bir karar senaryosunu kanıtlamak için özelleştirilmiş veri desenine sahiptir.

Senaryolar:
  1  Çumra Buğday       — KRİTİK NEM → ACİL SULAMA   (Konya kuraklık)
  2  Karapınar Ayçiçeği — ML GÜVENME → SAVUNMACI      (sahte tahmin)
  3  Selçuklu Domates   — ML GÜVEN → ERTELEME          (isabetli tahmin)
  4  Ereğli Mısır       — İDEAL                        (düzenli bakım)
  5  Meram Biber        — DÜŞÜK NEM → SULAMA GEREKLİ  (adaptif)
  6  Serik Çilek        — AŞIRI ISLAK                  (Antalya yağış)
  7  Patnos Patates     — KRİTİK_SAVUNMACI            (Ağrı don)
  8  Akşehir Soğan      — İDEAL                        (düzenli)
  9  Kumluca Domates    — MALİYET TASARRUFU            (Antalya sera)
  10 Cihanbeyli Buğday  — SÜRPRİZ YAĞMUR              (microklima)
  11 Doğubayazıt Buğday — KRİTİK NEM                  (Ağrı sert kış)
  12 Beyşehir Çilek     — İDEAL                        (göl kenarı)
"""

import hashlib
import random
import datetime
from database import SessionLocal, engine
import models

# ── Deterministik seed ─────────────────────────────────────────────────
random.seed(42)

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

NOW = datetime.datetime(2026, 2, 6, 14, 0, 0)
DAYS = 60
HOURS_PER_DAY = [6, 10, 14, 18]

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  YARDIMCI FONKSİYONLAR                                            ║
# ╚══════════════════════════════════════════════════════════════════════╝

def h(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def iklim_sicaklik(bolge, ts):
    ay = ts.month
    saat = ts.hour
    if bolge == "konya":
        aylik = {1: -2, 2: 0, 3: 5, 4: 11, 5: 16, 6: 21, 7: 25, 8: 25, 9: 19, 10: 13, 11: 6, 12: 1}
    elif bolge == "antalya":
        aylik = {1: 10, 2: 11, 3: 13, 4: 17, 5: 21, 6: 26, 7: 29, 8: 29, 9: 26, 10: 21, 11: 15, 12: 11}
    elif bolge == "agri":
        aylik = {1: -12, 2: -10, 3: -3, 4: 5, 5: 11, 6: 16, 7: 20, 8: 20, 9: 14, 10: 7, 11: 0, 12: -8}
    else:
        aylik = {m: 15 for m in range(1, 13)}

    taban = aylik[ay]
    if saat <= 6:
        delta = random.uniform(-3, 0)
    elif saat <= 10:
        delta = random.uniform(0, 4)
    elif saat <= 14:
        delta = random.uniform(4, 10)
    else:
        delta = random.uniform(1, 5)
    delta += random.uniform(-2, 2)
    return round(taban + delta, 1)


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def ts_range(days, hours=None):
    if hours is None:
        hours = HOURS_PER_DAY
    timestamps = []
    for day_offset in range(days, 0, -1):
        for hour in hours:
            ts = NOW - datetime.timedelta(days=day_offset)
            ts = ts.replace(hour=hour, minute=random.randint(0, 15), second=0, microsecond=0)
            timestamps.append(ts)
    return timestamps


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  SENARYO VERİ ÜRETİCİLERİ                                         ║
# ╚══════════════════════════════════════════════════════════════════════╝

def generate_kritik_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """KRİTİK NEM — kuraklık trendi. Son 10 gün linear düşüş."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        day_offset = (NOW - ts).days
        if day_offset > 10:
            base_m = random.uniform(30, 55)
            if ts.hour >= 14:
                base_m -= random.uniform(3, 10)
            is_rain = random.random() < 0.15
            if is_rain:
                base_m += random.uniform(10, 20)
            rain_prob = round(random.uniform(10, 70), 1)
        else:
            progress = (10 - day_offset) / 10.0
            base_m = 45 - progress * (45 - son_nem)
            if ts.hour >= 14:
                base_m -= random.uniform(1, 4)
            base_m += random.uniform(-2, 2)
            is_rain = False
            rain_prob = round(random.uniform(0, 12), 1)
        moisture = round(clamp(base_m, 5, 80), 1)
        temp = iklim_sicaklik(bolge, ts) if day_offset > 0 else son_temp
        rain_amount = round(random.uniform(0, 10), 1) if rain_prob > 40 else round(random.uniform(0, 1.5), 1)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    # Deterministik son ölçüm
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=10),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=10),
        rain_probability=5.0, expected_rain_amount=0.0,
    ))
    return sensor_logs, weather_logs


def generate_ml_guvenme_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """ML GÜVENME — tahmin hep yağmur diyor ama hiç yağmıyor."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        base_m = random.uniform(20, 50)
        if ts.hour >= 14:
            base_m -= random.uniform(5, 12)
        rain_prob = round(random.uniform(50, 85), 1)
        rain_amount = round(random.uniform(5, 18), 1)
        is_rain = random.random() < 0.05
        if is_rain:
            base_m += random.uniform(8, 15)
        moisture = round(clamp(base_m, 8, 75), 1)
        temp = iklim_sicaklik(bolge, ts)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=8),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=8),
        rain_probability=72.0, expected_rain_amount=12.0,
    ))
    return sensor_logs, weather_logs


def generate_ml_guven_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """ML GÜVEN — tahmin isabetli (%85)."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        tahmin_var = random.random() < 0.45
        if tahmin_var:
            rain_prob = round(random.uniform(50, 85), 1)
            rain_amount = round(random.uniform(5, 20), 1)
            is_rain = random.random() < 0.85
        else:
            rain_prob = round(random.uniform(5, 30), 1)
            rain_amount = round(random.uniform(0, 2), 1)
            is_rain = random.random() < 0.10
        base_m = random.uniform(22, 55)
        if ts.hour >= 14:
            base_m -= random.uniform(3, 10)
        if is_rain:
            base_m += random.uniform(10, 25)
        moisture = round(clamp(base_m, 10, 80), 1)
        temp = iklim_sicaklik(bolge, ts)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=5),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=5),
        rain_probability=68.0, expected_rain_amount=10.0,
    ))
    return sensor_logs, weather_logs


def generate_ideal_data(field_id, bolge, son_nem, son_temp, min_m, max_m, days=DAYS):
    """İDEAL — nem her zaman min-max aralığında."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    orta = (min_m + max_m) / 2
    yarim_bant = (max_m - min_m) / 2 * 0.6
    for ts in timestamps:
        base_m = orta + random.uniform(-yarim_bant, yarim_bant)
        if ts.hour >= 14:
            base_m -= random.uniform(2, 5)
        is_rain = random.random() < 0.20
        if is_rain:
            base_m += random.uniform(3, 8)
        moisture = round(clamp(base_m, min_m + 2, max_m - 2), 1)
        temp = iklim_sicaklik(bolge, ts)
        rain_prob = round(random.uniform(5, 55), 1)
        rain_amount = round(random.uniform(0, 8), 1) if rain_prob > 40 else round(random.uniform(0, 2), 1)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=3),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=3),
        rain_probability=25.0, expected_rain_amount=1.0,
    ))
    return sensor_logs, weather_logs


def generate_dusuk_nem_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """DÜŞÜK NEM — son ölçüm min altında, kritik üstünde. Adaptif."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        base_m = random.uniform(25, 55)
        if ts.hour >= 14:
            base_m -= random.uniform(5, 12)
        is_rain = random.random() < 0.18
        if is_rain:
            base_m += random.uniform(8, 18)
        moisture = round(clamp(base_m, 10, 75), 1)
        temp = iklim_sicaklik(bolge, ts)
        rain_prob = round(random.uniform(5, 65), 1)
        rain_amount = round(random.uniform(0, 12), 1) if rain_prob > 40 else round(random.uniform(0, 2), 1)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=7),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=7),
        rain_probability=35.0, expected_rain_amount=3.0,
    ))
    return sensor_logs, weather_logs


def generate_asiri_islak_data(field_id, bolge, son_nem, son_temp, max_m, days=DAYS):
    """AŞIRI ISLAK — Antalya kış yağışları. Son 7 gün yoğun yağış."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        day_offset = (NOW - ts).days
        if day_offset > 7:
            base_m = random.uniform(35, 60)
            if ts.hour >= 14:
                base_m -= random.uniform(2, 6)
            is_rain = random.random() < 0.25
            if is_rain:
                base_m += random.uniform(5, 12)
            rain_prob = round(random.uniform(15, 65), 1)
        else:
            progress = (7 - day_offset) / 7.0
            base_m = 50 + progress * (son_nem - 50)
            is_rain = random.random() < 0.75
            if is_rain:
                base_m += random.uniform(3, 8)
            rain_prob = round(random.uniform(65, 95), 1)
        moisture = round(clamp(base_m, 15, 90), 1)
        temp = iklim_sicaklik(bolge, ts)
        rain_amount = round(random.uniform(5, 25), 1) if rain_prob > 40 else round(random.uniform(0, 3), 1)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=12),
        moisture=son_nem, temperature=son_temp, is_raining=True,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=12),
        rain_probability=88.0, expected_rain_amount=20.0,
    ))
    return sensor_logs, weather_logs


def generate_kritik_savunmaci_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """KRİTİK_SAVUNMACI — kritik altı + ML tahmine güvenmiyor."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        day_offset = (NOW - ts).days
        if day_offset > 10:
            base_m = random.uniform(22, 50)
            if ts.hour >= 14:
                base_m -= random.uniform(4, 10)
        else:
            progress = (10 - day_offset) / 10.0
            base_m = 40 - progress * (40 - son_nem)
            base_m += random.uniform(-3, 3)
        rain_prob = round(random.uniform(50, 85), 1)
        rain_amount = round(random.uniform(5, 15), 1)
        is_rain = random.random() < 0.06
        if is_rain:
            base_m += random.uniform(8, 15)
        moisture = round(clamp(base_m, 5, 70), 1)
        temp = iklim_sicaklik(bolge, ts)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=6),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=6),
        rain_probability=75.0, expected_rain_amount=10.0,
    ))
    return sensor_logs, weather_logs


def generate_surpriz_yagmur_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """SÜRPRİZ YAĞMUR — tahmin düşük ama %38 sürpriz yağmur."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        base_m = random.uniform(22, 52)
        if ts.hour >= 14:
            base_m -= random.uniform(3, 8)
        rain_prob = round(random.uniform(5, 28), 1)
        rain_amount = round(random.uniform(0, 2.5), 1)
        is_rain = random.random() < 0.38
        if is_rain:
            base_m += random.uniform(8, 20)
        moisture = round(clamp(base_m, 10, 80), 1)
        temp = iklim_sicaklik(bolge, ts)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=15),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=15),
        rain_probability=18.0, expected_rain_amount=1.0,
    ))
    return sensor_logs, weather_logs


def generate_maliyet_data(field_id, bolge, son_nem, son_temp, days=DAYS):
    """MALİYET TASARRUFU — ilk 30 gün düzensiz, son 30 gün ML stabil."""
    timestamps = ts_range(days)
    sensor_logs = []
    weather_logs = []
    for ts in timestamps:
        day_offset = (NOW - ts).days
        if day_offset > 30:
            base_m = random.uniform(18, 55)
            if ts.hour >= 14:
                base_m -= random.uniform(5, 15)
            is_rain = random.random() < 0.20
            rain_prob = round(random.uniform(10, 70), 1)
        else:
            base_m = random.uniform(28, 55)
            if ts.hour >= 14:
                base_m -= random.uniform(3, 8)
            tahmin_var = random.random() < 0.40
            if tahmin_var:
                rain_prob = round(random.uniform(50, 80), 1)
                is_rain = random.random() < 0.80
            else:
                rain_prob = round(random.uniform(5, 25), 1)
                is_rain = random.random() < 0.08
        if is_rain:
            base_m += random.uniform(8, 18)
        moisture = round(clamp(base_m, 8, 82), 1)
        temp = iklim_sicaklik(bolge, ts)
        rain_amount = round(random.uniform(3, 15), 1) if rain_prob > 40 else round(random.uniform(0, 2), 1)
        sensor_logs.append(models.SensorLog(
            field_id=field_id, timestamp=ts,
            moisture=moisture, temperature=temp, is_raining=is_rain,
        ))
        weather_logs.append(models.WeatherForecast(
            field_id=field_id, forecast_date=ts,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
    sensor_logs.append(models.SensorLog(
        field_id=field_id, timestamp=NOW - datetime.timedelta(minutes=4),
        moisture=son_nem, temperature=son_temp, is_raining=False,
    ))
    weather_logs.append(models.WeatherForecast(
        field_id=field_id, forecast_date=NOW - datetime.timedelta(minutes=4),
        rain_probability=55.0, expected_rain_amount=8.0,
    ))
    return sensor_logs, weather_logs


# ╔══════════════════════════════════════════════════════════════════════╗
# ║  1. KULLANICILAR                                                    ║
# ╚══════════════════════════════════════════════════════════════════════╝

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

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  2. TARLALAR (12 tarla — Konya / Antalya / Ağrı)                  ║
# ╚══════════════════════════════════════════════════════════════════════╝

plant_types = db.query(models.PlantType).all()
if not plant_types:
    print("❌ Bitki türleri bulunamadı! Önce /plant-types/seed çağırın.")
    exit()

pt_map = {p.name: p.id for p in plant_types}

fields_data = [
    # ── Ahmet'in tarlaları (7 tarla: Konya + Antalya + Ağrı) ──
    {"name": "Çumra Buğday Tarlası", "location": "Çumra, Konya", "ilce": "cumra",
     "latitude": 37.5722, "longitude": 32.7744, "pump_flow_rate": 120.0, "water_unit_price": 1.2,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Buğday", 1)},

    {"name": "Karapınar Ayçiçeği Tarlası", "location": "Karapınar, Konya", "ilce": "karapinar",
     "latitude": 37.7167, "longitude": 33.5500, "pump_flow_rate": 150.0, "water_unit_price": 1.0,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Ayçiçeği", 1)},

    {"name": "Selçuklu Domates Serası", "location": "Selçuklu, Konya", "ilce": "selcuklu",
     "latitude": 37.9400, "longitude": 32.4700, "pump_flow_rate": 80.0, "water_unit_price": 1.8,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Domates", 1)},

    {"name": "Ereğli Mısır Tarlası", "location": "Ereğli, Konya", "ilce": "eregli",
     "latitude": 37.5167, "longitude": 34.0500, "pump_flow_rate": 130.0, "water_unit_price": 1.4,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Mısır", 1)},

    {"name": "Meram Kapya Biber Bahçesi", "location": "Meram, Konya", "ilce": "meram",
     "latitude": 37.8333, "longitude": 32.4333, "pump_flow_rate": 90.0, "water_unit_price": 1.6,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Kapya Biber", 1)},

    {"name": "Serik Çilek Serası", "location": "Serik, Antalya", "ilce": "serik",
     "latitude": 36.9200, "longitude": 31.1000, "pump_flow_rate": 70.0, "water_unit_price": 2.2,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Çilek", 1)},

    {"name": "Patnos Patates Tarlası", "location": "Patnos, Ağrı", "ilce": "patnos",
     "latitude": 39.2333, "longitude": 43.6833, "pump_flow_rate": 95.0, "water_unit_price": 1.5,
     "owner_id": created_users[0].id, "plant_type_id": pt_map.get("Patates", 1)},

    # ── Fatma'nın tarlaları (3 tarla) ──
    {"name": "Akşehir Soğan Tarlası", "location": "Akşehir, Konya", "ilce": "aksehir",
     "latitude": 38.3575, "longitude": 31.4158, "pump_flow_rate": 110.0, "water_unit_price": 1.3,
     "owner_id": created_users[1].id, "plant_type_id": pt_map.get("Soğan", 1)},

    {"name": "Kumluca Domates Serası", "location": "Kumluca, Antalya", "ilce": "kumluca",
     "latitude": 36.3667, "longitude": 30.2833, "pump_flow_rate": 85.0, "water_unit_price": 1.7,
     "owner_id": created_users[1].id, "plant_type_id": pt_map.get("Domates", 1)},

    {"name": "Cihanbeyli Buğday Tarlası", "location": "Cihanbeyli, Konya", "ilce": "cihanbeyli",
     "latitude": 38.6558, "longitude": 32.9278, "pump_flow_rate": 125.0, "water_unit_price": 1.1,
     "owner_id": created_users[1].id, "plant_type_id": pt_map.get("Buğday", 1)},

    # ── Mehmet'in tarlaları (2 tarla) ──
    {"name": "Doğubayazıt Buğday Tarlası", "location": "Doğubayazıt, Ağrı", "ilce": "dogubayazit",
     "latitude": 39.7217, "longitude": 44.0867, "pump_flow_rate": 115.0, "water_unit_price": 1.3,
     "owner_id": created_users[2].id, "plant_type_id": pt_map.get("Buğday", 1)},

    {"name": "Beyşehir Çilek Bahçesi", "location": "Beyşehir, Konya", "ilce": "beysehir",
     "latitude": 37.6786, "longitude": 31.7250, "pump_flow_rate": 75.0, "water_unit_price": 1.9,
     "owner_id": created_users[2].id, "plant_type_id": pt_map.get("Çilek", 1)},
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

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  3. SENSÖR CİHAZLARI (tarla başı 2: nem + sıcaklık)              ║
# ╚══════════════════════════════════════════════════════════════════════╝

ilce_labels = [
    "Çumra", "Karapınar", "Selçuklu", "Ereğli", "Meram", "Serik",
    "Patnos", "Akşehir", "Kumluca", "Cihanbeyli", "Doğubayazıt", "Beyşehir",
]

sensor_device_count = 0
for idx, field in enumerate(created_fields):
    existing = db.query(models.Sensor).filter(models.Sensor.field_id == field.id).count()
    if existing > 0:
        sensor_device_count += existing
        continue
    label = ilce_labels[idx] if idx < len(ilce_labels) else f"#{idx+1}"
    base_num = idx * 2 + 1
    db.add(models.Sensor(
        sensor_code=f"SNS-{base_num:03d}",
        name=f"Nem Sensörü — {label}",
        type="moisture",
        status=random.choice(["active"] * 4 + ["warning"]),
        battery=random.randint(40, 100),
        field_id=field.id,
        installed_at=NOW - datetime.timedelta(days=random.randint(60, 365)),
    ))
    db.add(models.Sensor(
        sensor_code=f"SNS-{base_num + 1:03d}",
        name=f"Sıcaklık Sensörü — {label}",
        type="temperature",
        status=random.choice(["active"] * 3 + ["maintenance"]),
        battery=random.randint(25, 100),
        field_id=field.id,
        installed_at=NOW - datetime.timedelta(days=random.randint(60, 365)),
    ))
    sensor_device_count += 2

db.commit()
print(f"✅ {sensor_device_count} sensör cihazı hazır")

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  4. SENARYO BAZLI SENSÖR + HAVA TAHMİN VERİLERİ (60 gün)         ║
# ╚══════════════════════════════════════════════════════════════════════╝

SCENARIO_CONFIG = [
    # idx  generator                     kwargs
    (0,  generate_kritik_data,           {"bolge": "konya",   "son_nem": 8.0,  "son_temp": 2.0}),
    (1,  generate_ml_guvenme_data,       {"bolge": "konya",   "son_nem": 20.0, "son_temp": 1.5}),
    (2,  generate_ml_guven_data,         {"bolge": "konya",   "son_nem": 22.0, "son_temp": 3.0}),
    (3,  generate_ideal_data,            {"bolge": "konya",   "son_nem": 52.0, "son_temp": 2.5, "min_m": 35, "max_m": 70}),
    (4,  generate_dusuk_nem_data,        {"bolge": "konya",   "son_nem": 28.0, "son_temp": 3.5}),
    (5,  generate_asiri_islak_data,      {"bolge": "antalya", "son_nem": 75.0, "son_temp": 12.0, "max_m": 70}),
    (6,  generate_kritik_savunmaci_data, {"bolge": "agri",    "son_nem": 12.0, "son_temp": -5.0}),
    (7,  generate_ideal_data,            {"bolge": "konya",   "son_nem": 40.0, "son_temp": 1.0, "min_m": 25, "max_m": 55}),
    (8,  generate_maliyet_data,          {"bolge": "antalya", "son_nem": 24.0, "son_temp": 13.0}),
    (9,  generate_surpriz_yagmur_data,   {"bolge": "konya",   "son_nem": 20.0, "son_temp": 0.5}),
    (10, generate_kritik_data,           {"bolge": "agri",    "son_nem": 9.0,  "son_temp": -8.0}),
    (11, generate_ideal_data,            {"bolge": "konya",   "son_nem": 55.0, "son_temp": 2.0, "min_m": 40, "max_m": 70}),
]

total_sensor = 0
total_weather = 0

for field_idx, gen_func, kwargs in SCENARIO_CONFIG:
    field = created_fields[field_idx]
    existing_sensor = db.query(models.SensorLog).filter(models.SensorLog.field_id == field.id).count()
    if existing_sensor > 0:
        total_sensor += existing_sensor
        total_weather += db.query(models.WeatherForecast).filter(models.WeatherForecast.field_id == field.id).count()
        continue
    sensor_logs, weather_logs = gen_func(field_id=field.id, **kwargs)
    for sl in sensor_logs:
        db.add(sl)
    for wl in weather_logs:
        db.add(wl)
    total_sensor += len(sensor_logs)
    total_weather += len(weather_logs)

db.commit()
print(f"✅ {total_sensor} sensör kaydı hazır")
print(f"✅ {total_weather} hava tahmini hazır")

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  5. GELECEK HAVA TAHMİNLERİ (5 gün ileri)                         ║
# ╚══════════════════════════════════════════════════════════════════════╝

future_count = 0
for field in created_fields:
    future_exists = db.query(models.WeatherForecast).filter(
        models.WeatherForecast.field_id == field.id,
        models.WeatherForecast.forecast_date > NOW,
    ).count()
    if future_exists > 0:
        future_count += future_exists
        continue
    for day_offset in range(1, 6):
        forecast_date = (NOW + datetime.timedelta(days=day_offset)).replace(hour=12, minute=0, second=0)
        rain_prob = round(random.uniform(5, 75), 1)
        rain_amount = round(random.uniform(2, 18), 1) if rain_prob > 40 else round(random.uniform(0, 2), 1)
        db.add(models.WeatherForecast(
            field_id=field.id, forecast_date=forecast_date,
            rain_probability=rain_prob, expected_rain_amount=rain_amount,
        ))
        future_count += 1

db.commit()
print(f"✅ {future_count} gelecek hava tahmini hazır")

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  6. SULAMA LOGLARI (senaryo bazlı)                                 ║
# ╚══════════════════════════════════════════════════════════════════════╝

irrigation_count = 0

def add_irrigation(fld, day_off, hour, dur_min):
    start = (NOW - datetime.timedelta(days=day_off)).replace(hour=hour, minute=random.randint(0, 20))
    water = round(fld.pump_flow_rate * (dur_min / 60), 1)
    cost = round(water * fld.water_unit_price / 1000, 2)
    db.add(models.IrrigationLog(
        field_id=fld.id, start_time=start,
        duration_minutes=round(dur_min, 1), water_amount_liters=water, cost_total=cost,
    ))
    return 1

for idx, field in enumerate(created_fields):
    existing = db.query(models.IrrigationLog).filter(models.IrrigationLog.field_id == field.id).count()
    if existing > 0:
        irrigation_count += existing
        continue

    if idx == 0:
        # Çumra Buğday — KRİTİK: son 10 gün sulama yok, öncesi düzenli
        for d in range(55, 10, -3):
            irrigation_count += add_irrigation(field, d, random.choice([6, 7]), random.uniform(25, 50))

    elif idx == 1:
        # Karapınar Ayçiçeği — ML GÜVENME: düzenli sulama
        for d in range(58, 1, -3):
            irrigation_count += add_irrigation(field, d, random.choice([6, 17]), random.uniform(30, 55))

    elif idx == 2:
        # Selçuklu Domates — ML GÜVEN: yağmurlu günlerde atlanmış
        for d in range(56, 1, -4):
            irrigation_count += add_irrigation(field, d, 7, random.uniform(20, 45))

    elif idx == 3:
        # Ereğli Mısır — İDEAL: düzenli
        for d in range(58, 1, -3):
            irrigation_count += add_irrigation(field, d, random.choice([6, 7, 17]), random.uniform(25, 40))

    elif idx == 4:
        # Meram Biber — DÜŞÜK NEM: yetersiz
        for d in range(55, 1, -5):
            irrigation_count += add_irrigation(field, d, random.choice([6, 17]), random.uniform(15, 35))

    elif idx == 5:
        # Serik Çilek — AŞIRI ISLAK: son 7 gün yok
        for d in range(55, 8, -3):
            irrigation_count += add_irrigation(field, d, random.choice([6, 7]), random.uniform(15, 30))

    elif idx == 6:
        # Patnos Patates — KRİTİK_SAVUNMACI: don yüzünden tutarsız
        for d in range(55, 2, -4):
            irrigation_count += add_irrigation(field, d, random.choice([7, 17]), random.uniform(20, 45))

    elif idx == 7:
        # Akşehir Soğan — İDEAL: düzenli
        for d in range(56, 1, -4):
            irrigation_count += add_irrigation(field, d, random.choice([6, 17]), random.uniform(20, 35))

    elif idx == 8:
        # Kumluca Domates — MALİYET: ilk 30 gün her gün, son 30 gün haftada 3-4
        for d in range(58, 28, -1):
            irrigation_count += add_irrigation(field, d, 7, random.uniform(40, 60))
        smart_days = sorted(random.sample(range(1, 28), 15), reverse=True)
        for d in smart_days:
            irrigation_count += add_irrigation(field, d, 7, random.uniform(20, 40))

    elif idx == 9:
        # Cihanbeyli Buğday — SÜRPRİZ YAĞMUR: düzenli
        for d in range(55, 1, -4):
            irrigation_count += add_irrigation(field, d, random.choice([6, 7]), random.uniform(25, 45))

    elif idx == 10:
        # Doğubayazıt Buğday — KRİTİK: son 10 gün yok
        for d in range(55, 10, -4):
            irrigation_count += add_irrigation(field, d, 7, random.uniform(25, 50))

    elif idx == 11:
        # Beyşehir Çilek — İDEAL: düzenli
        for d in range(55, 1, -3):
            irrigation_count += add_irrigation(field, d, random.choice([6, 7]), random.uniform(15, 30))

db.commit()
print(f"✅ {irrigation_count} sulama kaydı hazır")

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  7. BİLDİRİMLER (senaryo-spesifik)                                ║
# ╚══════════════════════════════════════════════════════════════════════╝

notif_count = 0

def add_notif(uid, msg, days_ago, hours_ago=0, is_read=False):
    db.add(models.Notification(
        user_id=uid, message=msg,
        created_at=NOW - datetime.timedelta(days=days_ago, hours=hours_ago),
        is_read=is_read,
    ))
    return 1

for user in created_users:
    existing = db.query(models.Notification).filter(models.Notification.user_id == user.id).count()
    if existing > 0:
        notif_count += existing
        continue

    if user.email == "ahmet@ciftci.com":
        notif_count += add_notif(user.id,
            "⚠️ Çumra Buğday tarlasında nem %8'e düştü! Konya'da kuraklık devam ediyor. Acil sulama başlatılıyor.", 0, 2)
        notif_count += add_notif(user.id,
            "🤖 Karapınar Ayçiçeği: ML modeli hava tahminlerine güvenmiyor (son 60 günde %5 isabet). Savunmacı sulama uygulanıyor.", 0, 5)
        notif_count += add_notif(user.id,
            "✅ Selçuklu Domates: Yağmur tahmini ML tarafından doğrulandı (%85 isabet). Sulama 3 saat erteleniyor — su tasarrufu!", 1, 3, True)
        notif_count += add_notif(user.id,
            "📊 Ereğli Mısır: Haftalık rapor — nem ideal aralıkta (%52), son 7 günde 2 sulama yapıldı.", 1, 8, True)
        notif_count += add_notif(user.id,
            "💧 Meram Biber: Nem %28'e düştü. Konya sıcakları etkili. Sulama başlatılıyor.", 0, 6)
        notif_count += add_notif(user.id,
            "🚫 Serik Çilek: Antalya'da yoğun yağış sonrası nem %75. Sulama durduruldu — kök çürümesi riski!", 0, 1)
        notif_count += add_notif(user.id,
            "🌡️ Patnos Patates: Ağrı'da -5°C! Don riski mevcut. Kritik nem seviyesi (%12). Minimum doz sulama.", 0, 3)
        notif_count += add_notif(user.id,
            "✅ Selçuklu Domates: Sulama 45 dk sürdü. 60L su kullanıldı. Maliyet: 0.11₺", 2, 10, True)
        notif_count += add_notif(user.id,
            "📊 Haftalık özet: 7 tarlanızdan 3'ü ideal, 2'si kritik, 1'i aşırı ıslak. Toplam su: 2450L", 3, 0, True)
        notif_count += add_notif(user.id,
            "🌧️ Karapınar bölgesinde yarın yağmur bekleniyor ama ML güvenmiyor. Sulama programı korunuyor.", 1, 14)
        notif_count += add_notif(user.id,
            "⏰ Çumra Buğday tarlası 48 saattir sulanmadı! Nem tehlikeli seviyeye yaklaşıyor.", 1, 0)
        notif_count += add_notif(user.id,
            "💰 Bu hafta ML sayesinde Selçuklu serasında %32 su tasarrufu sağlandı. Aylık tasarruf: ~85₺", 2, 6, True)

    elif user.email == "fatma@ciftci.com":
        notif_count += add_notif(user.id,
            "✅ Akşehir Soğan: Nem ideal aralıkta (%40). Sulama programı düzenli devam ediyor.", 0, 4, True)
        notif_count += add_notif(user.id,
            "💰 Kumluca Domates: ML ile son 30 günde %48 su tasarrufu! Günlük maliyet 5.4₺ → 2.7₺", 0, 8)
        notif_count += add_notif(user.id,
            "🌧️ Cihanbeyli Buğday: ML sürpriz yağmur tespit etti! Tahmin vermese de beklenmedik yağışlar olabiliyor.", 0, 12)
        notif_count += add_notif(user.id,
            "📊 Kumluca Domates: Haftalık rapor — ML öncesi 5.1₺/gün → ML sonrası 2.6₺/gün.", 2, 5, True)
        notif_count += add_notif(user.id,
            "✅ Akşehir Soğan: Sulama tamamlandı. Süre: 28 dk, Su: 51.3L, Maliyet: 0.07₺", 1, 7, True)
        notif_count += add_notif(user.id,
            "🔔 Cihanbeyli Buğday: Yeni sensör verisi — Nem: %20, Sıcaklık: 0.5°C. Sulama gerekebilir.", 0, 2)
        notif_count += add_notif(user.id,
            "⚠️ Cihanbeyli bölgesinde sıcaklık düşüyor. Don riski olabilir!", 1, 18)
        notif_count += add_notif(user.id,
            "📊 Haftalık özet: 3 tarla — 1 ideal, 1 maliyet tasarrufu, 1 sürpriz yağmur deseni.", 3, 0, True)

    elif user.email == "mehmet@ciftci.com":
        notif_count += add_notif(user.id,
            "⚠️ Doğubayazıt Buğday: Nem %9! Ağrı'da sert kış toprak nemini kritik seviyeye çekti.", 0, 1)
        notif_count += add_notif(user.id,
            "✅ Beyşehir Çilek: Nem ideal (%55). Göl kenarı mikrokliması bitkiye iyi geliyor.", 0, 5, True)
        notif_count += add_notif(user.id,
            "🌡️ Doğubayazıt'ta -8°C! Ağır don koşulları. Toprak nemi eriyen karla dengelenemiyor.", 0, 10)
        notif_count += add_notif(user.id,
            "📊 Beyşehir Çilek: Haftalık rapor — nem stabil, son 7 günde 2 sulama yapıldı.", 2, 4, True)
        notif_count += add_notif(user.id,
            "⏰ Doğubayazıt Buğday 36 saattir sulanmadı. Kuraklık riski artıyor!", 1, 6)
        notif_count += add_notif(user.id,
            "💧 Beyşehir Çilek: Sulama tamamlandı. Su tasarrufu: %18. Göl etkisi faydalı.", 1, 12, True)

db.commit()
print(f"✅ {notif_count} bildirim hazır")

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  ÖZET                                                               ║
# ╚══════════════════════════════════════════════════════════════════════╝

db.close()
print("\n" + "=" * 60)
print("🎉 Veritabanı başarıyla dolduruldu!")
print("=" * 60)
print(f"""
📊 Veri Özeti:
  • 3 kullanıcı
  • 12 tarla (Konya:7 | Antalya:2 | Ağrı:2 | Konya-Beyşehir:1)
  • 24 sensör cihazı
  • ~{total_sensor} sensör kaydı (60 gün × 4/gün)
  • ~{total_weather} hava tahmini
  • {future_count} gelecek hava tahmini
  • {irrigation_count} sulama kaydı
  • {notif_count} bildirim

🌍 İklim Bölgeleri:
  • Konya (step)      — kuru, sert kış, sıcak yaz
  • Antalya (Akdeniz)  — ılıman, yağışlı kış
  • Ağrı (karasal)     — çok soğuk, don, kuraklık

🧪 Senaryolar:
  1  Çumra Buğday       → KRİTİK NEM       (nem=%8)
  2  Karapınar Ayçiçeği → ML GÜVENME        (sahte tahmin)
  3  Selçuklu Domates   → ML GÜVEN          (isabetli tahmin)
  4  Ereğli Mısır       → İDEAL             (nem=%52)
  5  Meram Biber        → DÜŞÜK NEM         (nem=%28)
  6  Serik Çilek        → AŞIRI ISLAK       (nem=%75, Antalya)
  7  Patnos Patates     → KRİTİK_SAVUNMACI (nem=%12, Ağrı)
  8  Akşehir Soğan      → İDEAL             (nem=%40)
  9  Kumluca Domates    → MALİYET TASARRUFU (Antalya)
  10 Cihanbeyli Buğday  → SÜRPRİZ YAĞMUR
  11 Doğubayazıt Buğday → KRİTİK NEM       (nem=%9, -8°C)
  12 Beyşehir Çilek     → İDEAL             (nem=%55)

📧 Giriş Bilgileri:
  1) ahmet@ciftci.com  / ahmet123  (7 tarla — demo)
  2) fatma@ciftci.com  / fatma123  (3 tarla)
  3) mehmet@ciftci.com / mehmet123 (2 tarla)

🔬 Test Sırası:
  1. POST /plant-types/seed         → Bitki türlerini yükle
  2. POST /prediction/train-all     → ML modellerini eğit
  3. GET  /simulation/check-all-fields/1 → Ahmet kontrol
""")
print("=" * 60)
