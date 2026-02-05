# Wielka Studencka Batalla

Aplikacja webowa z grami i systemem użytkowników.

---

## 📖 Spis treści

1. [👥 Szybki start dla członków zespołu](#-szybki-start-dla-członków-zespołu)
2. [🚀 Szybki start - Supabase (Python lokalnie)](#-szybki-start---supabase-zalecane)
3. [🐳 Szybki start - Docker](#-szybki-start---docker)
4. [Technologie](#-technologie)
3. [Technologie](#-technologie)
4. [Funkcje](#-funkcje)
5. [Zarządzanie użytkownikami](#-zarządzanie-użytkownikami)
6. [Rozwiązywanie problemów](#-rozwiązywanie-problemów)
7. [API Dokumentacja](#-api-dokumentacja)
8. [Notatki dla zespołu](#-notatki-dla-zespołu)

---

## � Szybki start dla członków zespołu

**Masz już dostęp do projektu? Ta sekcja jest dla Ciebie!**

### 1. Sklonuj repo
```bash
git clone https://github.com/USER/inzynierka-basic.git
cd inzynierka-basic
```

### 2. Pobierz plik .env
**WAŻNE:** Plik `.env` NIE jest w repozytorium (zawiera hasła)!

Pobierz go z:
- Teams / Discord (kanał #dev)
- Zapytaj kolegę z zespołu
- Skontaktuj się z adminem projektu

Umieść plik `.env` w głównym katalogu projektu.

**Zawartość pliku .env (dla zespołu):**
```env
DATABASE_USER=postgres.eogfleacrxibjeobbxjr
DATABASE_PASSWORD=MenelBojowy2137?
DATABASE_HOST=aws-1-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
SECRET_KEY=twoj-sekret-klucz-zmien-to-na-produkcje

# Opcjonalnie - dla wysyłania emaili (resetowanie hasła):
# RESEND_API_KEY=re_twoj_klucz  
# (bez tego kody będą w alertach)
```

### 3. Zainstaluj i uruchom
```bash
# Stwórz środowisko
python -m venv .venv
.venv\Scripts\activate  # Windows
.venv\Scripts\activate

# Uruchom backend
uvicorn main:app --reload
```

### 4. Test
Otwórz `rejestracja/index.html` w przeglądarce i zarejestruj użytkownika.

✅ **Gotowe!**

---

## �🚀 Szybki start - Supabase (ZALECANE)

## 🚀 Szybki start - Supabase (ZALECANE)

**Używaj tej metody jeśli chcesz dane w chmurze (Supabase).**

### Krok 1: Zainstaluj Python
- Windows: https://www.python.org/downloads/
- ✅ Zaznacz "Add Python to PATH" podczas instalacji
- Sprawdź: `python --version` (minimum 3.12)

### Krok 2: Sklonuj projekt
```bash
git clone https://github.com/USER/inzynierka-basic.git
cd inzynierka-basic
```

### Krok 3: Stwórz i aktywuj środowisko wirtualne
```bash
# Stwórz:
python -m venv .venv

# Aktywuj (Windows):
python -m venv .venv

# Aktywuj (Linux/Mac):
source .venv/bin/activate
```

### Krok 4: Zainstaluj zależności
```bash
pip install -r requirements.txt
```

### Krok 5: Skonfiguruj połączenie z Supabase

**⚠️ WAŻNE:** Plik `.env` z hasłami NIE jest w repozytorium (bezpieczeństwo)!

```bash
# Skopiuj przykładowy plik:
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac
```

**Dla członków zespołu:** Pobierz plik `.env` z Teams/Discorda lub zapytaj o dane dostępowe.

**Dla innych:** Edytuj `.env` i wpisz swoje dane z Supabase:
```env
DATABASE_USER=postgres.TWOJ_PROJEKT_ID
DATABASE_PASSWORD=TWOJE_HASLO
DATABASE_HOST=aws-1-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
SECRET_KEY=wygeneruj-losowy-silny-klucz-32-znaki
```

### Krok 6: Uruchom backend
```bash
uvicorn main:app --reload
```

Powinieneś zobaczyć:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Krok 7: Otwórz frontend
- **Opcja A (Live Server w VSCode):** Kliknij PPM na `rejestracja/index.html` → "Open with Live Server"
- **Opcja B:** Otwórz plik `rejestracja/index.html` bezpośrednio w przeglądarce

✅ **Gotowe!** Dane zapisują się w Supabase!

---

## 🐳 Szybki start - Docker

**Docker również używa Supabase!** Wymaga pliku `.env`.

### Wymagania
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Plik `.env` z danymi Supabase (zobacz sekcję dla zespołu powyżej)

### Instalacja
```bash
# 1. Sklonuj projekt
git clone https://github.com/USER/inzynierka-basic.git
cd inzynierka-basic

# 2. Upewnij się że masz plik .env
# (pobierz od zespołu lub skopiuj z .env.example i uzupełnij)

# 3. Uruchom
docker-compose up
```

Czekaj aż zobaczysz:
```
inzynierka-backend | INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Dostęp
- **Frontend:** http://localhost:5500/rejestracja/
- **API Docs:** http://localhost:8000/docs

### Zatrzymanie
```bash
# W terminalu: Ctrl+C
# Lub:
docker-compose down
```

---

## 📊 Porównanie opcji

| Kryterium | Python lokalnie | Docker |
|-----------|-----------------|--------|
| **Baza danych** | Supabase (chmura) | Supabase (chmura) |
| **Wymaga .env** | ✅ TAK | ✅ TAK |
| **Setup** | ~5 minut | ~3 minuty |
| **Instalacja Pythona** | ✅ Wymagana | ❌ Nie trzeba |
| **Dla produkcji** | ✅ TAK | ✅ TAK |

---

## 📦 Technologie

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL/Supabase
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Autentykacja:** JWT tokens, Argon2 hashing
- **Deployment:** Docker, Docker Compose

## 📁 Struktura projektu

```
├── main.py              # API endpoints
├── database.py          # Konfiguracja bazy
├── models.py            # Modele SQLAlchemy
├── schemas.py           # Schematy Pydantic
├── auth.py              # Autentykacja JWT
├── requirements.txt     # Zależności Python
├── docker-compose.yml   # Konfiguracja Docker
├── rejestracja/         # Strona rejestracji
├── logowanie/           # Strona logowania
├── plansza/             # Dashboard użytkownika
└── kolko-i-krzyzyk/     # Gra kółko i krzyżyk
└── sudoku/              # Gra Sudoku
```

## 🎮 Funkcje

- ✅ Rejestracja i logowanie użytkowników
- ✅ **Resetowanie hasła** (z 6-cyfrowym kodem)
- ✅ JWT autentykacja
- ✅ Bezpieczne hashowanie haseł (Argon2)
- ✅ Gra: Kółko i krzyżyk
- ✅ Gra: Sudoku
- 🔄 System awatarów
- 🔄 Statystyki użytkownika

## 🔒 Bezpieczeństwo

- Hasła hashowane przy użyciu Argon2
- JWT tokens do autentykacji
- CORS skonfigurowany
- Walidacja danych wejściowych (Pydantic)
- Zmienne środowiskowe dla wrażliwych danych (.env)

## 📝 API Dokumentacja

Po uruchomieniu serwera, dokumentacja API dostępna pod:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 🛠️ Zarządzanie użytkownikami

### Dodaj testowych użytkowników
```bash
# Lokalnie (Python):
python add_test_users.py

# Docker:
docker exec -it inzynierka-backend python add_test_users.py
```

### Pokaż wszystkich użytkowników
```bash
# Lokalnie:
python add_test_users.py --show

# Docker:
docker exec -it inzynierka-backend python add_test_users.py --show
```

---

## 🐛 Rozwiązywanie problemów

### Port 8000 zajęty
```bash
# Zatrzymaj Docker:
docker-compose down

# Lub znajdź i zabij proces:
netstat -ano | findstr ":8000"
taskkill /PID NUMER_PID /F
```

### ModuleNotFoundError: psycopg2
```bash
pip install psycopg2-binary
```

### Błąd połączenia z bazą
- Sprawdź plik `.env` - czy dane są poprawne?
- Sprawdź Supabase - czy baza działa?
- Test połączenia: `python -c "from database import engine; engine.connect(); print('OK!')"`

### Frontend nie łączy się z backendem
- Backend musi być uruchomiony: http://localhost:8000
- Sprawdź konsolę przeglądarki (F12) - jakie błędy?
- Sprawdź CORS w `main.py`

### Docker: Przebuduj obraz
```bash
docker-compose build --no-cache
docker-compose up
```

---

## 📝 API Dokumentacja

Po uruchomieniu backendu:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🔧 Notatki dla zespołu

### ⚠️ BEZPIECZEŃSTWO - Plik .env

**NIE COMMITUJ pliku `.env` na GitHub!** 
- `.env` zawiera hasła i jest w `.gitignore`
- Udostępniaj plik `.env` prywatnie (Teams, Discord, szyfrowany)
- Każda osoba z zespołu musi mieć własną kopię `.env`

**Zasady dla zespołu:**
1. **NIE COMMITUJ `.env` na GitHub!** - Jest w `.gitignore`
2. **NIE WKLEJAJ haseł na czacie publicznym** - Używaj prywatnych wiadomości
3. **NIE ZMIENIAJ haseł bez powiadomienia** - Wszyscy muszą zaktualizować `.env`

### Przydatne komendy dla zespołu

**Backend:**
```bash
# Uruchom
uvicorn main:app --reload

# Sprawdź połączenie z bazą
python -c "from database import engine; engine.connect(); print('OK!')"
```

**Użytkownicy:**
```bash
# Dodaj testowych użytkowników
python add_test_users.py

# Pokaż wszystkich
python add_test_users.py --show
```

### Co zostało naprawione?

**Problem:** Dane nie zapisywały się do Supabase.

**Przyczyny:**
1. Brakowało sterownika `psycopg2-binary` ✅ NAPRAWIONE
2. Docker używał lokalnej bazy, nie Supabase

**Rozwiązanie:**
- ✅ `psycopg2-binary` dodane do `requirements.txt`
- ✅ Wszystko (Python i Docker) używa Supabase przez plik `.env`

### Kluczowe informacje

1. **Baza danych:** Tylko Supabase (w chmurze)
2. **Plik .env:** Wymagany zawsze (zawiera dane do Supabase)
3. Backend musi działać na porcie 8000
4. Frontend łączy się z `http://localhost:8000`

### Zmiana adresu IP (Docker, dostęp z innych komputerów)

1. Znajdź IP komputera: `ipconfig` (IPv4 Address)
2. W `rejestracja/index.html` zmień:
```javascript
const API_URL = 'http://TWOJE_IP:8000';  // zamiast localhost
```
3. Inny komputer może wejść: `http://TWOJE_IP:5500/rejestracja/`

---

## 📄 Licencja

Projekt edukacyjny © 2026

# Sprawdź typy
mypy .
```

## 📄 Licencja

Projekt edukacyjny
