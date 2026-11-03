"""Pytania quizowe. Poprawne odpowiedzi nie opuszczają serwera."""

import json
import random
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Question:
    text: str
    answers: tuple[str, ...]
    correct: int
    id: str = ""

    def public(self) -> dict:
        return {"q": self.text, "a": list(self.answers)}


def _load_questions() -> tuple[tuple[Question, ...], tuple[Question, ...]]:
    source = Path(__file__).with_name("questions.json")
    data = json.loads(source.read_text(encoding="utf-8"))
    pools = []
    for pool_name in ("easy", "hard"):
        questions = []
        for index, row in enumerate(data[pool_name]):
            answers = tuple(row["a"])
            correct = row["c"]
            if not isinstance(row["q"], str) or not answers or type(correct) is not int or not 0 <= correct < len(answers):
                raise ValueError(f"Nieprawidłowe pytanie {pool_name}[{index}]")
            questions.append(Question(row["q"], answers, correct, f"{pool_name}-{index}"))
        pools.append(tuple(questions))
    return pools[0], pools[1]


EASY_QUESTIONS, HARD_QUESTIONS = _load_questions()

_BY_ID = {question.id: question for question in EASY_QUESTIONS + HARD_QUESTIONS}


def get_question(question_id: str) -> Question:
    return _BY_ID[question_id]


def pick_questions(klass: str, floor: int, count: int, rng: random.Random) -> list[Question]:
    """Pula trudna dla leniucha i na parterze (floor == 1), łatwa w pozostałych przypadkach."""
    pool = HARD_QUESTIONS if klass == "leniuch" or floor == 1 else EASY_QUESTIONS
    return rng.sample(pool, count)
