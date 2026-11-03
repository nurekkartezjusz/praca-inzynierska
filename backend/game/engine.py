"""Silnik gry: czyste funkcje bez I/O. Stan ma ten sam kształt co gameState w kliencie."""

import copy
import random

from game import fields, rules
from game.common import (
    AWAITING_FIELD_RESOLUTION,
    AWAITING_ROLL,
    AWAITING_START_BONUS,
    TURN_RESOLUTION,
    IllegalAction,
    Result,
    require_phase,
)

START_BONUSES = {"coin": "coins", "hp": "hp", "luck": "luck"}


def new_game(players: list[dict]) -> Result:
    """players: [{"user_id": int, "name": str, "klass": str}, ...] w kolejności tur."""
    if not rules.MIN_PLAYERS <= len(players) <= rules.MAX_PLAYERS:
        raise IllegalAction("Do rozpoczęcia potrzeba od 2 do 4 graczy")
    state_players = []
    for index, player in enumerate(players):
        klass = player.get("klass")
        if klass not in rules.CLASS_STATS:
            raise IllegalAction("Nieprawidłowa klasa gracza")
        stats = rules.CLASS_STATS[klass]
        state_players.append({
            "id": index,
            "user_id": player["user_id"],
            "name": player["name"],
            "pos": rules.START_POSITION,
            "klass": klass,
            "skipTurnsLeft": 0,
            "hp": stats["hp"],
            "luck": stats["luck"],
            "wisdom": stats["wisdom"] + (rules.MADRALA_WISDOM_BONUS if klass == "madrala" else 0),
            "crystals": 0,
            "coins": rules.START_COINS[klass],
            "tempCzesnePaid": False,
            "hasShortenCard": False,
            "boughtCrystalThisFloor": False,
            "hints": 0,
            "practicesCompleted": 0,
        })
    state = {"players": state_players, "turn": 0, "turnNumber": 0, "rolled": False, "gameOver": False}
    return Result(state, AWAITING_ROLL)


def apply(
    state: dict,
    phase: str,
    action: dict,
    player_id: int,
    rng: random.Random | None = None,
    resume: dict | None = None,
) -> Result:
    """Stosuje akcję gracza; zwraca nowy stan (wejściowy nie jest modyfikowany) albo rzuca IllegalAction."""
    if state.get("gameOver"):
        raise IllegalAction("Gra już się zakończyła")
    if state["turn"] != player_id:
        raise IllegalAction("To nie Twoja tura")

    handler = _HANDLERS.get(action.get("type"))
    if handler is None:
        raise IllegalAction("Nieznana akcja")
    new_state = copy.deepcopy(state)
    new_resume = copy.deepcopy(resume or {})
    return handler(new_state, phase, new_resume, action, new_state["players"][player_id], rng or random.Random())


def _roll(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_ROLL)
    if state["rolled"]:
        raise IllegalAction("Kostka została już rzucona")
    state["rolled"] = True

    if player["skipTurnsLeft"] > 0:
        player["skipTurnsLeft"] -= 1
        event = {"type": "turn_skipped", "player_id": player["id"], "turns_left": player["skipTurnsLeft"]}
        return Result(state, TURN_RESOLUTION, [event])

    value = rng.randint(1, 6)
    floor_before = rules.get_floor(player["pos"])
    path, passed_start = rules.compute_move(player["crystals"], player["pos"], value)
    player["pos"] = path[-1]
    events = [
        {"type": "roll", "player_id": player["id"], "value": value},
        {"type": "moved", "player_id": player["id"], "path": path},
    ]
    next_phase = _pass_start(player, events) if passed_start else AWAITING_FIELD_RESOLUTION
    if rules.get_floor(player["pos"]) != floor_before:
        player["boughtCrystalThisFloor"] = False
    return Result(state, next_phase, events)


def _pass_start(player: dict, events: list[dict]) -> str:
    """Czesne za minięcie Startu; zwraca kolejną fazę."""
    tuition = rules.tuition_for_floor(rules.get_floor(player["pos"]))
    if player["tempCzesnePaid"]:
        player["tempCzesnePaid"] = False
        events.append({"type": "tuition_paid", "player_id": player["id"], "amount": 0, "prepaid": True})
        return AWAITING_START_BONUS
    if player["coins"] >= tuition:
        player["coins"] -= tuition
        events.append({"type": "tuition_paid", "player_id": player["id"], "amount": tuition, "prepaid": False})
        return AWAITING_START_BONUS

    player["crystals"] = max(0, player["crystals"] - 1)
    events.append({"type": "crystal_lost", "player_id": player["id"], "tuition": tuition})
    if player["crystals"] == 0:
        floor = rules.get_floor(player["pos"])
        if floor == 2:
            player["pos"] = 84
        elif floor == 1:
            player["pos"] = 50
        if floor in (1, 2):
            events.append({"type": "relegated", "player_id": player["id"], "pos": player["pos"]})
    return AWAITING_FIELD_RESOLUTION


def _claim_bonus(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_START_BONUS)
    stat = START_BONUSES.get(action.get("bonus"))
    if stat is None:
        raise IllegalAction("Nieprawidłowy bonus")
    player[stat] += 1
    events = [{"type": "bonus_claimed", "player_id": player["id"], "bonus": action["bonus"]}]
    return Result(state, AWAITING_FIELD_RESOLUTION, events)


def _end_turn(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, TURN_RESOLUTION)
    state["turn"] = (state["turn"] + 1) % len(state["players"])
    state["turnNumber"] += 1
    state["rolled"] = False
    return Result(state, AWAITING_ROLL, [{"type": "turn_changed", "turn": state["turn"]}])


_HANDLERS = {
    "roll": _roll,
    "claim_bonus": _claim_bonus,
    "end_turn": _end_turn,
    **fields.HANDLERS,
}
ACTION_TYPES = frozenset(_HANDLERS)
