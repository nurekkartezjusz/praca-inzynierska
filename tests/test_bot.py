import random
import unittest

from game import bot, engine
from game.common import AWAITING_DZIEKANAT, AWAITING_QUIZ, TURN_RESOLUTION


class BotTests(unittest.TestCase):
    def make_game(self):
        return engine.new_game([
            {"user_id": 1, "name": "Gracz", "klass": "sportowiec"},
            {"user_id": 2, "name": "Bot", "klass": "madrala"},
        ])

    def test_bot_takes_a_complete_turn_through_the_shared_engine(self):
        game = self.make_game()
        game.state["rolled"] = True
        human_turn = engine.apply(game.state, TURN_RESOLUTION, {"type": "end_turn"}, 0)
        state, phase, resume, events = bot.play_until_human_turn(
            human_turn.state,
            human_turn.phase,
            human_turn.resume,
            bot_player_id=1,
            rng=random.Random(3),
        )
        self.assertEqual((state["turn"], state["turnNumber"], phase), (0, 2, engine.AWAITING_ROLL))
        self.assertTrue(any(event["type"] == "roll" for event in events))
        self.assertTrue(any(event["type"] == "turn_changed" for event in events))
        self.assertEqual(resume, {})

    def test_bot_uses_winning_dziekanat_action(self):
        game = self.make_game()
        player = game.state["players"][1]
        player.update(pos=6, crystals=15)
        action = bot.choose_action(game.state, AWAITING_DZIEKANAT, {}, 1, random.Random(4))
        self.assertEqual(action, {"type": "dziekanat", "choice": "obrona"})

    def test_bot_answers_from_server_question_key(self):
        game = self.make_game()
        player = game.state["players"][0]
        player.update(pos=85, wisdom=100)
        quiz = engine.apply(game.state, "awaiting_field_resolution", {"type": "resolve_field"}, 0, random.Random(1))
        self.assertEqual(quiz.phase, AWAITING_QUIZ)
        action = bot.choose_action(quiz.state, quiz.phase, quiz.resume, 0, random.Random(1))
        self.assertEqual(action["type"], "answer")
        result = engine.apply(quiz.state, quiz.phase, action, 0, random.Random(1), quiz.resume)
        self.assertEqual(result.events[0]["correct"], True)

    def test_bot_decisions_are_deterministic_with_seeded_random(self):
        game = self.make_game()
        state = game.state
        state["turn"] = 1
        first = bot.play_until_human_turn(state, engine.AWAITING_ROLL, {}, 1, random.Random(55))
        second = bot.play_until_human_turn(state, engine.AWAITING_ROLL, {}, 1, random.Random(55))
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
