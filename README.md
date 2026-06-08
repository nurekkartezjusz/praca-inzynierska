# Wielka Studencka Batalla

Aplikacja webowa z grami i systemem użytkowników.

---

## 📖 Spis treści

1. [👥 Szybki start](#-szybki-start)
2. [📦 Technologie](#-technologie)
3. [🎮 Funkcje](#-funkcje)
4. [🔒 Bezpieczeństwo](#-bezpieczeństwo)
5. [📝 API Dokumentacja](#-api-dokumentacja)
6. [🐛 Rozwiązywanie problemów](#-rozwiązywanie-problemów)
7. [🔧 Deployment](#-deployment)

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
- **Autentykacja:** JWT tokens (Bearer), Argon2 hashing
- **Migracje:** Alembic
- **Deployment:** Docker na Render.com
- **Baza danych:** Supabase PostgreSQL

## 📁 Struktura projektu

```
├── main.py              # Tworzenie aplikacji, middleware, include_router
├── dependencies.py      # Zależności FastAPI (get_current_user, get_db)
├── database.py          # Konfiguracja połączenia z Supabase
├── models.py            # Modele SQLAlchemy (User, Friendship, GameInvitation)
├── schemas.py           # Schematy Pydantic
├── auth.py              # JWT + hashowanie haseł
├── requirements.txt     # Zależności Python
├── Dockerfile           # Konfiguracja Docker
├── alembic.ini          # Konfiguracja Alembic
├── alembic/
│   ├── env.py           # Konfiguracja środowiska migracji
│   └── versions/        # Wygenerowane pliki migracji
├── routers/
│   ├── auth.py          # Endpointy: rejestracja, logowanie, reset hasła
│   ├── profile.py       # Endpointy: /me, awatar, profil, usunięcie konta
│   ├── friends.py       # Endpointy: znajomi i wyszukiwanie użytkowników
│   └── game_invitations.py  # Endpointy: zaproszenia do gier
├── index.html           # Strona główna
├── rejestracja/         # Strona rejestracji
├── logowanie/           # Strona logowania
├── haslo/               # Resetowanie hasła
├── plansza/             # Dashboard użytkownika
├── znajomi/             # System znajomych i zaproszeń do gier
├── statystyki/          # Profil i statystyki użytkownika
├── wybor awatara/       # Kreator awatara
├── kolko-i-krzyzyk/     # Gra kółko i krzyżyk
└── sudoku/              # Gra Sudoku
```

---

## 🗄️ Migracje bazy danych (Alembic)

Alembic śledzi zmiany w `models.py` i aktualizuje rzeczywistą bazę danych w Supabase tak, żeby była zgodna z kodem.

### Kiedy używać?

Zawsze gdy zmienisz coś w `models.py` — dodasz kolumnę, zmienisz typ danych, dodasz constraint itp.

### Przepływ pracy

**1. Wprowadź zmiany w `models.py`**

**2. Wygeneruj plik migracji** (Alembic porównuje modele z bazą i tworzy SQL):
```bash
.venv\Scripts\python -m alembic revision --autogenerate -m "opis_zmiany"
```
Np.:
```bash
.venv\Scripts\python -m alembic revision --autogenerate -m "dodaj_kolumne_avatar"
```

**3. Przejrzyj wygenerowany plik** w `alembic/versions/` — sprawdź czy SQL wygląda poprawnie.

**4. Zastosuj migrację na bazie:**
```bash
.venv\Scripts\python -m alembic upgrade head
```

### Cofanie migracji

Cofnij ostatnią migrację (wykonuje funkcję `downgrade` z pliku migracji):
```bash
.venv\Scripts\python -m alembic downgrade -1
```

Cofnij do konkretnej wersji (ID z nazwy pliku w `alembic/versions/`):
```bash
.venv\Scripts\python -m alembic downgrade abc123def456
```

### Inne przydatne komendy

```bash
# Sprawdź aktualną wersję bazy
.venv\Scripts\python -m alembic current

# Zobacz historię migracji
.venv\Scripts\python -m alembic history
```

> **Uwaga:** Migracje zmieniają rzeczywistą bazę w Supabase. Zawsze sprawdź wygenerowany plik przed `upgrade head`.

## 🎮 Funkcje

- ✅ Rejestracja i logowanie użytkowników
- ✅ Resetowanie hasła (6-cyfrowy kod przez email)
- ✅ JWT autentykacja
- ✅ Bezpieczne hashowanie haseł (Argon2)
- ✅ System znajomych (dodawanie, akceptacja, odrzucanie)
- ✅ Zaproszenia do gier (Wielka Studencka Batalla, Kółko i krzyżyk, Sudoku)
- ✅ Kreator awatara
- ✅ Profil użytkownika i statystyki
- ✅ Gra: Kółko i krzyżyk
- ✅ Gra: Sudoku
- 🔄 Wielka Studencka Batalla (w rozwoju)

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



## 🐛 Rozwiązywanie problemów

### Port 8000 zajęty
```bash
# Znajdź i zabij proces:
netstat -ano | findstr ":8000"
taskkill /PID NUMER_PID /F
```

### ModuleNotFoundError
```bash
# Upewnij się, że środowisko jest aktywowane:
.venv\Scripts\activate

# Przeinstaluj zależności:
pip install -r requirements.txt
```

### Błąd połączenia z bazą
- Sprawdź plik `.env` - czy dane są poprawne?
- Sprawdź Supabase - czy baza działa?
- Test połączenia: `python -c "from database import engine; engine.connect(); print('OK!')"`

### Frontend nie łączy się z backendem
- Backend musi być uruchomiony
- Sprawdź konsolę przeglądarki (F12)
- Sprawdź czy `API_URL` w plikach frontend jest ustawiony na `/api`

---

## 📝 API Dokumentacja

Po uruchomieniu backendu:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🔧 Deployment

### Produkcja (Render.com)

Aplikacja jest wdrożona na Render.com:
- **URL:** https://wielka-studencka-batalia.onrender.com
- **Deployment:** Automatyczny z GitHub (branch: main)
- **Docker:** Tak (używa Dockerfile)
- **Baza danych:** Supabase PostgreSQL
- **Free Tier:** Serwis usypia po 15 min nieaktywności (cold start ~30s)

### Zmienne środowiskowe na Render

W dashboard Render dodaj te zmienne:
```
DATABASE_USER=postgres.eogfleacrxibjeobbxjr
DATABASE_PASSWORD=...
DATABASE_HOST=aws-1-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
SECRET_KEY=...
RESEND_API_KEY=...
```

### Podsumowanie architektury

- **Frontend i Backend:** Serwowane z jednej domeny przez FastAPI
- **API:** Dostępne pod ścieżką `/api/*`
- **Statyczne pliki:** Serwowane przez FastAPI StaticFiles
- **CORS:** Skonfigurowany dla wszystkich originów (development)

### ⚠️ BEZPIECZEŃSTWO

**NIE COMMITUJ pliku `.env` na GitHub!**
- `.env` zawiera hasła i jest w `.gitignore`
- Zmienne produkcyjne dodaj bezpośrednio w Render Dashboard

---

## 📄 Licencja

Projekt edukacyjny © 2026
