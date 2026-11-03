"""Decyzje bota dla wspólnego silnika gry."""

import random

from game import engine, fields, questions, rules
from game.common import (
    AWAITING_DZIEKANAT,
    AWAITING_FIELD_RESOLUTION,
    AWAITING_LIBRARY,
    AWAITING_QUIZ,
    AWAITING_ROLL,
    AWAITING_START_BONUS,
    FINISHED,
    TURN_RESOLUTION,
)


def choose_action(state: dict, phase: str, resume: dict, player_id: int, rng: random.Random) -> dict:
    player = state["players"][player_id]
    if phase == AWAITING_ROLL:
        return {"type": "roll"}
    if phase == AWAITING_FIELD_RESOLUTION:
        return {"type": "resolve_field"}
    if phase == AWAITING_START_BONUS:
        return {"type": "claim_bonus", "bonus": rng.choice(("coin", "hp", "luck"))}
    if phase == AWAITING_LIBRARY:
        return {"type": "library_exchange", "accept": player["crystals"] < 15}
    if phase == AWAITING_QUIZ:
        quiz = resume["quiz"]
        question = questions.get_question(quiz["questions"][quiz["answered"]])
        probability = 0.4 + player["wisdom"] * 0.08
        if player["klass"] == "leniuch":
            probability -= 0.15
        if player["klass"] == "madrala":
            probability += 0.15
        probability = min(0.92, max(0.2, probability))
        if rng.random() < probability:
            answer = question.correct
        else:
            wrong = [index for index in range(len(question.answers)) if index != question.correct]
            answer = rng.choice(wrong)
        return {"type": "answer", "index": answer}
    if phase == AWAITING_DZIEKANAT:
        if rules.get_floor(player["pos"]) == 1 and player["crystals"] >= fields.CRYSTALS_FOR_DEFENCE:
            return {"type": "dziekanat", "choice": "obrona"}
        prepay = player["coins"] >= 1 and not player["tempCzesnePaid"] and rng.random() < 0.4
        buy_hp = player["coins"] >= 2 and player["hp"] < 4 and rng.random() < 0.5
        buy_crystal = (
            player["coins"] >= 3
            and not player["boughtCrystalThisFloor"]
            and player["crystals"] < 15
            and rng.random() < 0.6
        )
        shorten = player["coins"] >= 2 and not player["hasShortenCard"] and rng.random() < 0.3
        if buy_crystal:
            choice = "buy_crystal"
        elif buy_hp:
            choice = "buy_hp"
        elif shorten:
            choice = "buy_shorten"
        elif prepay:
            choice = "prepay"
        else:
            choice = "leave"
        return {"type": "dziekanat", "choice": choice}
    if phase == TURN_RESOLUTION:
        return {"type": "end_turn"}
    if phase == FINISHED:
        return {}
    raise ValueError(f"Nieobsługiwana faza bota: {phase}")


def play_until_human_turn(
    state: dict,
    phase: str,
    resume: dict,
    bot_player_id: int,
    rng: random.Random,
    max_actions: int = 32,
) -> tuple[dict, str, dict, list[dict]]:
    """Wykonuje turę bota i zwraca stan, gdy sterowanie wróci do człowieka."""
    events: list[dict] = []
    for _ in range(max_actions):
        if state.get("gameOver") or phase == FINISHED or state["turn"] != bot_player_id:
            return state, phase, resume, events
        action = choose_action(state, phase, resume, bot_player_id, rng)
        result = engine.apply(state, phase, action, bot_player_id, rng, resume)
        state, phase, resume = result.state, result.phase, result.resume
        events.extend(result.events)
    raise RuntimeError("Bot przekroczył limit akcji w jednej turze")
