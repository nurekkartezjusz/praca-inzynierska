import unittest

from game import engine, rules


class FixedRng:
    def __init__(self, *values):
        self.values = list(values)

    def randint(self, low, high):
        return self.values.pop(0)


def make_game(klasses=("sportowiec", "madrala")):
    players = [{"user_id": 10 + i, "name": f"p{i}", "klass": k} for i, k in enumerate(klasses)]
    return engine.new_game(players)


class NewGameTests(unittest.TestCase):
    def test_initial_state(self):
        result = make_game(("sportowiec", "madrala", "leniuch"))
        players = result.state["players"]
        self.assertEqual(result.phase, engine.AWAITING_ROLL)
        self.assertEqual([p["id"] for p in players], [0, 1, 2])
        self.assertTrue(all(p["pos"] == 84 for p in players))
        self.assertEqual((players[1]["wisdom"], players[1]["coins"]), (6, 0))
        self.assertEqual((players[2]["hp"], players[2]["luck"], players[2]["coins"]), (3, 5, 3))

    def test_player_count_and_class_validation(self):
        with self.assertRaises(engine.IllegalAction):
            make_game(("sportowiec",))
        with self.assertRaises(engine.IllegalAction):
            make_game(("sportowiec", "hakerka"))


class RollTests(unittest.TestCase):
    def roll(self, result, value, player_id=0):
        return engine.apply(result.state, result.phase, {"type": "roll"}, player_id, FixedRng(value))

    def test_roll_moves_player_and_does_not_mutate_input(self):
        game = make_game()
        moved = self.roll(game, 4)
        self.assertEqual(moved.state["players"][0]["pos"], 88)
        self.assertEqual(game.state["players"][0]["pos"], 84)
        self.assertTrue(moved.state["rolled"])
        self.assertEqual(moved.phase, engine.AWAITING_FIELD_RESOLUTION)
        self.assertEqual(moved.events[0], {"type": "roll", "player_id": 0, "value": 4})

    def test_cannot_roll_out_of_turn_or_twice(self):
        game = make_game()
        with self.assertRaises(engine.IllegalAction):
            self.roll(game, 3, player_id=1)
        moved = self.roll(game, 3)
        with self.assertRaises(engine.IllegalAction):
            engine.apply(moved.state, moved.phase, {"type": "roll"}, 0, FixedRng(2))

    def test_cannot_act_after_game_over(self):
        game = make_game()
        game.state["gameOver"] = True
        with self.assertRaises(engine.IllegalAction):
            self.roll(game, 3)

    def test_pass_start_pays_tuition_and_awaits_bonus(self):
        game = make_game()
        game.state["players"][0].update(pos=100, coins=2)
        moved = self.roll(game, 3)
        player = moved.state["players"][0]
        self.assertEqual((player["pos"], player["coins"]), (85, 1))
        self.assertEqual(moved.phase, engine.AWAITING_START_BONUS)

    def test_pass_start_uses_prepaid_tuition(self):
        game = make_game()
        game.state["players"][0].update(pos=100, coins=0, tempCzesnePaid=True)
        moved = self.roll(game, 3)
        player = moved.state["players"][0]
        self.assertEqual((player["coins"], player["tempCzesnePaid"]), (0, False))
        self.assertEqual(moved.phase, engine.AWAITING_START_BONUS)

    def test_pass_start_without_coins_costs_crystal(self):
        game = make_game()
        game.state["players"][0].update(pos=100, coins=0, crystals=2)
        moved = self.roll(game, 3)
        self.assertEqual(moved.state["players"][0]["crystals"], 1)
        self.assertEqual(moved.phase, engine.AWAITING_FIELD_RESOLUTION)

    def test_pass_start_without_coins_and_last_crystal_relegates(self):
        game = make_game()
        game.state["players"][0].update(pos=82, coins=0, crystals=0)
        moved = self.roll(game, 3)
        self.assertEqual(moved.state["players"][0]["pos"], 84)
        self.assertEqual(moved.phase, engine.AWAITING_FIELD_RESOLUTION)
        self.assertEqual(moved.events[-1]["type"], "relegated")

        game.state["players"][0].update(pos=48)
        moved = self.roll(game, 3)
        self.assertEqual(moved.state["players"][0]["pos"], 50)

    def test_skipped_turn_does_not_move(self):
        game = make_game()
        game.state["players"][0]["skipTurnsLeft"] = 2
        skipped = self.roll(game, 6)
        player = skipped.state["players"][0]
        self.assertEqual((player["pos"], player["skipTurnsLeft"]), (84, 1))
        self.assertEqual(skipped.phase, engine.TURN_RESOLUTION)
        self.assertEqual(skipped.events[0]["type"], "turn_skipped")

    def test_crystal_purchase_flag_resets_only_when_floor_changes(self):
        game = make_game()
        game.state["players"][0].update(pos=82, crystals=10, boughtCrystalThisFloor=True)
        descended = self.roll(game, 3)  # 82 -> 83 -> 0 -> 1: piętro 2 -> 1
        self.assertFalse(descended.state["players"][0]["boughtCrystalThisFloor"])

        game.state["players"][0].update(pos=82, crystals=0, boughtCrystalThisFloor=True)
        same_floor = self.roll(game, 3)  # 82 -> 83 -> 50 -> 51: to samo piętro
        self.assertTrue(same_floor.state["players"][0]["boughtCrystalThisFloor"])

        game.state["players"][0].update(pos=100, coins=0, crystals=0, boughtCrystalThisFloor=True)
        top_floor = self.roll(game, 1)  # 100 -> 101, bez zmiany piętra
        self.assertTrue(top_floor.state["players"][0]["boughtCrystalThisFloor"])


class BonusAndTurnTests(unittest.TestCase):
    def test_claim_bonus(self):
        game = make_game()
        game.state["players"][0].update(pos=100, coins=1)
        moved = engine.apply(game.state, game.phase, {"type": "roll"}, 0, FixedRng(3))
        claimed = engine.apply(moved.state, moved.phase, {"type": "claim_bonus", "bonus": "hp"}, 0)
        self.assertEqual(claimed.state["players"][0]["hp"], 6)
        self.assertEqual(claimed.phase, engine.AWAITING_FIELD_RESOLUTION)

    def test_claim_bonus_rejected_in_wrong_phase_or_with_bad_type(self):
        game = make_game()
        with self.assertRaises(engine.IllegalAction):
            engine.apply(game.state, game.phase, {"type": "claim_bonus", "bonus": "coin"}, 0)
        game.state["players"][0].update(pos=100, coins=1)
        moved = engine.apply(game.state, game.phase, {"type": "roll"}, 0, FixedRng(3))
        with self.assertRaises(engine.IllegalAction):
            engine.apply(moved.state, moved.phase, {"type": "claim_bonus", "bonus": "crystal"}, 0)

    def test_end_turn_rotates_players(self):
        game = make_game(("sportowiec", "madrala", "leniuch"))
        state = game.state
        state["rolled"] = True
        for expected_turn in (1, 2, 0):
            result = engine.apply(state, engine.TURN_RESOLUTION, {"type": "end_turn"}, state["turn"])
            state = result.state
            self.assertEqual((state["turn"], state["rolled"], result.phase), (expected_turn, False, engine.AWAITING_ROLL))
        self.assertEqual(state["turnNumber"], 3)

    def test_unknown_action(self):
        game = make_game()
        with self.assertRaises(engine.IllegalAction):
            engine.apply(game.state, game.phase, {"type": "cheat"}, 0)


if __name__ == "__main__":
    unittest.main()
