from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import users, plants, simulation, weather

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(plants.router)
app.include_router(simulation.router)
app.include_router(weather.router) # weather'ı buraya da ekledik

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem Canlı Hava Durumuyla Bağlantılı! 🚀"}