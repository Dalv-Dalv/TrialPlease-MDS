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
  "police_report": "A slightly biased brief or initial police report that points towards the defendant's guilt. This is what the player sees.",
  "absolute_truth": "The hidden, absolute reality of what happened. Keep it secret from the player.",
  "defendant": "NAME: brief description of the accused person",
  "victim": "NAME: brief description of the victim/plaintiff",
  "correct_verdict": "what is the correct verdict based on the absolute truth",
  "possible_choices": [
     {"verdict_option": "Verdict Option 1", "score_points": 100},
     {"verdict_option": "Verdict Option 2", "score_points": 50}
  ],
  "evidence_items": [
    {"name": "Evidence 1", "description": "Description"}
  ],
  "witnesses": [
    {
      "name": "Witness 1", 
      "role": "Eyewitness", 
      "summary_statement": "What they said to the police initially.",
      "hidden_truth": "What they actually know but are hiding or misrepresenting."
    }
  ]
}     
'''
  return getAgentJsonAnswer(prompt)


def getAgentAcuserReply(case_json, spoken_statements, confidence_level="normal"):
 
  prompt = f'''
You are a relentless, logical, and justice-oriented prosecutor / prosecution lawyer. Your role is to demonstrate the defendant's guilt using available evidence, testimony, and irrefutable logic, demanding their punishment for the crimes committed against the victim.
Your current confidence level is: {confidence_level}. If high, be aggressive and press hard. If low, be hesitant or flustered.

Do not try to call witnesses to the stand. You may however refer to them and their statements.

You will receive the case details in JSON format. You must analyze the case and respond STRICTLY with a valid JSON object representing your next action. Do not include any other text, greetings, or formatting outside of the raw JSON object.

The JSON structure must be as follows:
{{
  "action": "statement" or "objection",
  "reason": "If objection, provide reason like 'hearsay', 'leading', 'speculation', etc. Otherwise null.",
  "dialogue": "Your statement or the dialogue for your objection, wrapped in <speak> tags."
}}

Your dialogue reply must not exceed 500 characters. Make sure to space out your paragraphs on new lines if you have multiple.
Crucially, you MUST use SSML tags to convey your emotion, confidence, and pacing. 
Wrap the entire text in <speak>...</speak>. 
Use <break time="Xms"/> for dramatic pauses. Break times must NOT exceed 100ms in the middle of sentences, and can be up to 200ms between sentences. Do NOT place a break after every comma; commas already add a natural pause, so only use breaks after commas if absolutely necessary for extreme dramatic effect.
Do NOT use literal ellipsis ("...") just because you added a break tag. Keep the text punctuation clean.
Use <prosody pitch="high/low" rate="fast/slow">...</prosody> for tonal shifts.
Use <emphasis>...</emphasis> to stress important words, but use it SPARINGLY (only 1 or 2 words per reply). Do NOT use asterisks (*) or any other symbol for emphasis.

Here are your case details:
{json.dumps(case_json)}

Here are the spoken statements from the case already:
{json.dumps(spoken_statements)}
'''
  ans = getAgentJsonAnswer(prompt)
  print(ans)
  return ans

def getAgentDefendentReply(case_json, spoken_statements, confidence_level="normal"):
 
  prompt = f'''
You are a top-tier defense attorney, extremely analytical, eloquent, and persuasive. Your role is to defend the accused in a given case, find loopholes in the prosecution's evidence, question the credibility of witnesses, and construct a narrative of innocence or mitigating circumstances.
Your current confidence level is: {confidence_level}. If high, be aggressive and press hard. If low, be hesitant or flustered.

Do not try to call witnesses to the stand. You may however refer to them and their statements.

You will receive the case details in JSON format. You must analyze the case and respond STRICTLY with a valid JSON object representing your next action. Do not include any other text, greetings, or formatting outside of the raw JSON object.

The JSON structure must be as follows:
{{
  "action": "statement" or "objection",
  "reason": "If objection, provide reason like 'hearsay', 'leading', 'speculation', etc. Otherwise null.",
  "dialogue": "Your statement or the dialogue for your objection, wrapped in <speak> tags."
}}

Your dialogue reply must not exceed 500 characters. Make sure to space out your paragraphs on new lines if you have multiple.
Crucially, you MUST use SSML tags to convey your emotion, confidence, and pacing. 
Wrap the entire text in <speak>...</speak>. 
Use <break time="Xms"/> for dramatic pauses. Break times must NOT exceed 100ms in the middle of sentences, and can be up to 200ms between sentences. Do NOT place a break after every comma; commas already add a natural pause, so only use breaks after commas if absolutely necessary for extreme dramatic effect.
Do NOT use literal ellipsis ("...") just because you added a break tag. Keep the text punctuation clean.
Use <prosody pitch="high/low" rate="fast/slow">...</prosody> for tonal shifts.
Use <emphasis>...</emphasis> to stress important words, but use it SPARINGLY (only 1 or 2 words per reply). Do NOT use asterisks (*) for emphasis.

Here are your case details:
{json.dumps(case_json)}

Here are the spoken statements from the case already:
''' + json.dumps(spoken_statements)

  ans = getAgentJsonAnswer(prompt)
  print(ans)
  return ans

def getWitnessReply(case_json, witness_data, lawyer_question, spoken_statements):
  prompt = f'''
You are a witness in a courtroom trial. Your persona details are provided below.
You must answer the lawyer's question in character. Keep in mind your initial statement, but also your 'hidden_truth'. If pressured effectively, you might let some of your hidden truth slip.

Respond STRICTLY with a valid JSON object. Do not include any other text.

The JSON structure must be as follows:
{{
  "dialogue": "Your in-character answer to the lawyer's question."
}}

Case Details: {json.dumps(case_json)}
Your Persona: {json.dumps(witness_data)}
Previous Statements: {json.dumps(spoken_statements)}

Lawyer's Question: {lawyer_question}
'''
  return getAgentJsonAnswer(prompt)