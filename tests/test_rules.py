import random
import re
import json
import unittest
from pathlib import Path

from game import questions, rules

ROOT = Path(__file__).resolve().parent.parent


class BoardTests(unittest.TestCase):
    def test_board_matches_frontend_html(self):
        html = (ROOT / "plansza" / "index.html").read_text(encoding="utf-8")
        cells = re.findall(r'class="cell c(\d+) (\w+)"', html)
        self.assertEqual(len(cells), rules.BOARD_SIZE)
        for number, cell_type in cells:
            self.assertEqual(rules.CELL_TYPES[int(number)], cell_type, f"pole {number}")

    def test_floors(self):
        self.assertEqual([rules.get_floor(p) for p in (0, 49, 50, 83, 84, 101)], [1, 1, 2, 2, 3, 3])
        self.assertEqual(rules.get_floor("k25"), 1)

    def test_start_cells(self):
        for pos in (0, 50, 84):
            self.assertEqual(rules.get_cell_type(pos), "start")


class MovementTests(unittest.TestCase):
    def test_simple_move(self):
        self.assertEqual(rules.compute_move(0, 84, 3), ([85, 86, 87], 0))

    def test_wrap_on_top_floor_passes_start(self):
        self.assertEqual(rules.compute_move(0, 100, 3), ([101, 84, 85], 1))

    def test_wrap_on_middle_floor_passes_start(self):
        self.assertEqual(rules.compute_move(0, 82, 3), ([83, 50, 51], 1))

    def test_wrap_on_ground_floor_passes_start(self):
        self.assertEqual(rules.compute_move(0, 48, 3), ([49, 0, 1], 1))

    def test_going_down_with_enough_crystals_does_not_pass_start(self):
        path, passed = rules.compute_move(5, 100, 3)
        self.assertEqual((path, passed), ([101, 50, 51], 0))

    def test_going_down_to_ground_floor(self):
        path, passed = rules.compute_move(10, 82, 3)
        self.assertEqual((path, passed), ([83, 0, 1], 0))

    def test_tuition(self):
        self.assertEqual([rules.tuition_for_floor(f) for f in (1, 2, 3)], [3, 1, 1])


class QuestionTests(unittest.TestCase):
    def test_question_bank_is_editable_json_and_no_answer_key_is_in_client(self):
        data = json.loads((ROOT / "game" / "questions.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["easy"]), 12)
        self.assertEqual(len(data["hard"]), 11)
        script = (ROOT / "plansza" / "script.js").read_text(encoding="utf-8")
        self.assertNotIn("var EASY_QUESTIONS", script)
        self.assertNotIn("var HARD_QUESTIONS", script)

    def test_public_view_hides_correct_answer(self):
        for question in questions.EASY_QUESTIONS + questions.HARD_QUESTIONS:
            self.assertEqual(set(question.public()), {"q", "a"})
            self.assertLess(question.correct, len(question.answers))

    def test_pool_selection(self):
        rng = random.Random(1)
        self.assertTrue(all(q in questions.HARD_QUESTIONS for q in questions.pick_questions("leniuch", 3, 2, rng)))
        self.assertTrue(all(q in questions.HARD_QUESTIONS for q in questions.pick_questions("madrala", 1, 2, rng)))
        self.assertTrue(all(q in questions.EASY_QUESTIONS for q in questions.pick_questions("madrala", 3, 2, rng)))

    def test_questions_are_distinct(self):
        picked = questions.pick_questions("madrala", 3, 2, random.Random(2))
        self.assertEqual(len(set(picked)), 2)


if __name__ == "__main__":
    unittest.main()
