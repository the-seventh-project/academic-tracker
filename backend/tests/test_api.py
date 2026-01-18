import unittest
import sys
import os

# Add backend to path so imports work
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app
from backend.database import get_db_connection

class BasicTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()

    def test_health_check(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'online')

    def test_config_assessment_types(self):
        response = self.app.get('/api/config/assessment-types')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        # Check for one of our known types
        names = [t['name'] for t in data]
        self.assertIn('Midterm', names)

    def test_grading_scale_config(self):
        response = self.app.get('/api/config/grading-scale')
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertIsInstance(data, list)
        self.assertTrue(any(d['letter_grade'] == 'A' for d in data))

if __name__ == '__main__':
    unittest.main()
