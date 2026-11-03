import unittest
from types import SimpleNamespace
from unittest import mock

from game import engine, service
from game.common import IllegalAction


def make_session(phase=engine.AWAITING_ROLL):
    game = engine.new_game([
        {"user_id": 11, "name": "a", "klass": "sportowiec"},
        {"user_id": 22, "name": "b", "klass": "madrala"},
    ])
    return SimpleNamespace(
        invitation_id=7, state=game.state, phase=phase, resume_data={}, status="active", version=1
    )


class ApplyActionTests(unittest.TestCase):
    def apply(self, session, user_id, action):
        db = mock.Mock()
        with mock.patch.object(service, "get_session", return_value=session):
            return db, service.apply_action(db, 7, user_id, action)

    def test_successful_action_is_persisted(self):
        session = make_session()
        db, (saved, events) = self.apply(session, 11, {"type": "roll"})
        self.assertIs(saved, session)
        self.assertEqual(session.version, 2)
        self.assertEqual(session.phase, engine.AWAITING_FIELD_RESOLUTION)
        self.assertTrue(session.state["rolled"])
        self.assertEqual(events[0]["type"], "roll")
        db.commit.assert_called_once()

    def test_illegal_action_rolls_back_and_changes_nothing(self):
        session = make_session()
        db = mock.Mock()
        with mock.patch.object(service, "get_session", return_value=session):
            with self.assertRaises(IllegalAction):
                service.apply_action(db, 7, 22, {"type": "roll"})  # nie jego tura
        self.assertEqual(session.version, 1)
        db.rollback.assert_called_once()
        db.commit.assert_not_called()

    def test_unknown_user_and_missing_session(self):
        with self.assertRaises(IllegalAction):
            self.apply(make_session(), 99, {"type": "roll"})
        db = mock.Mock()
        with mock.patch.object(service, "get_session", return_value=None):
            with self.assertRaises(IllegalAction):
                service.apply_action(db, 7, 11, {"type": "roll"})

    def test_incompatible_saved_resume_is_reported(self):
        session = make_session(phase="awaiting_quiz")
        session.resume_data = {"quiz": {"questions": [{"q": "stare"}], "answered": 0}}
        with self.assertRaises(IllegalAction):
            self.apply(session, 11, {"type": "answer", "index": 0})


class StateMessageTests(unittest.TestCase):
    def test_message_has_no_private_data(self):
        session = make_session(phase="awaiting_quiz")
        session.resume_data = {"quiz": {"questions": ["easy-0"], "answered": 0, "correct": 0, "hidden": []}}
        message = service.state_message(session, [{"type": "roll"}])
        self.assertEqual(set(message["resume"]["quiz"]), {"question", "number", "total", "hidden"})
        self.assertNotIn("correct", message["resume"]["quiz"]["question"])
        self.assertEqual(message["events"], [{"type": "roll"}])

    def test_unreadable_resume_does_not_break_message(self):
        session = make_session(phase="awaiting_quiz")
        session.resume_data = {"quiz": {"questions": [{"q": "stare"}], "answered": 0}}
        self.assertEqual(service.state_message(session)["resume"], {})


class SummarizeResultsTests(unittest.TestCase):
    EMPTY = {
        "games_played": 0, "games_won": 0, "games_lost": 0, "win_rate": 0,
        "engineer_titles": 0, "bachelor_titles": 0, "favorite_class": None,
    }

    def finished_state(self, winner_user_id, degree="LICENCJAT", klass="madrala"):
        players = [
            {"user_id": 11, "klass": klass},
            {"user_id": 22, "klass": "leniuch"},
            {"user_id": 33, "klass": "leniuch"},
        ]
        for player in players:
            if player["user_id"] == winner_user_id:
                player["degree"] = degree
        return {"players": players, "gameOver": True}

    def test_counts_wins_losses_and_win_rate(self):
        states = [self.finished_state(11), self.finished_state(22), self.finished_state(11)]
        stats = service.summarize_results(states, 11)
        self.assertEqual(
            (stats["games_played"], stats["games_won"], stats["games_lost"], stats["win_rate"]),
            (3, 2, 1, 67),
        )

    def test_counts_titles_separately(self):
        states = [
            self.finished_state(11, "INŻYNIER"),
            self.finished_state(11, "INŻYNIER"),
            self.finished_state(11, "LICENCJAT"),
            self.finished_state(22),
        ]
        stats = service.summarize_results(states, 11)
        self.assertEqual((stats["engineer_titles"], stats["bachelor_titles"]), (2, 1))

    def test_most_chosen_class(self):
        states = [
            self.finished_state(22, klass="sportowiec"),
            self.finished_state(22, klass="sportowiec"),
            self.finished_state(11, klass="madrala"),
            self.finished_state(22, klass="sportowiec"),
        ]
        self.assertEqual(service.summarize_results(states, 11)["favorite_class"], "sportowiec")

    def test_class_ties_are_resolved_deterministically(self):
        states = [self.finished_state(22, klass="sportowiec"), self.finished_state(22, klass="madrala")]
        self.assertEqual(service.summarize_results(states, 11)["favorite_class"], "madrala")
        self.assertEqual(service.summarize_results(states[::-1], 11)["favorite_class"], "madrala")

    def test_old_saves_without_class_do_not_break(self):
        states = [{"players": [{"user_id": 11, "degree": "INŻYNIER"}]}]
        stats = service.summarize_results(states, 11)
        self.assertEqual((stats["games_won"], stats["favorite_class"]), (1, None))

    def test_ignores_games_without_the_user(self):
        states = [{"players": [{"user_id": 22, "degree": "LICENCJAT"}]}]
        self.assertEqual(service.summarize_results(states, 11), self.EMPTY)

    def test_no_games(self):
        self.assertEqual(service.summarize_results([], 11), self.EMPTY)


if __name__ == "__main__":
    unittest.main()
