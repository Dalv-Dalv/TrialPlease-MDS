import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client

c = Client(raise_request_exception=True)
try:
    response = c.post('/api/register/', {'username': 'testuser1234', 'email': 'test2@user.com', 'password': 'testpassword123'})
    print("Status Code:", response.status_code)
    print("Response:", response.json())
except Exception as e:
    print("ERROR:", e)
