from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import List
import models, schemas
from database import SessionLocal

# Router tanımlıyoruz (app yerine router kullanacağız)
router = APIRouter(prefix="/users", tags=["Users & Fields"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password):
    return pwd_context.hash(password)

# --- ENDPOINTLER ---

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