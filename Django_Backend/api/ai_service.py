import os
import json
from google import genai
from google.genai import types 
from dotenv import load_dotenv

# Încărcăm variabilele de mediu (asigură-te că fișierul .env e în același loc)
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

def genereaza_caz_cu_ai():
    client = genai.Client(api_key=API_KEY)
    with open("api/AgentPrompts/caseGenerator.txt", 'r') as file:
      prompt = file.read()
    # Facem cererea către Google Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    
    # Curățăm textul și îl facem dicționar (exact cum aveai în test.py)
    raw_text = response.text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]

    return json.loads(raw_text) # Returnăm DOAR dicționarul curat!