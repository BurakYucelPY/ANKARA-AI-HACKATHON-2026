from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import models, schemas
from database import SessionLocal

router = APIRouter(prefix="/plant-types", tags=["Plants"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. BITKI EKLE
@router.post("/", response_model=schemas.PlantType)
def create_plant_type(plant: schemas.PlantTypeCreate, db: Session = Depends(get_db)):
    db_plant = db.query(models.PlantType).filter(models.PlantType.name == plant.name).first()
    if db_plant:
        raise HTTPException(status_code=400, detail="Bu bitki zaten ekli!")
        
    db_plant = models.PlantType(**plant.dict())
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    return db_plant

# 2. BITKILERI LISTELE
@router.get("/", response_model=List[schemas.PlantType])
def read_plant_types(db: Session = Depends(get_db)):
    return db.query(models.PlantType).all()

# 3. TOHUM VERİLERİ - Araştırılmış gerçek tarımsal bilgilerle bitkileri yükle
SEED_PLANTS = [
    {
        "name": "Domates",
        "min_moisture": 30.0,
        "max_moisture": 70.0,
        "critical_moisture": 10.0,
        "max_wait_hours": 6,
        "icon": "🍅",
        "category": "Sebze",
        "planting_time": "Nisan-Mayıs (Fide)",
        "harvest_time": "Temmuz-Eylül",
        "water_need": "Yüksek",
        "water_amount": "600-800 mm/sezon",
        "soil_type": "Organik maddece zengin, drenajlı",
        "ideal_temp": "20-30°C",
        "tips": json.dumps([
            "Düzenli sulama önemlidir, ani değişikliklerden kaçının",
            "Destekleme/çapalama yapılmalıdır",
            "Yaprakları ıslatmadan dipten sulayın",
            "Sıcaklık 10°C altına düştüğünde büyüme durur"
        ], ensure_ascii=False)
    },
    {
        "name": "Buğday",
        "min_moisture": 25.0,
        "max_moisture": 60.0,
        "critical_moisture": 12.0,
        "max_wait_hours": 12,
        "icon": "🌾",
        "category": "Tahıl",
        "planting_time": "Ekim-Kasım (Kışlık) / Mart-Nisan (Yazlık)",
        "harvest_time": "Haziran-Temmuz",
        "water_need": "Orta",
        "water_amount": "400-600 mm/sezon",
        "soil_type": "Derin, verimli, tınlı-killi toprak",
        "ideal_temp": "15-25°C",
        "tips": json.dumps([
            "Kışlık buğday 4°C altında uzun bir dormant dönem gerektirir",
            "32°C üzeri sıcaklıklarda verim önemli ölçüde düşer",
            "Azotlu gübre kullanımı verimi artırır",
            "Hasat zamanı tanenin nem oranı %13-14 olmalıdır"
        ], ensure_ascii=False)
    },
    {
        "name": "Kapya Biber",
        "min_moisture": 35.0,
        "max_moisture": 70.0,
        "critical_moisture": 15.0,
        "max_wait_hours": 6,
        "icon": "🌶️",
        "category": "Sebze",
        "planting_time": "Mayıs-Haziran (Fide)",
        "harvest_time": "Ağustos-Ekim",
        "water_need": "Orta-Yüksek",
        "water_amount": "500-700 mm/sezon",
        "soil_type": "Kumlu-tınlı, organik maddece zengin",
        "ideal_temp": "20-30°C",
        "tips": json.dumps([
            "Soğuğa karşı hassastır, don tehlikesinden korunmalı",
            "Düzenli hasat verimi artırır",
            "Damla sulama tercih edilmelidir",
            "Meyve çürüklüğüne karşı havalandırma önemlidir"
        ], ensure_ascii=False)
    },
    {
        "name": "Patates",
        "min_moisture": 35.0,
        "max_moisture": 65.0,
        "critical_moisture": 15.0,
        "max_wait_hours": 4,
        "icon": "🥔",
        "category": "Yumru",
        "planting_time": "Mart-Nisan",
        "harvest_time": "Haziran-Ağustos",
        "water_need": "Orta-Yüksek",
        "water_amount": "500-700 mm/sezon",
        "soil_type": "Hafif, kumlu, iyi drenajlı",
        "ideal_temp": "15-22°C",
        "tips": json.dumps([
            "Yumru oluşum döneminde düzenli sulama şart",
            "Boğaz doldurma işlemi yapılmalıdır",
            "Mildiyö hastalığına dikkat edilmelidir",
            "Hasat sonrası 2 hafta karanlıkta bekletilmelidir"
        ], ensure_ascii=False)
    },
    {
        "name": "Soğan",
        "min_moisture": 25.0,
        "max_moisture": 55.0,
        "critical_moisture": 12.0,
        "max_wait_hours": 8,
        "icon": "🧅",
        "category": "Sebze",
        "planting_time": "Şubat-Mart veya Eylül-Ekim",
        "harvest_time": "Haziran-Ağustos",
        "water_need": "Düşük-Orta",
        "water_amount": "350-500 mm/sezon",
        "soil_type": "Kumlu-tınlı, iyi drenajlı",
        "ideal_temp": "13-24°C",
        "tips": json.dumps([
            "Hasattan 2-3 hafta önce sulama kesilmeli",
            "Yabancı ot kontrolü önemlidir",
            "Soğan yaprakları sararıp devrildiğinde hasat zamanıdır",
            "İyi havalandırılmış yerde kurutulmalıdır"
        ], ensure_ascii=False)
    },
    {
        "name": "Mısır",
        "min_moisture": 35.0,
        "max_moisture": 70.0,
        "critical_moisture": 15.0,
        "max_wait_hours": 4,
        "icon": "🌽",
        "category": "Tahıl",
        "planting_time": "Nisan-Mayıs",
        "harvest_time": "Ağustos-Eylül",
        "water_need": "Yüksek",
        "water_amount": "500-800 mm/sezon",
        "soil_type": "Derin, verimli, tınlı toprak",
        "ideal_temp": "18-30°C",
        "tips": json.dumps([
            "Çiçeklenme (tepe püskülü) döneminde su çok kritiktir",
            "10°C altında büyüme neredeyse durur",
            "Azot ihtiyacı yüksektir, özellikle ilk 8 haftada",
            "Sığ kök yapısı nedeniyle kuraklığa hassastır"
        ], ensure_ascii=False)
    },
    {
        "name": "Çilek",
        "min_moisture": 40.0,
        "max_moisture": 70.0,
        "critical_moisture": 20.0,
        "max_wait_hours": 3,
        "icon": "🍓",
        "category": "Meyve",
        "planting_time": "Eylül-Ekim veya Mart-Nisan (Fide)",
        "harvest_time": "Mayıs-Haziran",
        "water_need": "Yüksek",
        "water_amount": "500-700 mm/sezon",
        "soil_type": "Hafif asidik (pH 5.5-6.5), organik zengin, iyi drenajlı",
        "ideal_temp": "15-26°C",
        "tips": json.dumps([
            "Sık ve düzenli sulama gerektirir, kurakllığa çok hassas",
            "Malçlama ile meyvelerin toprakla temasını önleyin",
            "Damla sulama en ideal yöntemdir",
            "Meyveler sabah erken saatte toplanmalıdır"
        ], ensure_ascii=False)
    },
    {
        "name": "Ayçiçeği",
        "min_moisture": 25.0,
        "max_moisture": 55.0,
        "critical_moisture": 10.0,
        "max_wait_hours": 10,
        "icon": "🌻",
        "category": "Yağlı Tohum",
        "planting_time": "Nisan-Mayıs",
        "harvest_time": "Ağustos-Eylül",
        "water_need": "Orta",
        "water_amount": "400-500 mm/sezon",
        "soil_type": "Her türlü verimli toprakta yetişir, iyi drenajlı",
        "ideal_temp": "18-28°C",
        "tips": json.dumps([
            "Derin kök sistemi sayesinde kuraklığa dayanıklıdır",
            "Kuş hasarına karşı koruma önlemi alınmalıdır",
            "Ekim nöbetiyle birlikte yetiştirilmelidir",
            "Tabla kurumaya başladığında hasat zamanıdır"
        ], ensure_ascii=False)
    },
]

@router.post("/seed")
def seed_plant_types(db: Session = Depends(get_db)):
    """Veritabanına araştırılmış gerçek bitki verilerini yükler."""
    added = []
    skipped = []
    for plant_data in SEED_PLANTS:
        existing = db.query(models.PlantType).filter(models.PlantType.name == plant_data["name"]).first()
        if existing:
            # Güncelle
            for key, value in plant_data.items():
                setattr(existing, key, value)
            db.commit()
            skipped.append(plant_data["name"])
        else:
            db_plant = models.PlantType(**plant_data)
            db.add(db_plant)
            db.commit()
            added.append(plant_data["name"])
    
    return {
        "mesaj": f"{len(added)} bitki eklendi, {len(skipped)} bitki güncellendi.",
        "eklenen": added,
        "guncellenen": skipped,
        "toplam": len(SEED_PLANTS)
    }