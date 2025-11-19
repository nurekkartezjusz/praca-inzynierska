# Sudoku

Prosta implementacja Sudoku w JavaScript — generator + solver (backtracking).

Uruchomienie:
- Otwórz `sudoku/index.html` w przeglądarce lub uruchom prosty serwer:
```powershell
cd 'C:\Users\Psiapsia\Documents\GitHub\inzynierka-basic'
python -m http.server 8000
# potem otwórz w przeglądarce: http://localhost:8000/sudoku/
```

Funkcje:
- Generowanie losowej planszy z trzema poziomami trudności (`Łatwy`, `Średni`, `Trudny`).
- `Rozwiąż` — wypełnia planszę rozwiązaniem.
- `Sprawdź` — sprawdza konflikty i poprawność (jeśli plansza jest pełna).
- `Reset` — przywraca planszę do stanu po generowaniu.

Uwaga o unikalności: generator stara się usuwać liczby tak, aby pozostała dokładnie jedna rozwiązanie (kontrola za pomocą ograniczonego liczników rozwiązań). W trudniejszych poziomach może potrwać dłużej.

Możliwe ulepszenia:
- Lepszy generator gwarantujący szybszą unikalność.
- Zapisywanie postępów w `localStorage`.
- Podświetlanie konfliktów w UI.

Ranking wyników:
- Aplikacja zapisuje najlepsze czasy (najkrótszy czas ukończenia) w `localStorage` pod kluczem `sudoku-leaderboard`.
- Po poprawnym rozwiązaniu planszy wynik (czas, poziom i data) zostanie dodany do rankingu automatycznie.
- Możesz otworzyć ranking przyciskiem `Pokaż ranking` i wyczyścić go przyciskiem `Wyczyść ranking`.

Eksport / Import stanu:
- Możesz eksportować aktualny stan gry do pliku JSON (`Eksportuj (JSON)`) i potem wczytać go przez `Importuj (JSON)`.

Timer:
- Timer mierzy czas rozgrywki; możesz go sterować przyciskami `Start`, `Pauza`, `Reset czasu`. Czas jest zapisywany razem ze stanem gry przy eksporcie lub zapisie.
