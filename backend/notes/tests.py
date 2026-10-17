from django.test import TestCase
from rest_framework.test import APIClient

from .models import Note


class SharedNotesAPITests(TestCase):
	def setUp(self):
		self.client = APIClient()

	def test_anonymous_demo_notes_crud_remains_available(self):
		created = self.client.post(
			"/api/notes/",
			{"symbol": "BTCUSDT", "content": "Support near 60k"},
			format="json",
		)
		note_id = created.data["id"]
		listed = self.client.get("/api/notes/")
		updated = self.client.patch(
			f"/api/notes/{note_id}/",
			{"content": "Updated shared note"},
			format="json",
		)
		deleted = self.client.delete(f"/api/notes/{note_id}/")

		self.assertEqual(created.status_code, 201)
		self.assertEqual(listed.status_code, 200)
		self.assertEqual(len(listed.data), 1)
		self.assertEqual(updated.status_code, 200)
		self.assertEqual(deleted.status_code, 204)
		self.assertFalse(Note.objects.filter(pk=note_id).exists())

	def test_symbol_filter_and_content_validation(self):
		Note.objects.create(symbol="BTCUSDT", content="One")
		Note.objects.create(symbol="EUR/USD", content="Two")

		filtered = self.client.get("/api/notes/?symbol=btcUSDT")
		blank = self.client.post(
			"/api/notes/",
			{"symbol": "BTCUSDT", "content": "   "},
			format="json",
		)
		too_long = self.client.post(
			"/api/notes/",
			{"symbol": "BTCUSDT", "content": "x" * 5001},
			format="json",
		)

		self.assertEqual(filtered.status_code, 200)
		self.assertEqual(len(filtered.data), 1)
		self.assertEqual(filtered.data[0]["symbol"], "BTCUSDT")
		self.assertEqual(blank.status_code, 400)
		self.assertEqual(too_long.status_code, 400)
