from database import engine, Base
from models import User
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
session = Session()

# Sprawdź wszystkich userów
users = session.query(User).all()
print(f"Użytkownicy w bazie: {len(users)}")
for user in users:
    print(f"  - Email: {user.email}, Username: {user.username}")

session.close()
