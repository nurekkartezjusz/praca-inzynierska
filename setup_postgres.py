import subprocess
import sys
import os

print("PostgreSQL Setup Guide")
print("=" * 50)
print()

# Sprawdzenie czy PostgreSQL jest zainstalowany
try:
    result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
    print(f"✓ PostgreSQL zainstalowany: {result.stdout.strip()}")
except FileNotFoundError:
    print("✗ PostgreSQL nie jest zainstalowany!")
    print()
    print("Instrukcja instalacji:")
    print("1. Pobierz PostgreSQL: https://www.postgresql.org/download/windows/")
    print("2. Zainstaluj i zapamiętaj hasło do użytkownika 'postgres'")
    print("3. Uruchom ten skrypt ponownie")
    sys.exit(1)

print()
print("Następne kroki:")
print("1. Uruchom pgAdmin (powinno się otworzyć)")
print("2. Połącz się z serwerem PostgreSQL")
print("3. Kliknij prawym przyciskiem na 'Databases'")
print("4. Wybierz 'Create > Database'")
print("5. Nazwa bazy: inzynierka_db")
print("6. Kliknij 'Save'")
print()
print("Jeśli preferujesz linię poleceń, uruchom w terminalu:")
print("psql -U postgres")
print("CREATE DATABASE inzynierka_db;")
print("\\q")
print()
print("Potem uruchom: python main.py")
