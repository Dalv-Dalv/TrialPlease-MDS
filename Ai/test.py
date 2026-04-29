import os
from google import genai
from google.genai import types 
from dotenv import load_dotenv

API_KEY = os.getenv("GEMINI_API_KEY")

def intreaba_gemini():
    client = genai.Client(api_key=API_KEY)
    
    prompt = '''
Ești un asistent juridic profesionist și un arhitect de scenarii pentru un joc de simulare a unei săli de judecată. Sarcina ta este să creezi un caz judiciar fictiv, complex și echilibrat, care să lase loc de argumentare atât pentru apărare, cât și pentru acuzare. 

Trebuie să generezi detaliile cazului și să răspunzi STRICT cu un obiect JSON valid. Nu include niciun alt text, salut, explicație sau formatare Markdown (cum ar fi ```json) în afara obiectului JSON în sine.

Structura JSON trebuie să fie următoarea:
{
  "id_caz": "Un identificator unic (ex. C-2026-001)",
  "nume_caz": "Titlul oficial al cazului (ex. Statul vs. Popescu)",
  "tip_caz": "Penal sau Civil",
  "descriere_caz": "Un rezumat obiectiv al evenimentelor (max. 150 cuvinte)",
  "acuzat": "Numele și o scurtă descriere a persoanei acuzate",
  "victima": "Numele și o scurtă descriere a victimei/reclamantului",
  "capete_de_acuzare": ["Acuzatia 1", "Acuzatia 2"],
  "dovezi": [
    {"nume": "Dovada 1", "descriere": "Descrierea dovezii"}
  ],
  "martori": [
    {"nume": "Martor 1", "rol": "ex. Martor ocular", "declaratie_sumara": "Ce a văzut/auzit"}
  ]
}   
'''
    
    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        print("\n--- RĂSPUNS JSON ---")
        print(response.text)
        print("--------------------\n")
        
    except Exception as e:
        print(f"Eroare detectată: {e}")

if __name__ == "__main__":
    intreaba_gemini()