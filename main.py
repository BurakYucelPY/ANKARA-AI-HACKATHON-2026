from fastapi import FastAPI
import models
from database import engine
from routers import users, plants # Yeni oluşturduğumuz dosyaları çağırıyoruz

# Tabloları oluştur
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Routerları (parçaları) ana sisteme takıyoruz
app.include_router(users.router)
app.include_router(plants.router)

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem Modüler Halde Çalışıyor! /docs adresine git."}