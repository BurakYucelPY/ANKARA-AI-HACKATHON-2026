from fastapi import FastAPI
import models
from database import engine
from routers import users, plants, simulation # <-- simulation'ı ekledik

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users.router)
app.include_router(plants.router)
app.include_router(simulation.router) # <-- Buraya taktık

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem Tam Gaz! /docs adresine git."}