"""Typy i stałe wspólne dla modułów silnika."""

from dataclasses import dataclass, field

AWAITING_ROLL = "awaiting_roll"
AWAITING_START_BONUS = "awaiting_start_bonus"
AWAITING_FIELD_RESOLUTION = "awaiting_field_resolution"
AWAITING_QUIZ = "awaiting_quiz"
AWAITING_DZIEKANAT = "awaiting_dziekanat"
AWAITING_LIBRARY = "awaiting_library"
TURN_RESOLUTION = "turn_resolution"
FINISHED = "finished"


class IllegalAction(Exception):
    pass


@dataclass
class Result:
    state: dict
    phase: str
    events: list[dict] = field(default_factory=list)
    # Dane prywatne serwera (np. pytania z poprawnymi odpowiedziami); nie rozsyłać graczom.
    resume: dict = field(default_factory=dict)


def require_phase(phase: str, expected: str) -> None:
    if phase != expected:
        raise IllegalAction("Ta akcja jest teraz niedozwolona")
