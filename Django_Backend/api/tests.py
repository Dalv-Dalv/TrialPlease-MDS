from django.test import TestCase

class SimpleTest(TestCase):
    def test_basic_addition(self):
        """A simple test to ensure the testing framework is working."""
        self.assertEqual(1 + 1, 2)
