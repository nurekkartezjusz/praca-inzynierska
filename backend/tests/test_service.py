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


if __name__ == "__main__":
    unittest.main()
