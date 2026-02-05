from fastapi import APIRouter
import requests

router = APIRouter(prefix="/weather", tags=["Weather Integration"])

@router.get("/current")
def get_real_weather():
    # Ankara'nın koordinatları: Enlem 39.93, Boylam 32.85
    url = "https://api.open-meteo.com/v1/forecast?latitude=39.93&longitude=32.85&current_weather=true"
    
    # İnternete çıkıp veriyi çekiyoruz
    response = requests.get(url)
    data = response.json()
    
    # Gelen karışık veriden lazım olanları ayıklıyoruz
    current = data.get("current_weather", {})
    temp = current.get("temperature")
    weather_code = current.get("weathercode") # 0: Açık, 51-67: Yağmurlu
    
    # Basit bir kontrol: Kod 50'den büyükse dışarıda yağış var demektir
    is_raining = True if weather_code and weather_code > 50 else False
    
    return {
        "location": "Ankara",
        "current_temp": temp,
        "is_it_raining": is_raining,
        "condition_code": weather_code
    }