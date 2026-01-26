from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Załaduj zmienne z .env
load_dotenv()

# PostgreSQL connection string
# Pobierz zmienne z .env lub użyj domyślnych
db_user = os.getenv("DATABASE_USER", "postgres")
db_password = os.getenv("DATABASE_PASSWORD", "postgres")
db_host = os.getenv("DATABASE_HOST", "localhost")
db_port = os.getenv("DATABASE_PORT", "5432")
db_name = os.getenv("DATABASE_NAME", "inzynierka_db")

DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
