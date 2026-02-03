from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Załaduj zmienne z .env (zawsze z katalogu projektu)
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=dotenv_path)

# PostgreSQL connection string
# Pobierz zmienne z .env lub użyj domyślnych
db_user = os.getenv("DATABASE_USER", "postgres")
db_password_raw = os.getenv("DATABASE_PASSWORD", "postgres")
db_password = quote_plus(db_password_raw)
db_host = os.getenv("DATABASE_HOST", "localhost")
db_port = os.getenv("DATABASE_PORT", "5432")
db_name = os.getenv("DATABASE_NAME", "inzynierka_db")

DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "connect_timeout": 10,
        "sslmode": "require",
        "options": "-c client_encoding=UTF8"
    },
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
