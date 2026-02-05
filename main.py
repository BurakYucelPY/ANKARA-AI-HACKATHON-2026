from fastapi import FastAPI
import models
from database import engine
from routers import users, plants, simulation, weather # weather'ı buraya ekledik

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users.router)
app.include_router(plants.router)
app.include_router(simulation.router)
app.include_router(weather.router) # weather'ı buraya da ekledik

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem Canlı Hava Durumuyla Bağlantılı! 🚀"}