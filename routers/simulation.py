from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal
import datetime
import requests

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


def get_hourly_weather(ilce: str = None, lat: float = None, lon: float = None):
    """Saatlik hava tahminini çeker"""
    try:
        params = []
        if ilce:
            params.append(f"ilce={ilce}")
        elif lat and lon:
            params.append(f"lat={lat}&lon={lon}")
        
        url = f"http://127.0.0.1:8000/weather/hourly-forecast?{'&'.join(params)}&saat=24"
        response = requests.get(url, timeout=5)
        return response.json()
    except:
        return None


# 2. AKILLI SULAMA KARAR MEKANİZMASI (Saatlik Hava Tahmini + Kritik Sınırlar)
@router.get("/check-irrigation/{field_id}")
def check_irrigation_status(field_id: int, db: Session = Depends(get_db)):
    """
    🧠 AKILLI SULAMA KARARI
    
    Bu endpoint şunları analiz eder:
    1. Mevcut toprak nemi
    2. Bitkinin kritik/minimum/maksimum nem sınırları
    3. Önümüzdeki 24 saatlik hava tahmini
    4. Ne zaman yağmur yağacak (varsa)
    
    Karar mantığı:
    - KRİTİK NEM: Yağmur bile olsa HEMEN sula (bitki ölür)
    - DÜŞÜK NEM + YAKIN YAĞMUR: Bekle, yağmur sulayacak
    - DÜŞÜK NEM + UZAK/YOK YAĞMUR: Şimdi sula
    """
    
    # A. Veritabanından son toprak nemini bul
    last_log = db.query(models.SensorLog)\
        .filter(models.SensorLog.field_id == field_id)\
        .order_by(models.SensorLog.timestamp.desc())\
        .first()

    if not last_log:
        return {"mesaj": "Henüz sensör verisi gelmedi, karar verilemiyor."}

    # B. Tarla ve Bitki bilgilerini çek
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Tarla bulunamadı!")
    
    bitki = field.plant_type
    
    # Kritik sınırlar (varsayılan değerlerle)
    kritik_nem = getattr(bitki, 'critical_moisture', 10.0) or 10.0
    min_nem = bitki.min_moisture
    max_nem = bitki.max_moisture
    max_bekleme = getattr(bitki, 'max_wait_hours', 6) or 6
    
    # C. SAATLIK HAVA TAHMİNİ ÇEK (İlçe bazlı!)
    ilce = getattr(field, 'ilce', None) or "cankaya"
    lat = getattr(field, 'latitude', None)
    lon = getattr(field, 'longitude', None)
    
    weather_data = get_hourly_weather(ilce=ilce, lat=lat, lon=lon)
    
    # Hava durumu analizi
    if weather_data and "hata" not in weather_data:
        konum = weather_data.get("konum", ilce)
        yagis_1_saat = weather_data.get("onumuzdeki_1_saat_yagis", False)
        yagis_3_saat = weather_data.get("onumuzdeki_3_saat_yagis", False)
        yagis_6_saat = weather_data.get("onumuzdeki_6_saat_yagis", False)
        ilk_yagis = weather_data.get("ilk_yagis")
        saatlik = weather_data.get("saatlik_tahmin", [])[:12]  # İlk 12 saat
    else:
        konum = ilce
        yagis_1_saat = False
        yagis_3_saat = False
        yagis_6_saat = False
        ilk_yagis = None
        saatlik = []
    
    mevcut_nem = last_log.moisture
    
    # D. 🧠 ML HAVA TAHMİNİ DOĞRULAMA
    ml_tahmin = None
    ml_override = False
    ml_strateji = None
    try:
        from ml.predictor import predict_rain
        ml_result = predict_rain(field_id, {
            "moisture": last_log.moisture,
            "temperature": last_log.temperature,
        })
        ml_tahmin = ml_result
    except Exception:
        ml_tahmin = {"mesaj": "ML modeli henüz eğitilmedi. POST /prediction/train-all çağırın."}
    
    # E. 🧠 AKILLI KARAR MANTIĞI (ML destekli savunmacı sulama)
    karar = {
        "durum": "IDEAL",
        "aksiyon": "Sulama gerekmiyor",
        "aciliyet": "YOK",
        "detay": "",
        "pompa": "KAPALI"
    }
    
    # ML'den gelen sulama kararı
    ml_sulama_karari = ml_tahmin.get("sulama_karari", "") if isinstance(ml_tahmin, dict) else ""
    
    # SENARYO 1: KRİTİK NEM
    if mevcut_nem < kritik_nem:
        # Yağmur tahmini var ve ML güvenmiyorsa → sadece minimum'a sula (savunmacı)
        if (yagis_1_saat or yagis_3_saat or yagis_6_saat) and ml_sulama_karari == "GUVENME_SULA":
            karar = {
                "durum": "KRİTİK_SAVUNMACI",
                "aksiyon": "Minimum seviyeye sulama yapılıyor",
                "aciliyet": "YÜKSEK",
                "detay": f"Toprak nemi %{mevcut_nem} kritik! Hava tahmini yağmur diyor ama "
                         f"ML modeline göre bu tarlaya geçmişte yağmur gelmemiş. "
                         f"Bitki korunması için sadece minimum seviyeye (%{min_nem}) sulanıyor. "
                         f"Yağmur gelirse fazla su harcanmamış olur.",
                "pompa": "MİNİMUM_DOZ",
                "sulama_hedef_nem": min_nem
            }
            ml_override = True
            ml_strateji = "SAVUNMACI"
        else:
            # ML güveniyorsa ya da yağmur yoksa → normal acil sulama
            karar = {
                "durum": "KRİTİK",
                "aksiyon": "ACİL SULAMA BAŞLATILDI",
                "aciliyet": "ÇOK YÜKSEK",
                "detay": f"Toprak nemi %{mevcut_nem} ile kritik sınırın (%{kritik_nem}) altında! "
                         f"Yağmur beklense bile bitki zarar görebilir, acil sulama yapılıyor.",
                "pompa": "AÇIK"
            }
    
    # SENARYO 2: DÜŞÜK NEM (min_moisture altında)
    elif mevcut_nem < min_nem:
        yagmur_bekleniyor = yagis_1_saat or yagis_3_saat or yagis_6_saat
        
        # ML güvenmiyorsa → savunmacı mod: kritik'e düşene kadar bekle, düşünce minimum'a sula
        if yagmur_bekleniyor and ml_sulama_karari == "GUVENME_SULA":
            ml_override = True
            ml_strateji = "SAVUNMACI"
            ml_aciklama = ml_tahmin.get("karar_aciklama", "") if isinstance(ml_tahmin, dict) else ""
            
            if mevcut_nem <= kritik_nem + 3:  # Kritik sınıra çok yakın
                karar = {
                    "durum": "SAVUNMACI_SULAMA",
                    "aksiyon": "Minimum seviyeye sulama yapılıyor",
                    "aciliyet": "YÜKSEK",
                    "detay": f"Toprak nemi %{mevcut_nem} kritik sınıra (%{kritik_nem}) çok yakın! "
                             f"Hava tahmini yağmur diyor ama ML bu tarlaya güvenmiyor. "
                             f"Bitki korunması için minimum seviyeye (%{min_nem}) sulanıyor, sonra durulacak. "
                             f"Yağmur gelirse kurtuluruz, gelmezse tekrar sulanır.",
                    "pompa": "MİNİMUM_DOZ",
                    "sulama_hedef_nem": min_nem
                }
            else:
                karar = {
                    "durum": "SAVUNMACI_BEKLEME",
                    "aksiyon": "Bekleniyor - kritik düşerse minimum sulanacak",
                    "aciliyet": "ORTA",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ve yağmur tahmini var ama ML güvenmiyor. "
                             f"Nem henüz kritik seviyeye (%{kritik_nem}) düşmedi. Bekleniyor. "
                             f"Kritik sınıra düşerse sadece minimum seviyeye (%{min_nem}) sulanacak.",
                    "pompa": "KAPALI"
                }
        
        # ML güveniyorsa (GUVEN_BEKLE) → mevcut erteleme mantığı aynen
        elif yagmur_bekleniyor and ml_sulama_karari == "GUVEN_BEKLE":
            if yagis_1_saat:
                karar = {
                    "durum": "SULAMA ERTELENDİ",
                    "aksiyon": "1 saat bekle, yağmur geliyor (ML onaylı)",
                    "aciliyet": "DÜŞÜK",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ama 1 saat içinde yağış bekleniyor. "
                             f"ML modeli de bu tarlada yağmurun gerçekleşeceğini doğruluyor. "
                             f"Doğal sulama için bekleniyor.",
                    "pompa": "KAPALI"
                }
            elif yagis_3_saat and mevcut_nem > kritik_nem + 5:
                ilk_yagis_saat = ilk_yagis["kac_saat_sonra"] if ilk_yagis else "?"
                karar = {
                    "durum": "SULAMA ERTELENDİ",
                    "aksiyon": f"{ilk_yagis_saat} saat sonra yağmur (ML onaylı)",
                    "aciliyet": "ORTA",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ama {ilk_yagis_saat} saat içinde yağış var. "
                             f"ML modeli bu tarlada yağmurun güvenilir olduğunu doğruluyor.",
                    "pompa": "KAPALI"
                }
            elif yagis_6_saat and mevcut_nem > kritik_nem + 10:
                ilk_yagis_saat = ilk_yagis["kac_saat_sonra"] if ilk_yagis else "?"
                karar = {
                    "durum": "KISMI SULAMA ÖNERİLİR",
                    "aksiyon": f"Hafif sulama, {ilk_yagis_saat} saat sonra yağmur (ML onaylı)",
                    "aciliyet": "ORTA",
                    "detay": f"Toprak kuru (%{mevcut_nem}), yağmur {ilk_yagis_saat} saat sonra. "
                             f"ML tahmine güveniyor, yarım doz sulama ile yağmura bırakılabilir.",
                    "pompa": "YARIM_DOZ"
                }
            else:
                karar = {
                    "durum": "SULAMA GEREKLİ",
                    "aksiyon": "Tam sulama başlatılıyor",
                    "aciliyet": "YÜKSEK",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ve yağmur beklenmiyor. "
                             f"Sulama pompası çalıştırılıyor.",
                    "pompa": "AÇIK"
                }
        
        # ML modeli yoksa veya yağmur yoksa → eski mantık
        else:
            if yagis_1_saat:
                karar = {
                    "durum": "SULAMA ERTELENDİ",
                    "aksiyon": "1 saat bekle, yağmur geliyor",
                    "aciliyet": "DÜŞÜK",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ama 1 saat içinde yağış bekleniyor. "
                             f"Doğal sulama için bekleniyor, su tasarrufu sağlanıyor.",
                    "pompa": "KAPALI"
                }
            elif yagis_3_saat and mevcut_nem > kritik_nem + 5:
                ilk_yagis_saat = ilk_yagis["kac_saat_sonra"] if ilk_yagis else "?"
                karar = {
                    "durum": "SULAMA ERTELENDİ",
                    "aksiyon": f"{ilk_yagis_saat} saat sonra yağmur bekleniyor",
                    "aciliyet": "ORTA",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ama {ilk_yagis_saat} saat içinde yağış var. "
                             f"Bitki bu süre dayanabilir, yağmur beklenecek.",
                    "pompa": "KAPALI"
                }
            elif yagis_6_saat and mevcut_nem > kritik_nem + 10:
                ilk_yagis_saat = ilk_yagis["kac_saat_sonra"] if ilk_yagis else "?"
                karar = {
                    "durum": "KISMI SULAMA ÖNERİLİR",
                    "aksiyon": f"Hafif sulama yap, {ilk_yagis_saat} saat sonra yağmur var",
                    "aciliyet": "ORTA",
                    "detay": f"Toprak kuru (%{mevcut_nem}), yağmur {ilk_yagis_saat} saat sonra. "
                             f"Yarım doz sulama yapılıp yağmura bırakılabilir.",
                    "pompa": "YARIM_DOZ"
                }
            else:
                karar = {
                    "durum": "SULAMA GEREKLİ",
                    "aksiyon": "Tam sulama başlatılıyor",
                    "aciliyet": "YÜKSEK",
                    "detay": f"Toprak kuru (%{mevcut_nem}) ve önümüzdeki {max_bekleme} saat yağış beklenmiyor. "
                             f"Sulama pompası çalıştırılıyor.",
                    "pompa": "AÇIK"
                }
    
    # SENARYO 3: AŞIRI NEM
    elif mevcut_nem > max_nem:
        karar = {
            "durum": "AŞIRI ISLAK",
            "aksiyon": "Sulama durduruldu",
            "aciliyet": "YOK",
            "detay": f"Toprak nemi %{mevcut_nem} ile üst sınırın (%{max_nem}) üzerinde. "
                     f"Aşırı sulama kök çürümesine neden olabilir!",
            "pompa": "KAPALI"
        }
    
    # SENARYO 4: İDEAL NEM
    else:
        karar = {
            "durum": "İDEAL",
            "aksiyon": "Sulama gerekmiyor",
            "aciliyet": "YOK",
            "detay": f"Toprak nemi %{mevcut_nem} ideal aralıkta (%{min_nem}-%{max_nem}).",
            "pompa": "KAPALI"
        }
    
    # F. SONUÇ RAPORU
    return {
        "tarla": {
            "id": field.id,
            "ad": field.name,
            "ilce": ilce,
            "konum_detay": konum
        },
        "bitki": {
            "ad": bitki.name,
            "kritik_nem": kritik_nem,
            "min_nem": min_nem,
            "max_nem": max_nem,
            "max_yagmur_bekleme_saat": max_bekleme
        },
        "sensor": {
            "anlik_nem": mevcut_nem,
            "olcum_zamani": last_log.timestamp.strftime("%d/%m/%Y %H:%M"),
            "sicaklik": last_log.temperature
        },
        "hava_durumu": {
            "konum": konum,
            "1_saat_icinde_yagis": yagis_1_saat,
            "3_saat_icinde_yagis": yagis_3_saat,
            "6_saat_icinde_yagis": yagis_6_saat,
            "ilk_yagis": ilk_yagis,
            "onumuzdeki_12_saat": saatlik
        },
        "karar": karar,
        "ml_tahmin": ml_tahmin,
        "ml_override": ml_override,
        "ml_strateji": ml_strateji,
        "zaman_damgasi": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }


# 3. TÜM TARLALAR İÇİN TOPLU KARAR
@router.get("/check-all-fields/{user_id}")
def check_all_fields(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının tüm tarlaları için sulama kararı verir"""
    
    fields = db.query(models.Field).filter(models.Field.owner_id == user_id).all()
    
    if not fields:
        return {"mesaj": "Bu kullanıcıya ait tarla bulunamadı."}
    
    sonuclar = []
    for field in fields:
        try:
            karar = check_irrigation_status(field.id, db)
            sonuclar.append({
                "tarla_id": field.id,
                "tarla_adi": field.name,
                "karar_ozeti": karar.get("karar", {}).get("durum", "BİLİNMİYOR"),
                "pompa": karar.get("karar", {}).get("pompa", "KAPALI"),
                "detay": karar.get("karar", {}).get("detay", "")
            })
        except Exception as e:
            sonuclar.append({
                "tarla_id": field.id,
                "tarla_adi": field.name,
                "karar_ozeti": "HATA",
                "pompa": "KAPALI",
                "detay": str(e)
            })
    
    return {
        "kullanici_id": user_id,
        "toplam_tarla": len(fields),
        "analiz_zamani": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "tarlalar": sonuclar
    }