"""Efekty pól planszy: quiz, szansa, praktyki, biblioteka, dziekanat itd."""

from game import rules
from game.common import (
    AWAITING_DZIEKANAT,
    AWAITING_FIELD_RESOLUTION,
    AWAITING_LIBRARY,
    AWAITING_QUIZ,
    FINISHED,
    TURN_RESOLUTION,
    IllegalAction,
    Result,
    require_phase,
)
from game.questions import get_question, pick_questions

QUIZ_QUESTIONS_PER_CELL = {"sala": 1, "aula": 2}
HINT_HIDDEN_ANSWERS = 2
CRYSTALS_FOR_DEFENCE = 15


def _card_gain(stat: str, amount: int):
    def apply(player):
        player[stat] += amount
    return apply


def _card_loss(stat: str, amount: int, floor: int):
    def apply(player):
        player[stat] = max(floor, player[stat] - amount)
    return apply


def _card_competition(player):
    player["crystals"] += 1
    player["coins"] += 1


# Kolejność ma znaczenie: indeks karty trafia do zdarzenia `chance_card`.
CHANCE_CARDS = (
    _card_gain("hp", 1),
    _card_loss("hp", 1, 1),
    _card_gain("luck", 1),
    _card_loss("wisdom", 2, 0),
    _card_gain("wisdom", 2),
    _card_gain("coins", 2),
    _card_loss("coins", 2, 0),
    _card_competition,
)
CHANCE_CARD_MESSAGES = (
    '{name}: "Stypendium naukowe!" → +1 HP',
    '{name}: "Oblałeś kolokwium!" → -1 HP',
    '{name}: "Prowadzący odwołał zajęcia!" → +1 szczęście',
    '{name}: "Niespodziewana kartkówka!" → -2 wiedzy',
    '{name}: "Znalazłeś notatki starszego rocznika!" → +2 wiedzy',
    '{name}: "Przelew od rodziców!" → +2 monety',
    '{name}: "Zgubiłeś legitymację studencką!" → Wyrobienie nowej kosztuje -2 monety',
    '{name}: "Wygrałeś konkurs rzetelności naukowej!" → +1 Kryształek, +1 moneta',
)


def resolve_field(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_FIELD_RESOLUTION)
    cell = rules.get_cell_type(player["pos"])
    floor = rules.get_floor(player["pos"])
    events = [{"type": "field", "player_id": player["id"], "cell": cell}]

    if cell in QUIZ_QUESTIONS_PER_CELL:
        questions = pick_questions(player["klass"], floor, QUIZ_QUESTIONS_PER_CELL[cell], rng)
        quiz = {"questions": [q.id for q in questions], "answered": 0, "correct": 0, "hidden": []}
        return Result(state, AWAITING_QUIZ, events, {"quiz": quiz})
    if cell == "dziekanat":
        return Result(state, AWAITING_DZIEKANAT, events)
    if cell == "biblioteka":
        player["wisdom"] += 1
        player["hints"] += 1
        if floor == 1 and player["coins"] >= 2:
            return Result(state, AWAITING_LIBRARY, events)
        return Result(state, TURN_RESOLUTION, events)
    if cell == "praktyki":
        player["crystals"] += 1
        if player["hasShortenCard"]:
            player["skipTurnsLeft"] = 1
            player["hasShortenCard"] = False
        elif player["klass"] == "sportowiec":
            player["skipTurnsLeft"] = 2
        else:
            player["skipTurnsLeft"] = 3
    elif cell == "strefarelaksu":
        player["luck"] += 1
    elif cell == "stolowka":
        if floor != 1:
            player["hp"] += 1
    elif cell == "piwnica":
        player["skipTurnsLeft"] = 1
    elif cell == "automaty":
        if player["coins"] >= 1:
            player["coins"] -= 1
            player["hp"] += 2 if player["klass"] == "sportowiec" else 1
    elif cell == "szansa":
        card = rng.randrange(len(CHANCE_CARDS))
        CHANCE_CARDS[card](player)
        events.append({
            "type": "chance_card",
            "player_id": player["id"],
            "card": card,
            "message": CHANCE_CARD_MESSAGES[card].format(name=player["name"]),
        })
    return Result(state, TURN_RESOLUTION, events)


def library_exchange(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_LIBRARY)
    accepted = action.get("accept") is True
    if accepted:
        if player["coins"] < 2:
            raise IllegalAction("Za mało monet")
        player["coins"] -= 2
        player["crystals"] += 1
    events = [{"type": "library_exchange", "player_id": player["id"], "accepted": accepted}]
    return Result(state, TURN_RESOLUTION, events)


def _quiz_rewards(floor: int, total: int, score: int) -> tuple[int, int]:
    """Zwraca (kryształki, monety)."""
    if total == 1:
        return (1, 1) if score == 1 else (0, 0)
    if score == 2:
        return 1, 2
    if score == 1:
        return (0, 1) if floor == 1 else (1, 1)
    return 0, 0


def quiz_answer(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_QUIZ)
    quiz = resume["quiz"]
    question = get_question(quiz["questions"][quiz["answered"]])
    selected = action.get("index")
    if type(selected) is not int or not 0 <= selected < len(question.answers):
        raise IllegalAction("Nieprawidłowa odpowiedź")

    is_correct = selected == question.correct
    quiz["answered"] += 1
    quiz["correct"] += is_correct
    quiz["hidden"] = []
    events = [{
        "type": "answer_result",
        "player_id": player["id"],
        "selected": selected,
        "correct": is_correct,
        "correct_index": question.correct,
    }]
    total = len(quiz["questions"])
    if quiz["answered"] < total:
        return Result(state, AWAITING_QUIZ, events, resume)

    crystals, coins = _quiz_rewards(rules.get_floor(player["pos"]), total, quiz["correct"])
    player["crystals"] += crystals
    player["coins"] += coins
    events.append({
        "type": "quiz_finished",
        "player_id": player["id"],
        "score": quiz["correct"],
        "total": total,
        "crystals": crystals,
        "coins": coins,
    })
    return Result(state, TURN_RESOLUTION, events)


def quiz_hint(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_QUIZ)
    quiz = resume["quiz"]
    if quiz["hidden"]:
        raise IllegalAction("Podpowiedź została już użyta w tym pytaniu")
    if player["hints"] > 0:
        player["hints"] -= 1
    elif player["coins"] >= 1:
        player["coins"] -= 1
    else:
        raise IllegalAction("Brak podpowiedzi i monet")

    question = get_question(quiz["questions"][quiz["answered"]])
    wrong = [i for i in range(len(question.answers)) if i != question.correct]
    quiz["hidden"] = sorted(rng.sample(wrong, HINT_HIDDEN_ANSWERS))
    return Result(state, AWAITING_QUIZ, [{"type": "hint_used", "player_id": player["id"], "hidden": quiz["hidden"]}], resume)


def _dziekanat_prepay(player):
    if player["coins"] < 1 or player["tempCzesnePaid"]:
        raise IllegalAction("Nie można opłacić czesnego z góry")
    player["coins"] -= 1
    player["tempCzesnePaid"] = True


def _dziekanat_buy_hp(player):
    if player["coins"] < 2:
        raise IllegalAction("Za mało monet")
    player["coins"] -= 2
    player["hp"] += 1


def _dziekanat_buy_crystal(player):
    if player["coins"] < 3 or player["boughtCrystalThisFloor"]:
        raise IllegalAction("Nie można kupić kryształka")
    player["coins"] -= 3
    player["crystals"] += 1
    player["boughtCrystalThisFloor"] = True


def _dziekanat_buy_shorten(player):
    if player["coins"] < 2 or player["hasShortenCard"]:
        raise IllegalAction("Nie można kupić karty skróconych praktyk")
    player["coins"] -= 2
    player["hasShortenCard"] = True


DZIEKANAT_PURCHASES = {
    "prepay": _dziekanat_prepay,
    "buy_hp": _dziekanat_buy_hp,
    "buy_crystal": _dziekanat_buy_crystal,
    "buy_shorten": _dziekanat_buy_shorten,
}


def dziekanat(state, phase, resume, action, player, rng) -> Result:
    require_phase(phase, AWAITING_DZIEKANAT)
    choice = action.get("choice")
    events = [{"type": "dziekanat", "player_id": player["id"], "choice": choice}]

    if choice == "obrona":
        if rules.get_floor(player["pos"]) != 1 or player["crystals"] < CRYSTALS_FOR_DEFENCE:
            raise IllegalAction("Nie spełniasz warunków obrony")
        return declare_winner(state, player, events, rng)
    if choice != "leave":
        purchase = DZIEKANAT_PURCHASES.get(choice)
        if purchase is None:
            raise IllegalAction("Nieznany wybór w dziekanacie")
        purchase(player)
    return Result(state, TURN_RESOLUTION, events)


def declare_winner(state, player, events, rng) -> Result:
    state["gameOver"] = True
    state["rolled"] = True
    player["pos"] = rules.FINISH_POSITION
    degree = "INŻYNIER" if player["klass"] == "madrala" else "LICENCJAT"
    if player["klass"] == "sportowiec":
        degree = rng.choice(("INŻYNIER", "LICENCJAT"))
    player["degree"] = degree
    events.append({"type": "victory", "winner_id": player["id"], "degree": degree})
    return Result(state, FINISHED, events)


def public_resume(phase: str, resume: dict) -> dict:
    """Widok danych prywatnych bezpieczny dla klienta (bez poprawnych odpowiedzi)."""
    if phase != AWAITING_QUIZ:
        return {}
    quiz = resume["quiz"]
    question = get_question(quiz["questions"][quiz["answered"]])
    return {"quiz": {
        "question": question.public(),
        "number": quiz["answered"] + 1,
        "total": len(quiz["questions"]),
        "hidden": quiz["hidden"],
    }}


HANDLERS = {
    "resolve_field": resolve_field,
    "answer": quiz_answer,
    "use_hint": quiz_hint,
    "library_exchange": library_exchange,
    "dziekanat": dziekanat,
}
