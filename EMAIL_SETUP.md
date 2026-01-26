# Konfiguracja wysyłania emaili (Resend API)

## Dlaczego Resend?
- ✅ **Darmowe 3000 emaili/miesiąc** (wystarczy dla zespołu)
- ✅ **Tylko 1 klucz API** (nie trzeba hasła aplikacji)
- ✅ **Szybka konfiguracja** (2 minuty)
- ✅ **Nie trzeba weryfikacji dwuetapowej**

---

## 1. Utwórz konto na Resend

1. Wejdź na: https://resend.com/signup
2. Zarejestruj się (email + hasło)
3. Potwierdź email

## 2. Wygeneruj klucz API

1. Po zalogowaniu przejdź do: https://resend.com/api-keys
2. Kliknij **"Create API Key"**
3. Nazwij go (np. `batalia-dev`)
4. Skopiuj klucz (zaczyna się od `re_...`)
   
⚠️ **Ważne:** Klucz pojawi się tylko raz! Skopiuj go od razu.

## 3. Dodaj klucz do pliku .env

Otwórz plik `.env` i dodaj:

```env
# Resend API Configuration
RESEND_API_KEY=re_twoj_klucz_tutaj
```

Zamień `re_twoj_klucz_tutaj` na klucz z kroku 2.

## 4. Zainstaluj nowe biblioteki

```bash
pip install -r requirements.txt
```

Lub ręcznie:
```bash
pip install resend==0.8.0 httpx==0.26.0
```

## 5. Uruchom serwer ponownie

```bash
python main.py
```

---

## Jak to działa?

### Z Resend skonfigurowanym:
1. Użytkownik wpisuje email i klika "Wyślij kod"
2. System wysyła ładnego HTML emaila z 6-cyfrowym kodem **przez Resend**
3. Email przychodzi z adresu: `onboarding@resend.dev`
4. Użytkownik otrzymuje email i wpisuje kod w formularzu

### Bez Resend (tryb deweloperski):
1. Użytkownik wpisuje email i klika "Wyślij kod"
2. Token pojawia się w alertcie
3. W konsoli serwera: `⚠️ Email nie skonfigurowany - zwracam token w odpowiedzi`

---

## Testowanie

Po skonfigurowaniu Resend, przetestuj:
1. Otwórz `haslo/index.html`
2. Wpisz prawdziwy email (taki, który ma konto w systemie)
3. Kliknij "Wyślij kod resetowania"
4. Sprawdź swoją skrzynkę odbiorczą - powinieneś dostać ładnego emaila!

**Tip:** Jeśli email nie przychodzi, sprawdź folder SPAM.

---

## Własna domena email (opcjonalne)

Domyślnie emaile przychodzą z `onboarding@resend.dev`. 

Jeśli chcesz użyć własnej domeny (np. `noreply@twoja-domena.pl`):

1. W Resend przejdź do: **Domains** → **Add Domain**
2. Dodaj swoją domenę i skonfiguruj DNS (Resend pokaże instrukcje)
3. Zmień w `main.py` linijkę:
   ```python
   "from": "Wielka Studencka Batalla <noreply@twoja-domena.pl>",
   ```

⚠️ **To opcjonalne** - domyślny adres działa bez problemu!

---

## Rozwiązywanie problemów

### "Unauthorized" / "Invalid API key"
- Sprawdź, czy klucz w `.env` jest poprawny
- Upewnij się, że klucz zaczyna się od `re_`
- Sprawdź, czy nie ma spacji przed/po kluczu

### "Rate limit exceeded"
- Darmowy plan: 3000 emaili/miesiąc
- Sprawdź dashboard Resend, ile emaili zostało

### Email nie przychodzi
- Sprawdź folder SPAM
- Sprawdź logi serwera - czy pokazuje "✅ Email z kodem wysłany"
- Sprawdź dashboard Resend (https://resend.com/emails) - czy email został wysłany

### "Connection error"
- Sprawdź połączenie z internetem
- Upewnij się, że `httpx` jest zainstalowany
