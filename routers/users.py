from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import hashlib
from typing import List
import models, schemas
from database import SessionLocal

# Router tanımlıyoruz (app yerine router kullanacağız)
router = APIRouter(prefix="/users", tags=["Users & Fields"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password: str) -> str:
    """Basit SHA256 hash - production'da bcrypt kullanılmalı"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Şifre doğrulama"""
    return get_password_hash(plain_password) == hashed_password

# --- ENDPOINTLER ---

# 0. KULLANICI GİRİŞİ
@router.post("/login", response_model=schemas.User)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if not verify_password(credentials.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Şifre hatalı")
    return db_user

# 1. KULLANICI KAYDI
@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı!")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# 2. TARLA EKLE (Dikkat: prefix zaten /users olduğu için burası /{id}/fields oldu)
@router.post("/{user_id}/fields/", response_model=schemas.Field)
def create_field_for_user(user_id: int, field: schemas.FieldCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    db_field = models.Field(**field.dict(), owner_id=user_id)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

# 3. TARLALARI LISTELE
@router.get("/{user_id}/fields/", response_model=List[schemas.Field])
def read_user_fields(user_id: int, db: Session = Depends(get_db)):
    fields = db.query(models.Field).filter(models.Field.owner_id == user_id).all()
    return fields

# 4. TARLA BİTKİ TÜRÜNÜ GÜNCELLE
@router.put("/{user_id}/fields/{field_id}/plant-type", response_model=schemas.Field)
def update_field_plant_type(
    user_id: int,
    field_id: int,
    update_data: schemas.FieldUpdatePlantType,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    field = db.query(models.Field).filter(
        models.Field.id == field_id,
        models.Field.owner_id == user_id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Tarla bulunamadı")
    
    plant_type = db.query(models.PlantType).filter(
        models.PlantType.id == update_data.plant_type_id
    ).first()
    if not plant_type:
        raise HTTPException(status_code=404, detail="Geçersiz bitki türü")
    
    field.plant_type_id = update_data.plant_type_id
    db.commit()
    db.refresh(field)
    return field