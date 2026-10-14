"""Plansza i stałe reguły gry (port z plansza/script.js i plansza/index.html)."""

# Typy pól według numeru komórki (.c0 ... .c101); pięter: 0-49, 50-83, 84-101.
CELL_TYPES: tuple[str, ...] = tuple(
    """
    start sala sala lazienka aula stolowka dziekanat sala sala lazienka
    sala praktyki automaty sala lazienka szansa aula biblioteka sala strefarelaksu
    sala lazienka piwnica aula lazienka sala dziekanat stolowka sala lazienka
    praktyki automaty sala szansa lazienka aula sala biblioteka szansa dziekanat
    sala aula szansa sala sala lazienka sala praktyki sala sala
    start sala lazienka stolowka sala dziekanat szansa aula automaty sala
    lazienka sala praktyki piwnica sala biblioteka sala aula sala aula
    lazienka szansa sala dziekanat automaty sala aula lazienka biblioteka strefarelaksu
    sala aula piwnica szansa
    start sala sala aula dziekanat stolowka szansa automaty aula lazienka
    piwnica biblioteka sala praktyki sala aula lazienka szansa
    """.split()
)

BOARD_SIZE = len(CELL_TYPES)
START_POSITION = 84
FINISH_POSITION = "k25"

CLASS_STATS = {
    "sportowiec": {"hp": 5, "luck": 2, "wisdom": 3},
    "leniuch": {"hp": 3, "luck": 5, "wisdom": 2},
    "madrala": {"hp": 3, "luck": 2, "wisdom": 5},
}
START_COINS = {"sportowiec": 1, "leniuch": 3, "madrala": 0}
MADRALA_WISDOM_BONUS = 1

MIN_PLAYERS = 2
MAX_PLAYERS = 4


def get_cell_type(pos) -> str:
    if isinstance(pos, int) and 0 <= pos < BOARD_SIZE:
        return CELL_TYPES[pos]
    return "sala"


def get_floor(pos) -> int:
    if not isinstance(pos, int):
        return 1
    if 84 <= pos <= 101:
        return 3
    if 50 <= pos <= 83:
        return 2
    return 1


def advance_one_step(crystals: int, pos: int) -> int:
    floor = get_floor(pos)
    if floor == 3:
        if pos == 101:
            return 50 if crystals >= 5 else 84
        return pos + 1
    if floor == 2:
        if pos == 83:
            return 0 if crystals >= 15 else 50
        return pos + 1
    if pos == 49:
        return 0 if crystals >= 30 else 83  # Koniec gry jeśli >= 30 kryształków, inaczej cofnij do piętra 2
    return pos + 1


def _wraps_floor(prev_pos: int, next_pos: int) -> bool:
    """Czy krok zamyka pętlę na tym samym piętrze (minięcie Startu)."""
    return (prev_pos, next_pos) in {(101, 84), (83, 50), (49, 0)}


def compute_move(crystals: int, pos: int, steps: int) -> tuple[list[int], int]:
    """Zwraca ścieżkę (pola kolejnych kroków) i liczbę minięć Startu."""
    path: list[int] = []
    passed_start = 0
    current = pos
    for _ in range(steps):
        following = advance_one_step(crystals, current)
        if _wraps_floor(current, following):
            passed_start += 1
        path.append(following)
        current = following
    return path, passed_start


def tuition_for_floor(floor: int) -> int:
    return 3 if floor == 1 else 1
