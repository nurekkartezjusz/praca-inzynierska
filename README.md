# Wielka Studencka Batalla

Aplikacja webowa z grami i systemem użytkowników.

---

## 📖 Spis treści

1. [👥 Szybki start dla członków zespołu](#-szybki-start-dla-członków-zespołu)
2. [🚀 Szybki start - Supabase](#-szybki-start---supabase-zalecane)
3. [🐳 Szybki start - Docker](#-szybki-start---docker)
4. [📦 Technologie](#-technologie)
5. [📁 Struktura projektu](#-struktura-projektu)
6. [🗄️ Migracje bazy danych](#️-migracje-bazy-danych-alembic)
7. [🎮 Funkcje](#-funkcje)
8. [🔒 Bezpieczeństwo](#-bezpieczeństwo)
9. [📝 API Dokumentacja](#-api-dokumentacja)
10. [🐛 Rozwiązywanie problemów](#-rozwiązywanie-problemów)
11. [🔧 Deployment](#-deployment)

---

## 👥 Szybki start dla członków zespołu

**Masz już dostęp do projektu? Ta sekcja jest dla Ciebie!**

### 1. Sklonuj repo
```bash
git clone https://github.com/nurekkartezjusz/praca-inzynierska.git
cd praca-inzynierska
```

### 2. Pobierz plik .env
**WAŻNE:** Plik `.env` NIE jest w repozytorium (zawiera hasła)!

Pobierz go z:
- Teams / Discord (kanał #dev)
- Zapytaj kolegę z zespołu
- Skontaktuj się z adminem projektu

Umieść plik `.env` w głównym katalogu projektu.

### 3. Zainstaluj i uruchom
```bash
# Stwórz środowisko
python -m venv .venv
.venv\Scripts\activate  # Windows
# Zainstaluj zależności
pip install -r backend/requirements.txt
# Uruchom backend (z głównego katalogu projektu)
uvicorn main:app --reload --app-dir backend
```

### 4. Test
Otwórz http://localhost:8000/rejestracja/ w przeglądarce i zarejestruj użytkownika.

✅ **Gotowe!**

---

## 🚀 Szybki start - Supabase (ZALECANE)

**Używaj tej metody jeśli chcesz dane w chmurze (Supabase).**

### Krok 1: Zainstaluj Python
- Windows: https://www.python.org/downloads/
- ✅ Zaznacz "Add Python to PATH" podczas instalacji
- Sprawdź: `python --version` (minimum 3.12)

### Krok 2: Sklonuj projekt
```bash
git clone https://github.com/nurekkartezjusz/praca-inzynierska.git
cd praca-inzynierska
```

### Krok 3: Stwórz i aktywuj środowisko wirtualne
```bash
# Stwórz:
python -m venv .venv

# Aktywuj (Windows):
.venv\Scripts\activate

# Aktywuj (Linux/Mac):
source .venv/bin/activate
```

### Krok 4: Zainstaluj zależności
```bash
pip install -r backend/requirements.txt
```

### Krok 5: Skonfiguruj połączenie z Supabase

**⚠️ WAŻNE:** Plik `.env` z hasłami NIE jest w repozytorium (bezpieczeństwo)!

**Dla członków zespołu:** Pobierz plik `.env` z Teams/Discorda lub zapytaj o dane dostępowe i umieść go w głównym katalogu projektu.

**Dla innych:** Utwórz w głównym katalogu projektu plik `.env` i wpisz swoje dane z Supabase:
```env
DATABASE_USER=postgres.TWOJ_PROJEKT_ID
DATABASE_PASSWORD=TWOJE_HASLO
DATABASE_HOST=aws-1-eu-central-1.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
SECRET_KEY=wygeneruj-losowy-silny-klucz-32-znaki
# Opcjonalnie - wysyłanie kodów resetu hasła przez Brevo:
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
```

### Krok 6: Uruchom backend
Z głównego katalogu projektu (aktywne `.venv`):
```bash
uvicorn main:app --reload --app-dir backend
```
(albo wejdź do `backend/` i uruchom `uvicorn main:app --reload`)

Powinieneś zobaczyć:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Krok 7: Otwórz aplikację
Frontend jest serwowany przez ten sam serwer FastAPI, więc nie trzeba osobnego serwera. Otwórz w przeglądarce:
- **Aplikacja:** http://localhost:8000/
- **Rejestracja:** http://localhost:8000/rejestracja/

> Pliku `rejestracja/index.html` nie otwieraj bezpośrednio z dysku — frontend wysyła zapytania pod `/api`, które działają tylko przez serwer.

✅ **Gotowe!** Dane zapisują się w Supabase!

---

## 🐳 Szybki start - Docker

**Docker również używa Supabase!** Wymaga pliku `.env`.

### Kiedy używać Dockera?
Do codziennej pracy wystarczy `uvicorn main:app --reload --app-dir backend` (szybszy start, auto-reload po zmianach w kodzie). Docker jest opcjonalny i przydaje się, gdy:
- nie masz lokalnie Pythona 3.12 i nie chcesz go instalować,
- chcesz sprawdzić, czy aplikacja działa tak samo jak na produkcji (Render buduje ten sam `Dockerfile`),
- chcesz odtworzyć błąd, który występuje tylko po wdrożeniu.

Kontener nie przeładowuje się po zmianach w kodzie, więc przy developmencie nie jest wygodny.

### Wymagania
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Plik `.env` z danymi Supabase (zobacz sekcję dla zespołu powyżej)

### Instalacja
```bash
# 1. Sklonuj projekt
git clone https://github.com/nurekkartezjusz/praca-inzynierska.git
cd praca-inzynierska

# 2. Upewnij się że masz plik .env (pobierz od zespołu)

# 3. Zbuduj obraz
docker build -t inzynierka-backend .

# 4. Uruchom kontener (plik .env nie trafia do obrazu, więc przekazujemy go przez --env-file)
docker run --name inzynierka-backend --env-file .env -p 8000:8000 inzynierka-backend
```

Czekaj aż zobaczysz:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Dostęp
Frontend i API są serwowane z jednego adresu przez FastAPI:
- **Aplikacja:** http://localhost:8000/
- **API Docs:** http://localhost:8000/docs

### Zatrzymanie
```bash
# W terminalu: Ctrl+C
# Lub z innego terminala:
docker stop inzynierka-backend

# Usunięcie kontenera (np. przed ponownym uruchomieniem z tą samą nazwą):
docker rm inzynierka-backend
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
├── backend/                 # Całe API i logika serwera (Python / FastAPI)
│   ├── main.py              # Tworzenie aplikacji, middleware, include_router, serwowanie frontend/
│   ├── dependencies.py      # Zależności FastAPI (get_current_user, get_db)
│   ├── database.py          # Konfiguracja połączenia z Supabase (czyta ../.env)
│   ├── models.py            # Modele SQLAlchemy (User, Friendship, GameInvitation)
│   ├── schemas.py           # Schematy Pydantic
│   ├── security.py          # JWT + hashowanie haseł
│   ├── requirements.txt     # Zależności Python
│   ├── alembic.ini          # Konfiguracja Alembic
│   ├── alembic/
│   │   ├── env.py           # Konfiguracja środowiska migracji
│   │   └── versions/        # Wygenerowane pliki migracji
│   ├── game/
│   │   ├── rules.py         # Plansza i stałe reguły gry
│   │   ├── engine.py        # Serwerowy silnik, ruchy i fazy gry
│   │   ├── fields.py        # Efekty pól planszy
│   │   ├── service.py       # Sesje gier
│   │   ├── bot.py           # Decyzje bota
│   │   └── questions.json   # Pytania, warianty odpowiedzi i klucze; tu edytuj quiz
│   ├── routers/
│   │   ├── auth.py          # Endpointy: rejestracja, logowanie, reset hasła
│   │   ├── profile.py       # Endpointy: /me, awatar, profil, usunięcie konta
│   │   ├── friends.py       # Endpointy: znajomi i wyszukiwanie użytkowników
│   │   ├── game_invitations.py  # Endpointy: zaproszenia do gier
│   │   └── game_ws.py           # WebSocket gry multiplayer i gry z botem
│   └── tests/               # Testy jednostkowe (unittest)
├── frontend/                # Statyczny frontend (HTML/CSS/JS), serwowany przez backend
│   ├── index.html           # Strona główna
│   ├── css/, js/, images/, karty/, favicon/   # Zasoby wspólne
│   ├── rejestracja/         # Strona rejestracji
│   ├── logowanie/           # Strona logowania
│   ├── haslo/               # Resetowanie hasła
│   ├── plansza/             # Dashboard użytkownika i plansza gry
│   ├── znajomi/             # System znajomych i zaproszeń do gier
│   ├── statystyki/          # Profil i statystyki użytkownika
│   ├── uczelnia/            # Strona uczelni
│   ├── regulamin/           # Regulamin
│   ├── zasady/              # Zasady gry
│   └── wybor awatara/       # Kreator awatara
├── Dockerfile               # Konfiguracja Docker
└── .env                     # Sekrety (poza repozytorium)
```

Adresy URL odpowiadają zawartości `frontend/` (np. `frontend/plansza/` → `http://localhost:8000/plansza/`). Pliki z `backend/` i `.env` nie są publiczne.

### Testy
```bash
cd backend
python -m unittest discover -s tests
```

---

## 🗄️ Migracje bazy danych (Alembic)

Alembic śledzi zmiany w `backend/models.py` i aktualizuje rzeczywistą bazę danych w Supabase tak, żeby była zgodna z kodem.

> Wszystkie komendy Alembic uruchamiaj **z katalogu `backend/`** (`cd backend`), przy aktywnym `.venv`.

### Kiedy używać?

Zawsze gdy zmienisz coś w `models.py` — dodasz kolumnę, zmienisz typ danych, dodasz constraint itp.

### Przepływ pracy

**1. Wprowadź zmiany w `models.py`**

**2. Wygeneruj plik migracji** (Alembic porównuje modele z bazą i tworzy SQL):
```bash
python -m alembic revision --autogenerate -m "opis_zmiany"
```
Np.:
```bash
python -m alembic revision --autogenerate -m "dodaj_kolumne_avatar"
```

**3. Przejrzyj wygenerowany plik** w `backend/alembic/versions/` — sprawdź czy SQL wygląda poprawnie.

**4. Zastosuj migrację na bazie:**
```bash
python -m alembic upgrade head
```

### Cofanie migracji

Cofnij ostatnią migrację (wykonuje funkcję `downgrade` z pliku migracji):
```bash
python -m alembic downgrade -1
```

Cofnij do konkretnej wersji (ID z nazwy pliku w `backend/alembic/versions/`):
```bash
python -m alembic downgrade abc123def456
```

### Inne przydatne komendy

```bash
# Sprawdź aktualną wersję bazy
python -m alembic current

# Zobacz historię migracji
python -m alembic history
```

> **Uwaga:** Migracje zmieniają rzeczywistą bazę w Supabase. Zawsze sprawdź wygenerowany plik przed `upgrade head`.

## 🎮 Funkcje

- ✅ Rejestracja i logowanie użytkowników
- ✅ Resetowanie hasła (6-cyfrowy kod przez email, Brevo)
- ✅ JWT autentykacja
- ✅ Bezpieczne hashowanie haseł (Argon2)
- ✅ System znajomych (dodawanie, akceptacja, odrzucanie)
- ✅ Zaproszenia do gier (Wielka Studencka Batalla)
- ✅ Kreator awatara
- ✅ Profil użytkownika i statystyki
- 🔄 Wielka Studencka Batalla (w rozwoju)

## 🔒 Bezpieczeństwo

- Hasła hashowane przy użyciu Argon2
- JWT tokens do autentykacji
- CORS ograniczony do listy dozwolonych originów (localhost)
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
pip install -r backend/requirements.txt
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
DATABASE_USER=postgres.TWOJ_PROJECT_ID
DATABASE_PASSWORD=...
DATABASE_HOST=TWOJ_HOST_SUPABASE
DATABASE_PORT=5432
DATABASE_NAME=postgres
SECRET_KEY=...
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
```

### Podsumowanie architektury

- **Frontend i Backend:** Serwowane z jednej domeny przez FastAPI
- **API:** Dostępne pod ścieżką `/api/*`
- **Statyczne pliki:** Serwowane przez FastAPI StaticFiles
- **CORS:** Ograniczony do listy dozwolonych originów (localhost), patrz `main.py`

---

## Licencja

Projekt edukacyjny © 2026