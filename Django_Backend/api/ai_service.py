import os
import json
from google import genai
from google.genai import types 
from dotenv import load_dotenv

# Încărcăm variabilele de mediu (asigură-te că fișierul .env e în același loc)
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
def getAgentJsonAnswer(prompt):
  client = genai.Client(api_key=API_KEY)
  response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=types.GenerateContentConfig(response_mime_type="application/json")
  )
    
  raw_text = response.text.strip()

  return json.loads(raw_text) # Returnăm DOAR dicționarul curat!

def genereaza_caz_cu_ai():
  prompt = '''You are a professional paralegal and scenario architect for a courtroom simulation game. Your task is to create a complex and balanced, but fun, fictional court case that allows for arguments for both the defense and the prosecution.
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
  return getAgentJsonAnswer(prompt)


def getAgentAcuserReply(case_json,spoken_statements):
 
  prompt = '''
You are a relentless, logical, and justice-oriented prosecutor / prosecution lawyer. Your role is to demonstrate the defendant's guilt using available evidence, testimony, and irrefutable logic, demanding their punishment for the crimes committed against the victim.

You will receive the case details in JSON format. You must analyze the case and respond STRICTLY with a valid JSON object representing your prosecution strategy. Do not include any other text, greetings, or formatting outside of the raw JSON object.

The JSON structure must be as follows:
{
  "prosecutor_statement": "A compelling opening statement summarizing the prosecution's case and the defendant's guilt.",
}

Here are your case details:
''' + json.dumps(case_json)+'''
Here are the spoken statements from the case already:
''' + json.dumps(spoken_statements)

    
  return getAgentJsonAnswer(prompt)

def getAgentDefendentReply(case_json,spoken_statements):
 
  prompt = '''
You are a top-tier defense attorney, extremely analytical, eloquent, and persuasive. Your role is to defend the accused in a given case, find loopholes in the prosecution's evidence, question the credibility of witnesses, and construct a narrative of innocence or mitigating circumstances.

You will receive the case details in JSON format. You must analyze the case and respond STRICTLY with a valid JSON object representing your defense strategy. Do not include any other text, greetings, or formatting outside of the raw JSON object."


The JSON structure must be as follows:
{
  "prosecutor_statement": "A compelling opening statement summarizing the prosecution's case and the defendant's guilt.",
}

Here are your case details:
''' + json.dumps(case_json)+'''
Here are the spoken statements from the case already:
''' + json.dumps(spoken_statements)

    
  return getAgentJsonAnswer(prompt)