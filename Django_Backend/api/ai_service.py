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
    
    prompt = '''
You are a professional paralegal and scenario architect for a courtroom simulation game. Your task is to create a complex and balanced, but fun, fictional court case that allows for arguments for both the defense and the prosecution.
The court case should be fun and interesting.
You must generate the case details and respond STRICTLY with a valid JSON object. 

The JSON structure MUST be exactly the following:
{
  "case_name": "The official title of the case",
  "case_type": "Criminal or Civil",
  "case_description": "An objective summary of the events",
  "defendant": "NAME: brief description of the accused person",
  "victim": "NAME: brief description of the victim/plaintiff",
  "correct_verdict": "what is the correct verdict",
  "possible_choices": [
     {"verdict_option": "Verdict Option 1", "score_points": 100},
     {"verdict_option": "Verdict Option 2", "score_points": 50}
  ],
  "evidence_items": [
    {"name": "Evidence 1", "description": "Description"}
  ],
  "witnesses": [
    {"name": "Witness 1", "role": "Eyewitness", "summary_statement": "What they saw"}
  ]
}     
'''
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