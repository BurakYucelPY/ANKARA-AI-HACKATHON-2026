from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import SessionLocal

router = APIRouter(prefix="/plant-types", tags=["Plants"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. BITKI EKLE
@router.post("/", response_model=schemas.PlantType)
def create_plant_type(plant: schemas.PlantTypeCreate, db: Session = Depends(get_db)):
    db_plant = db.query(models.PlantType).filter(models.PlantType.name == plant.name).first()
    if db_plant:
        raise HTTPException(status_code=400, detail="Bu bitki zaten ekli!")
        
    db_plant = models.PlantType(**plant.dict())
    db.add(db_plant)
    db.commit()
    db.refresh(db_plant)
    return db_plant

# 2. BITKILERI LISTELE
@router.get("/", response_model=List[schemas.PlantType])
def read_plant_types(db: Session = Depends(get_db)):
    return db.query(models.PlantType).all()