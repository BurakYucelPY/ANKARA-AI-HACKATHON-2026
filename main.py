from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import models
import logging
from database import engine, SessionLocal
from routers import users, plants, simulation, weather
from routers import prediction as prediction_router
from ml.predictor import predict_rain_from_db, get_all_models_status
from apscheduler.schedulers.background import BackgroundScheduler

models.Base.metadata.create_all(bind=engine)

# ml_models klasörünü oluştur
from pathlib import Path
(Path(__file__).parent / "ml_models").mkdir(exist_ok=True)

logger = logging.getLogger("scheduler")

# ============================================================
# SAATLİK OTOMATİK TAHMİN CRON JOB
# ============================================================
def hourly_rain_check():
    """Saatte bir tüm tarlalar için hava tahmini doğrulama yapar ve akıllı bildirimler oluşturur."""
    db = SessionLocal()
    try:
        import datetime
        fields = db.query(models.Field).all()
        for field in fields:
            try:
                result = predict_rain_from_db(db, field.id)
                sulama_karari = result.get("sulama_karari", "")
                owner_id = field.owner_id
                
                if not owner_id:
                    continue
                
                mesaj = None
                if sulama_karari == "GUVENME_SULA":
                    mesaj = f"\u26a0\ufe0f {field.name}: Hava tahmini ya\u011fmur diyor ama ge\u00e7mi\u015f veriye g\u00f6re bu tarlaya gelmeyebilir. Savunmac\u0131 sulama modunda."
                elif sulama_karari == "GUVEN_BEKLE":
                    mesaj = f"\ud83c\udf27\ufe0f {field.name}: Ya\u011fmur tahmini g\u00fcvenilir, sulama ertelendi."
                elif sulama_karari == "DIKKAT_SURPRIZ":
                    mesaj = f"\ud83e\udd14 {field.name}: Beklenmeyen ya\u011fmur olas\u0131l\u0131\u011f\u0131 var, dikkat!"
                
                if mesaj:
                    bildirim = models.Notification(
                        user_id=owner_id,
                        message=mesaj,
                        created_at=datetime.datetime.now(),
                        is_read=False,
                    )
                    db.add(bildirim)
                
            except Exception as e:
                logger.warning(f"Tarla {field.id} tahmin hatas\u0131: {e}")
        
        db.commit()
        logger.info(f"Saatlik hava tahmini do\u011frulama tamamland\u0131: {len(fields)} tarla")
    except Exception as e:
        logger.error(f"Saatlik kontrol hatas\u0131: {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(hourly_rain_check, 'interval', hours=1, id='hourly_rain_check')


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.start()
    logger.info("⏰ Saatlik yağmur tahmin scheduler başlatıldı")
    yield
    # Shutdown
    scheduler.shutdown()
    logger.info("⏰ Scheduler durduruldu")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(plants.router)
app.include_router(simulation.router)
app.include_router(weather.router)
app.include_router(prediction_router.router)

@app.get("/")
def ana_sayfa():
    return {
        "mesaj": "Akıllı Sulama Sistemi + ML Hava Tahmini Doğrulama Aktif! 🚀🧠",
        "ml_modelleri": get_all_models_status(),
    }