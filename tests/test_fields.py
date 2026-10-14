import random
import unittest

from game import engine, fields, questions
from game.common import (
    AWAITING_DZIEKANAT,
    AWAITING_FIELD_RESOLUTION,
    AWAITING_LIBRARY,
    AWAITING_QUIZ,
    FINISHED,
    TURN_RESOLUTION,
    IllegalAction,
)


class CardRng(random.Random):
    def __init__(self, card):
        super().__init__(0)
        self.card = card

    def randrange(self, *args, **kwargs):
        return self.card


def player_at(pos, **updates):
    game = engine.new_game([
        {"user_id": 1, "name": "a", "klass": "madrala"},
        {"user_id": 2, "name": "b", "klass": "madrala"},
    ])
    game.state["players"][0].update(pos=pos, **updates)
    return game.state


def resolve(state, rng=None, resume=None):
    return engine.apply(state, AWAITING_FIELD_RESOLUTION, {"type": "resolve_field"}, 0, rng, resume)


def stats(result, *names):
    player = result.state["players"][0]
    return tuple(player[name] for name in names)


class SimpleFieldTests(unittest.TestCase):
    def test_wrong_phase_is_rejected(self):
        with self.assertRaises(IllegalAction):
            engine.apply(player_at(97), TURN_RESOLUTION, {"type": "resolve_field"}, 0)

    def test_safe_fields_change_nothing(self):
        for pos in (84, 93):  # start, lazienka
            before = player_at(pos)
            result = resolve(before)
            self.assertEqual(result.state["players"], before["players"])
            self.assertEqual(result.phase, TURN_RESOLUTION)

    def test_praktyki(self):
        cases = [
            ({"klass": "madrala"}, 3),
            ({"klass": "sportowiec"}, 2),
            ({"klass": "leniuch", "hasShortenCard": True}, 1),
        ]
        for updates, skips in cases:
            with self.subTest(updates=updates):
                result = resolve(player_at(97, **updates))
                self.assertEqual(stats(result, "crystals", "skipTurnsLeft", "hasShortenCard"), (1, skips, False))
                self.assertEqual(result.phase, TURN_RESOLUTION)

    def test_strefa_relaksu_and_piwnica(self):
        self.assertEqual(stats(resolve(player_at(19)), "luck"), (3,))
        self.assertEqual(stats(resolve(player_at(94)), "skipTurnsLeft"), (1,))

    def test_stolowka_closed_on_ground_floor(self):
        self.assertEqual(stats(resolve(player_at(89)), "hp"), (4,))
        self.assertEqual(stats(resolve(player_at(5)), "hp"), (3,))

    def test_automaty(self):
        self.assertEqual(stats(resolve(player_at(91, coins=2)), "coins", "hp"), (1, 4))
        self.assertEqual(stats(resolve(player_at(91, coins=2, klass="sportowiec")), "coins", "hp"), (1, 3 + 2))
        self.assertEqual(stats(resolve(player_at(91, coins=0)), "coins", "hp"), (0, 3))

    def test_chance_cards(self):
        expected = [
            ("hp", 4), ("hp", 2), ("luck", 3), ("wisdom", 4), ("wisdom", 8), ("coins", 2), ("coins", 0), ("crystals", 1),
        ]
        for card, (stat, value) in enumerate(expected):
            with self.subTest(card=card):
                result = resolve(player_at(90), CardRng(card))
                self.assertEqual(result.state["players"][0][stat], value)
                self.assertEqual(result.events[-1]["type"], "chance_card")
                self.assertEqual(result.events[-1]["player_id"], 0)
                self.assertEqual(result.events[-1]["card"], card)
                self.assertIn("a:", result.events[-1]["message"])
                self.assertEqual(result.phase, TURN_RESOLUTION)

    def test_chance_card_losses_are_floored(self):
        low = resolve(player_at(90, hp=1, wisdom=1, coins=1), CardRng(1))
        self.assertEqual(stats(low, "hp"), (1,))
        low = resolve(player_at(90, wisdom=1), CardRng(3))
        self.assertEqual(stats(low, "wisdom"), (0,))
        low = resolve(player_at(90, coins=1), CardRng(6))
        self.assertEqual(stats(low, "coins"), (0,))


class LibraryTests(unittest.TestCase):
    def test_floor_three_gives_bonus_without_exchange(self):
        result = resolve(player_at(95, coins=5))
        self.assertEqual(stats(result, "wisdom", "hints"), (7, 1))
        self.assertEqual(result.phase, TURN_RESOLUTION)

    def test_ground_floor_offers_exchange(self):
        result = resolve(player_at(17, coins=2))
        self.assertEqual(result.phase, AWAITING_LIBRARY)
        accepted = engine.apply(result.state, result.phase, {"type": "library_exchange", "accept": True}, 0)
        self.assertEqual(stats(accepted, "coins", "crystals"), (0, 1))
        self.assertEqual(accepted.phase, TURN_RESOLUTION)

    def test_exchange_can_be_declined(self):
        result = resolve(player_at(17, coins=2))
        declined = engine.apply(result.state, result.phase, {"type": "library_exchange", "accept": False}, 0)
        self.assertEqual(stats(declined, "coins", "crystals"), (2, 0))

    def test_no_offer_without_coins(self):
        self.assertEqual(resolve(player_at(17, coins=1)).phase, TURN_RESOLUTION)


class QuizTests(unittest.TestCase):
    def start(self, pos, **updates):
        result = resolve(player_at(pos, **updates), random.Random(5))
        self.assertEqual(result.phase, AWAITING_QUIZ)
        return result

    def answer(self, result, correct: bool):
        quiz = result.resume["quiz"]
        question = questions.get_question(quiz["questions"][quiz["answered"]])
        index = question.correct if correct else (question.correct + 1) % len(question.answers)
        return engine.apply(result.state, result.phase, {"type": "answer", "index": index}, 0, resume=result.resume)

    def test_public_resume_hides_correct_answer(self):
        result = self.start(85)
        public = fields.public_resume(result.phase, result.resume)
        self.assertEqual(set(public["quiz"]), {"question", "number", "total", "hidden"})
        self.assertEqual(set(public["quiz"]["question"]), {"q", "a"})

    def test_single_question_rewards(self):
        won = self.answer(self.start(85), True)
        self.assertEqual((stats(won, "crystals", "coins"), won.phase), ((1, 1), TURN_RESOLUTION))
        lost = self.answer(self.start(85), False)
        self.assertEqual((stats(lost, "crystals", "coins"), lost.phase), ((0, 0), TURN_RESOLUTION))

    def test_aula_rewards_depend_on_floor_and_score(self):
        cases = [  # (pos, trafione odpowiedzi, kryształki, monety)
            (87, (True, True), 1, 2), (87, (True, False), 1, 1), (87, (False, False), 0, 0),
            (4, (True, True), 1, 2), (4, (True, False), 0, 1), (4, (False, False), 0, 0),
        ]
        for pos, answers, crystals, coins in cases:
            with self.subTest(pos=pos, answers=answers):
                result = self.start(pos, coins=0)
                for index, is_correct in enumerate(answers):
                    result = self.answer(result, is_correct)
                    self.assertEqual(result.phase, AWAITING_QUIZ if index == 0 else TURN_RESOLUTION)
                self.assertEqual(stats(result, "crystals", "coins"), (crystals, coins))
                self.assertEqual(result.resume, {})

    def test_invalid_answer_index(self):
        result = self.start(85)
        for index in (-1, 4, "1", None, True):
            with self.subTest(index=index), self.assertRaises(IllegalAction):
                engine.apply(result.state, result.phase, {"type": "answer", "index": index}, 0, resume=result.resume)

    def test_hint_uses_free_hints_then_coins(self):
        result = self.start(85, hints=1, coins=0)
        hinted = engine.apply(result.state, result.phase, {"type": "use_hint"}, 0, random.Random(1), result.resume)
        self.assertEqual(stats(hinted, "hints", "coins"), (0, 0))
        hidden = hinted.resume["quiz"]["hidden"]
        question = questions.get_question(hinted.resume["quiz"]["questions"][0])
        self.assertEqual(len(hidden), 2)
        self.assertNotIn(question.correct, hidden)
        with self.assertRaises(IllegalAction):
            engine.apply(hinted.state, hinted.phase, {"type": "use_hint"}, 0, resume=hinted.resume)

        paid = self.start(85, hints=0, coins=1)
        paid = engine.apply(paid.state, paid.phase, {"type": "use_hint"}, 0, random.Random(1), paid.resume)
        self.assertEqual(stats(paid, "hints", "coins"), (0, 0))

    def test_hint_requires_hint_or_coin(self):
        result = self.start(85, hints=0, coins=0)
        with self.assertRaises(IllegalAction):
            engine.apply(result.state, result.phase, {"type": "use_hint"}, 0, resume=result.resume)

    def test_hidden_answers_reset_for_next_question(self):
        result = self.start(87, hints=1)
        hinted = engine.apply(result.state, result.phase, {"type": "use_hint"}, 0, random.Random(1), result.resume)
        answered = self.answer(hinted, True)
        self.assertEqual(answered.resume["quiz"]["hidden"], [])


class DziekanatTests(unittest.TestCase):
    def enter(self, **updates):
        result = resolve(player_at(88, **updates))
        self.assertEqual(result.phase, AWAITING_DZIEKANAT)
        return result

    def choose(self, result, choice):
        return engine.apply(result.state, result.phase, {"type": "dziekanat", "choice": choice}, 0)

    def test_purchases(self):
        cases = [
            ("prepay", {"coins": 1}, {"coins": 0, "tempCzesnePaid": True}),
            ("buy_hp", {"coins": 2}, {"coins": 0, "hp": 4}),
            ("buy_crystal", {"coins": 3}, {"coins": 0, "crystals": 1, "boughtCrystalThisFloor": True}),
            ("buy_shorten", {"coins": 2}, {"coins": 0, "hasShortenCard": True}),
        ]
        for choice, before, after in cases:
            with self.subTest(choice=choice):
                result = self.choose(self.enter(**before), choice)
                player = result.state["players"][0]
                for name, value in after.items():
                    self.assertEqual(player[name], value, name)
                self.assertEqual(result.phase, TURN_RESOLUTION)

    def test_purchase_requires_resources(self):
        for choice in ("prepay", "buy_hp", "buy_crystal", "buy_shorten"):
            with self.subTest(choice=choice), self.assertRaises(IllegalAction):
                self.choose(self.enter(coins=0), choice)

    def test_buying_crystal_twice_is_blocked(self):
        with self.assertRaises(IllegalAction):
            self.choose(self.enter(coins=9, boughtCrystalThisFloor=True), "buy_crystal")

    def test_leave_and_unknown_choice(self):
        self.assertEqual(self.choose(self.enter(), "leave").phase, TURN_RESOLUTION)
        with self.assertRaises(IllegalAction):
            self.choose(self.enter(), "bribe")

    def test_defence_wins_only_on_ground_floor_with_enough_crystals(self):
        won = engine.apply(
            resolve(player_at(6, crystals=15)).state, AWAITING_DZIEKANAT, {"type": "dziekanat", "choice": "obrona"}, 0
        )
        self.assertEqual((won.phase, won.state["gameOver"], won.state["players"][0]["pos"]), (FINISHED, True, "k25"))
        self.assertEqual(won.events[-1], {"type": "victory", "winner_id": 0, "degree": "INŻYNIER"})

        for state in (player_at(6, crystals=14), player_at(88, crystals=15)):
            with self.assertRaises(IllegalAction):
                engine.apply(state, AWAITING_DZIEKANAT, {"type": "dziekanat", "choice": "obrona"}, 0)

    def test_no_actions_after_victory(self):
        won = engine.apply(player_at(6, crystals=15), AWAITING_DZIEKANAT, {"type": "dziekanat", "choice": "obrona"}, 0)
        with self.assertRaises(IllegalAction):
            engine.apply(won.state, won.phase, {"type": "end_turn"}, 0)


if __name__ == "__main__":
    unittest.main()
