from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Veritabanı dosyasının adı
SQLALCHEMY_DATABASE_URL = "sqlite:///./akilli_sulama.db"

# 2. Motoru çalıştır (SQLite özel ayarı ile)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Oturum Yöneticisi
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. "Base" sınıfını BURADA yaratıyoruz.
Base = declarative_base()