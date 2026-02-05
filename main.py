from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem çalışıyor, tarlalar güvende!"}