import os
from google import genai
from google.genai import types 
from dotenv import load_dotenv


load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

def intreaba_gemini():
    client = genai.Client(api_key=API_KEY)
    
    prompt = '''
You are a professional paralegal and scenario architect for a courtroom simulation game. Your task is to create a complex and balanced fictional court case that allows for arguments for both the defense and the prosecution.

You must generate the case details and respond STRICTLY with a valid JSON object. Do not include any other text, greetings, explanations, or Markdown formatting (such as ```json) outside of the JSON object itself.
json structure must be the following
{`
  "case_name": "The official title of the case (e.g., The State vs. Popescu)",
  "case_type": "Criminal or Civil",
  "case_description": "An objective summary of the events (max. 150 words)",
  "defendant": "The name and a brief description of the accused person",
  "victim": "The name and a brief description of the victim/plaintiff",
  "possible_choises": a list of possible choises, each choise must have 2 fields, evidence name, score points in a range from 1 to 100, only one choise shoud have 100 points, if the verdict is better it must have more for the judge, must be at least 4 choises,
  "evidence": [
    {"name": "Evidence 1", "description": "Description of the evidence"}
  ],
  "witnesses": [
    {"name": "Witness 1", "role": "e.g., Eyewitness", "summary_statement": "What they saw/heard"}
  ]
  "correct_verdict":"what is the correct verdict for this situantion"
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