# Wielka Studencka Batalla - Setup z Docker'em

Instrukcja jak uruchomić aplikację na nowym komputerze.

## Wymagania
- **Docker Desktop** (pobierz z https://www.docker.com/products/docker-desktop)
- To wszystko! Nie trzeba Pythona, PostgreSQL itp.

## Instalacja

### 1. Zainstaluj Docker Desktop
Pobierz i zainstaluj z: https://www.docker.com/products/docker-desktop

Uruchom Docker Desktop (będzie ikona w zasobniku).

### 2. Pobierz projekt
```bash
git clone https://github.com/USER/inzynierka-basic.git
cd inzynierka-basic
```

Lub rozpakuj folder ZIP jeśli nie masz git'a.

### 3. Uruchom aplikację
```bash
docker-compose up
```

To wszystko! Docker automatycznie:
- Ściąga PostgreSQL
- Instaluje Python i zależności
- Uruchamia API na porcie 8000
- Uruchamia frontend na porcie 5500

Czekaj aż zobaczysz:
```
inzynierka-backend | INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Jak używać aplikację

Otwórz przeglądarkę i wejdź na:
- **Rejestracja**: http://localhost:5500/rejestracja/
- **Logowanie**: http://localhost:5500/logowanie/
- **API Dokumentacja**: http://localhost:8000/docs

## Jak zatrzymać aplikację

W terminalu wciśnij: `Ctrl+C`

Lub w oddzielnym terminalu:
```bash
docker-compose down
```

## Jak uruchomić ponownie

```bash
docker-compose up
```

## Jeśli chcesz zobaczyć bazę danych

```bash
docker exec -it inzynierka-db psql -U postgres -d inzynierka_db -c "SELECT * FROM users;"
```

## Problemy?

- **Port zajęty?** `docker-compose down` i spróbuj ponownie
- **Chcesz czysty start?** `docker-compose down -v` (usuwa bazę)
- **Slow na starcie?** To normalne, czekaj ~30 sekund

## Zmiana adresu IP

Jeśli chcesz dostęp z innego komputera w sieci:

1. Znajdź swoje IP: `ipconfig` (szukaj IPv4 Address)
2. Otwórz `rejestracja/index.html` i zmień:
```javascript
const API_URL = 'http://TWOJE_IP:8000';  // zamiast localhost:8000
```

Inny komputer wejdzie na:
```
http://TWOJE_IP:5500/rejestracja/
```

---

**To wszystko! Powodzenia!** 🚀
