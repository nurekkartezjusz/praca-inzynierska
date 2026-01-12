FROM python:3.13-slim

WORKDIR /app

# Zainstaluj zależności systemowe
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Kopiuj requirements.txt
COPY requirements.txt .

# Zainstaluj zależności Pythona
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj kod aplikacji
COPY main.py database.py models.py schemas.py auth.py ./

# Expose port
EXPOSE 8000

# Run aplikacja
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
