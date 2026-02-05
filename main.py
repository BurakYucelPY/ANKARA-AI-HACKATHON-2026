from fastapi import FastAPI
import models
from database import engine

# models.py içindeki tabloları al, veritabanında oluştur diyoruz.
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem çalışıyor, veritabanı kontrol edildi!"}