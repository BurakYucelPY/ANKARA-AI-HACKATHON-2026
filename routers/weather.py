from fastapi import APIRouter, Query
import requests
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/weather", tags=["Weather Integration"])

# Türkiye'deki popüler ilçelerin koordinatları
ILCE_KOORDINATLARI = {
    # Ankara İlçeleri
    "cankaya": {"lat": 39.9032, "lon": 32.8597, "il": "Ankara"},
    "kecioren": {"lat": 39.9875, "lon": 32.8697, "il": "Ankara"},
    "mamak": {"lat": 39.9311, "lon": 32.9136, "il": "Ankara"},
    "etimesgut": {"lat": 39.9456, "lon": 32.6786, "il": "Ankara"},
    "sincan": {"lat": 39.9697, "lon": 32.5833, "il": "Ankara"},
    "yenimahalle": {"lat": 39.9667, "lon": 32.8167, "il": "Ankara"},
    "polatli": {"lat": 39.5844, "lon": 32.1472, "il": "Ankara"},
    "haymana": {"lat": 39.4319, "lon": 32.4967, "il": "Ankara"},
    "beypazari": {"lat": 40.1678, "lon": 31.9214, "il": "Ankara"},
    "cubuk": {"lat": 40.2358, "lon": 33.0286, "il": "Ankara"},
    
    # İstanbul İlçeleri
    "kadikoy": {"lat": 40.9811, "lon": 29.0636, "il": "İstanbul"},
    "besiktas": {"lat": 41.0422, "lon": 29.0056, "il": "İstanbul"},
    "uskudar": {"lat": 41.0236, "lon": 29.0153, "il": "İstanbul"},
    "silivri": {"lat": 41.0733, "lon": 28.2478, "il": "İstanbul"},
    
    # İzmir İlçeleri
    "bornova": {"lat": 38.4700, "lon": 27.2200, "il": "İzmir"},
    "karsiyaka": {"lat": 38.4561, "lon": 27.1119, "il": "İzmir"},
    "odemis": {"lat": 38.2242, "lon": 27.9714, "il": "İzmir"},
    
    # Konya İlçeleri
    "selcuklu": {"lat": 37.9400, "lon": 32.4700, "il": "Konya"},
    "meram": {"lat": 37.8333, "lon": 32.4333, "il": "Konya"},
    "eregli": {"lat": 37.5167, "lon": 34.0500, "il": "Konya"},
    
    # Diğer önemli tarım ilçeleri
    "tarsus": {"lat": 36.9167, "lon": 34.8833, "il": "Mersin"},
    "ceyhan": {"lat": 37.0292, "lon": 35.8125, "il": "Adana"},
    "akhisar": {"lat": 38.9167, "lon": 27.8333, "il": "Manisa"},
    "alasehir": {"lat": 38.3500, "lon": 28.5167, "il": "Manisa"},
}

def hava_kodu_aciklama(code: int) -> dict:
    """WMO hava durumu kodunu Türkçe açıklamaya çevirir"""
    kodlar = {
        0: {"durum": "Açık", "yagis": False, "emoji": "☀️"},
        1: {"durum": "Az Bulutlu", "yagis": False, "emoji": "🌤️"},
        2: {"durum": "Parçalı Bulutlu", "yagis": False, "emoji": "⛅"},
        3: {"durum": "Kapalı", "yagis": False, "emoji": "☁️"},
        45: {"durum": "Sisli", "yagis": False, "emoji": "🌫️"},
        48: {"durum": "Kırağılı Sis", "yagis": False, "emoji": "🌫️"},
        51: {"durum": "Hafif Çisenti", "yagis": True, "emoji": "🌦️"},
        53: {"durum": "Orta Çisenti", "yagis": True, "emoji": "🌦️"},
        55: {"durum": "Yoğun Çisenti", "yagis": True, "emoji": "🌧️"},
        61: {"durum": "Hafif Yağmur", "yagis": True, "emoji": "🌧️"},
        63: {"durum": "Orta Yağmur", "yagis": True, "emoji": "🌧️"},
        65: {"durum": "Şiddetli Yağmur", "yagis": True, "emoji": "🌧️"},
        66: {"durum": "Hafif Dondurucu Yağmur", "yagis": True, "emoji": "🌨️"},
        67: {"durum": "Şiddetli Dondurucu Yağmur", "yagis": True, "emoji": "🌨️"},
        71: {"durum": "Hafif Kar", "yagis": True, "emoji": "❄️"},
        73: {"durum": "Orta Kar", "yagis": True, "emoji": "❄️"},
        75: {"durum": "Şiddetli Kar", "yagis": True, "emoji": "❄️"},
        80: {"durum": "Hafif Sağanak", "yagis": True, "emoji": "🌧️"},
        81: {"durum": "Orta Sağanak", "yagis": True, "emoji": "🌧️"},
        82: {"durum": "Şiddetli Sağanak", "yagis": True, "emoji": "⛈️"},
        95: {"durum": "Gök Gürültülü Fırtına", "yagis": True, "emoji": "⛈️"},
        96: {"durum": "Dolu ile Fırtına", "yagis": True, "emoji": "⛈️"},
        99: {"durum": "Şiddetli Dolu Fırtınası", "yagis": True, "emoji": "⛈️"},
    }
    return kodlar.get(code, {"durum": "Bilinmiyor", "yagis": False, "emoji": "❓"})


@router.get("/current")
def get_real_weather(
    ilce: Optional[str] = Query(None, description="İlçe adı (örn: polatli, haymana)"),
    lat: Optional[float] = Query(None, description="Enlem (opsiyonel, ilçe verilmezse)"),
    lon: Optional[float] = Query(None, description="Boylam (opsiyonel, ilçe verilmezse)")
):
    """Anlık hava durumunu getirir. İlçe adı veya koordinat verilebilir."""
    
    # Koordinatları belirle
    if ilce:
        ilce_lower = ilce.lower().replace("ı", "i").replace("ş", "s").replace("ç", "c").replace("ğ","g").replace("ü","u").replace("ö","o")
        koord = ILCE_KOORDINATLARI.get(ilce_lower)
        if not koord:
            return {"hata": f"'{ilce}' ilçesi bulunamadı. Mevcut ilçeler: {list(ILCE_KOORDINATLARI.keys())}"}
        latitude, longitude = koord["lat"], koord["lon"]
        lokasyon = f"{ilce.title()}, {koord['il']}"
    elif lat and lon:
        latitude, longitude = lat, lon
        lokasyon = f"Koordinat ({lat}, {lon})"
    else:
        # Varsayılan: Ankara merkez
        latitude, longitude = 39.93, 32.85
        lokasyon = "Ankara (Varsayılan)"
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current_weather=true"
    
    response = requests.get(url)
    data = response.json()
    
    current = data.get("current_weather", {})
    temp = current.get("temperature")
    weather_code = current.get("weathercode", 0)
    
    hava_bilgi = hava_kodu_aciklama(weather_code)
    
    return {
        "konum": lokasyon,
        "koordinat": {"lat": latitude, "lon": longitude},
        "sicaklik": temp,
        "durum": hava_bilgi["durum"],
        "emoji": hava_bilgi["emoji"],
        "yagis_var_mi": hava_bilgi["yagis"],
        "ham_kod": weather_code,
        # Eski API uyumluluğu için
        "location": lokasyon,
        "current_temp": temp,
        "is_it_raining": hava_bilgi["yagis"],
        "condition_code": weather_code
    }


@router.get("/hourly-forecast")
def get_hourly_forecast(
    ilce: Optional[str] = Query(None, description="İlçe adı"),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    saat: int = Query(24, description="Kaç saatlik tahmin? (max 48)")
):
    """Saatlik hava tahmini getirir - SULAMA KARARI İÇİN KRİTİK!"""
    
    # Koordinatları belirle
    if ilce:
        ilce_lower = ilce.lower().replace("ı", "i").replace("ş", "s").replace("ç", "c").replace("ğ","g").replace("ü","u").replace("ö","o")
        koord = ILCE_KOORDINATLARI.get(ilce_lower)
        if not koord:
            return {"hata": f"'{ilce}' ilçesi bulunamadı."}
        latitude, longitude = koord["lat"], koord["lon"]
        lokasyon = f"{ilce.title()}, {koord['il']}"
    elif lat and lon:
        latitude, longitude = lat, lon
        lokasyon = f"Koordinat ({lat}, {lon})"
    else:
        latitude, longitude = 39.93, 32.85
        lokasyon = "Ankara (Varsayılan)"
    
    # Open-Meteo'dan saatlik veri çek
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}"
        f"&hourly=temperature_2m,precipitation_probability,precipitation,weathercode"
        f"&forecast_days=2&timezone=Europe/Istanbul"
    )
    
    response = requests.get(url)
    data = response.json()
    
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    rain_probs = hourly.get("precipitation_probability", [])
    rain_amounts = hourly.get("precipitation", [])
    codes = hourly.get("weathercode", [])
    
    # Şu anki saatten itibaren al
    now = datetime.now()
    
    saatlik_tahmin = []
    yagis_saatleri = []  # Yağış beklenen saatler
    sayac = 0
    
    for i in range(len(times)):
        if sayac >= saat:
            break
            
        try:
            # Open-Meteo "2026-02-05T00:00" formatında veriyor
            forecast_time = datetime.strptime(times[i], "%Y-%m-%dT%H:%M")
        except:
            continue
        
        # Sadece gelecekteki saatleri al
        if forecast_time < now - timedelta(hours=1):
            continue
        
        sayac += 1
            
        hava_bilgi = hava_kodu_aciklama(codes[i] if i < len(codes) else 0)
        
        saat_verisi = {
            "saat": forecast_time.strftime("%H:00"),
            "tarih": forecast_time.strftime("%d/%m"),
            "tam_zaman": forecast_time.isoformat(),
            "sicaklik": temps[i] if i < len(temps) else None,
            "yagis_olasiligi": rain_probs[i] if i < len(rain_probs) else 0,
            "beklenen_yagis_mm": rain_amounts[i] if i < len(rain_amounts) else 0,
            "durum": hava_bilgi["durum"],
            "emoji": hava_bilgi["emoji"],
            "yagis_var_mi": hava_bilgi["yagis"]
        }
        saatlik_tahmin.append(saat_verisi)
        
        # Yağış varsa kaydet
        if hava_bilgi["yagis"] or (rain_probs[i] if i < len(rain_probs) else 0) > 50:
            yagis_saatleri.append({
                "saat": forecast_time.strftime("%H:00"),
                "kac_saat_sonra": int((forecast_time - now).total_seconds() / 3600),
                "olasilik": rain_probs[i] if i < len(rain_probs) else 0
            })
    
    # İlk yağış ne zaman?
    ilk_yagis = yagis_saatleri[0] if yagis_saatleri else None
    
    return {
        "konum": lokasyon,
        "koordinat": {"lat": latitude, "lon": longitude},
        "tahmin_saati": now.strftime("%H:%M"),
        "toplam_saat": len(saatlik_tahmin),
        "saatlik_tahmin": saatlik_tahmin,
        "yagis_beklenen_saatler": yagis_saatleri,
        "ilk_yagis": ilk_yagis,
        "onumuzdeki_6_saat_yagis": any(
            s["kac_saat_sonra"] <= 6 for s in yagis_saatleri
        ),
        "onumuzdeki_3_saat_yagis": any(
            s["kac_saat_sonra"] <= 3 for s in yagis_saatleri
        ),
        "onumuzdeki_1_saat_yagis": any(
            s["kac_saat_sonra"] <= 1 for s in yagis_saatleri
        )
    }


@router.get("/ilceler")
def list_ilceler():
    """Desteklenen ilçelerin listesini döner"""
    iller = {}
    for ilce, bilgi in ILCE_KOORDINATLARI.items():
        il = bilgi["il"]
        if il not in iller:
            iller[il] = []
        iller[il].append(ilce)
    
    return {
        "toplam_ilce": len(ILCE_KOORDINATLARI),
        "iller": iller
    }