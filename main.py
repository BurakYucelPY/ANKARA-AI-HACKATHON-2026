from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import models, schemas
from database import SessionLocal, engine

# Tabloları oluştur (Garanti olsun)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Şifreleme ayarı
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Veritabanı Oturumu (Her istekte açılır, iş bitince kapanır)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Şifre Hashleme Fonksiyonu
def get_password_hash(password):
    return pwd_context.hash(password)

# --- ENDPOINTLER (UÇLAR) ---

@app.get("/")
def ana_sayfa():
    return {"mesaj": "Sistem Aktif! /docs adresine gidip test edebilirsin."}

# 1. KULLANICI KAYDI (REGISTER)
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Email kontrolü: Bu email ile kayıtlı biri var mı?
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı!")
    
    # 2. Şifreyi şifrele (Hash)
    hashed_password = get_password_hash(user.password)
    
    # 3. Yeni kullanıcıyı hazırla
    db_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    
    # 4. Veritabanına kaydet
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user