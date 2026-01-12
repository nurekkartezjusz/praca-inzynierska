FROM python:3.12

WORKDIR /app

# Zainstaluj build tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Kopiuj requirements.txt
COPY requirements.txt .

# Zainstaluj zależności Pythona
RUN pip install -r requirements.txt

# Kopiuj kod aplikacji
COPY main.py database.py models.py schemas.py auth.py ./

# Expose port
EXPOSE 8000

# Run aplikacja
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
