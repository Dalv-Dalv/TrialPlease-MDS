import os
import json
import random
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel
class EvaluationSchema(BaseModel):
    role_adherence: int
    coherence: int
    relevance: int
    argument_quality: int
    overall_quality: int
    feedback: str
class GeminiAgent:
  """Base class to handle Gemini API connections and JSON formatting."""
  def __init__(self, model: str = "gemini-2.5-flash"):
    load_dotenv()
    self.api_key = os.getenv("GEMINI_API_KEY")
    if not self.api_key:
      raise ValueError("GEMINI_API_KEY not found in environment variables.")
    
    self.client = genai.Client(api_key=self.api_key)
    self.model = model

def get_json_answer(self, prompt: str, schema: type[BaseModel] = None) -> dict:
    """Sends the prompt to Gemini and parses the strict JSON response."""
    
    config_args = {"response_mime_type": "application/json"}
    if schema:
        config_args["response_schema"] = schema

    response = self.client.models.generate_content(
      model=self.model,
      contents=prompt,
      config=types.GenerateContentConfig(**config_args)
    )
    raw_text = response.text.strip()
    
    print(f"==== AI RESPONSE ({self.__class__.__name__}) ====")
    print(raw_text)
    print("=====================")
    
    # Strip markdown code blocks if any
    if raw_text.startswith("```"):
      first_newline = raw_text.find("\n")
      last_backticks = raw_text.rfind("```")
      if first_newline != -1 and last_backticks != -1:
        raw_text = raw_text[first_newline+1:last_backticks].strip()
        
    try:
      return json.loads(raw_text)
    except json.JSONDecodeError:
      # Attempt to repair common JSON syntax issues
      import re
      
      # Fix invalid backslash escapes
      def replace_invalid(match):
          pos = match.start()
          sub = raw_text[pos+1 : pos+6]
          if not sub:
              return "\\\\"
          first = sub[0]
          if first in ['"', '\\', '/', 'b', 'f', 'n', 'r', 't']:
              return "\\"
          if first == 'u' and len(sub) >= 5 and all(c in '0-9a-fA-F' for c in sub[1:5]):
              return "\\"
          return "\\\\"
          
      repaired_text = re.sub(r'\\', replace_invalid, raw_text)
      
      # Fix trailing commas in objects and arrays
      repaired_text = re.sub(r',\s*([\]}])', r'\1', repaired_text)
      
      try:
        return json.loads(repaired_text)
      except Exception:
        # If repair fails, fall back to parsing the original raw text
        return json.loads(raw_text)


class CaseArchitect(GeminiAgent):
  """Responsible for generating the courtroom simulation case."""
  
  def generate_case(self) -> dict:
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
    return self.get_json_answer(prompt)


class BaseLawyer(GeminiAgent):
    """Base class for the attorneys containing shared prompt logic."""
    def __init__(self):
        super().__init__()
        self.role_name = "Lawyer"
        self.opponent_side = "unknown"
        self.persona_instructions = ""

    def _determine_objection(self, phase: str, spoken_statements: list) -> bool:
        """Determines if the lawyer should forcefully object to the opponent's last statement."""
        if phase == 'evidence_debate' and len(spoken_statements) > 0:
            last_action = spoken_statements[-1]
            if last_action.get('kind') == 'evidence_argument' and last_action.get('side') == self.opponent_side:
                return random.choice([True, False])
        return False

    def get_reply(self, case_json: dict, spoken_statements: list, confidence_level: str = "normal", phase: str = "unknown", evidence_name: str = None) -> dict:
        evidence_context = f"We are currently debating this piece of evidence: {evidence_name}" if evidence_name else "We are NOT currently discussing a specific piece of evidence."
        
        force_objection = self._determine_objection(phase, spoken_statements)
        print(f"[{self.role_name.upper()}] Phase: {phase}, Force Objection: {force_objection}")
        
        objection_rule = (
            "CRITICAL INSTRUCTION: For your JSON response this turn, you MUST set 'action' to 'objection' and provide a valid 'reason' to object to the opponent's last statement." 
            if force_objection 
            else "CRITICAL INSTRUCTION: For your JSON response this turn, you MUST set 'action' to 'statement'. Do NOT object."
        )

        prompt = f'''
{self.persona_instructions}
Your current confidence level is: {confidence_level}. If high, be aggressive and press hard. If low, be hesitant or flustered.

TRIAL CONTEXT:
Current Trial Phase: {phase}
{evidence_context}
{objection_rule}

Do not try to call witnesses to the stand. You may however refer to them and their statements.

You will receive the case details in JSON format. You must analyze the case and respond STRICTLY with a valid JSON object representing your next action. Do not include any other text, greetings, or formatting outside of the raw JSON object.

The JSON structure must be as follows:
{{
  "action": "statement" or "objection",
  "reason": "If objection, provide reason like 'hearsay', 'leading', 'speculation', etc. Otherwise null.",
  "dialogue": "Your statement or the dialogue for your objection."
}}

Your dialogue reply must not exceed 500 characters. Make sure to space out your paragraphs on new lines if you have multiple.

If the last event in the transcript is an 'objection_ruling', pay close attention:
- If YOUR objection was 'sustained', you won. The opponent's last statement is stricken. You should confidently continue your point.
- If YOUR objection was 'overruled' (rejected), you lost. You must accept the judge's decision and adjust your argument.
- If YOUR OPPONENT'S objection against you was 'sustained', your last statement is stricken. You must apologize to the court and provide a new, different argument.
- If YOUR OPPONENT'S objection against you was 'overruled' (rejected), you won. You may continue pressing your point.

Here are your case details:
{json.dumps(case_json)}

Here are the spoken statements from the case already:
{json.dumps(spoken_statements)}
'''
        return self.get_json_answer(prompt)


class Prosecutor(BaseLawyer):
    """Specific implementation for the prosecution."""
    def __init__(self):
        super().__init__()
        self.role_name = "Prosecutor"
        self.opponent_side = "defense"
        self.persona_instructions = "You are a relentless, logical, and justice-oriented prosecutor / prosecution lawyer. Your role is to demonstrate the defendant's guilt using available evidence, testimony, and irrefutable logic, demanding their punishment for the crimes committed against the victim."


class DefenseAttorney(BaseLawyer):
    """Specific implementation for the defense."""
    def __init__(self):
        super().__init__()
        self.role_name = "Defense"
        self.opponent_side = "prosecution"
        self.persona_instructions = "You are a top-tier defense attorney, extremely analytical, eloquent, and persuasive. Your role is to defend the accused in a given case, find loopholes in the prosecution's evidence, question the credibility of witnesses, and construct a narrative of innocence or mitigating circumstances."


class WitnessAgent(GeminiAgent):
    """Handles generating replies for witnesses on the stand."""
    
    def get_reply(self, case_json: dict, witness_data: dict, lawyer_question: str, spoken_statements: list) -> dict:
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
        return self.get_json_answer(prompt)


class AIEvaluator(GeminiAgent):
    """Responsible for evaluating the quality of AI responses."""
    
    def evaluate_lawyer_reply(self, case_json: dict, spoken_statements: list, role: str, reply: dict) -> dict:
        """Evaluates a lawyer's reply (Prosecutor or Defense) for quality."""
        prompt = f"""You are an expert AI quality evaluator and legal analyst. Your task is to evaluate the quality of an AI-generated courtroom response (either prosecutor or defense) based on the case details and the transcript of spoken statements.

You must evaluate the response on the following criteria:
1. Role Adherence (1-10): Did the AI sound like a proper lawyer of their side?
2. Coherence and Flow (1-10): Is the reply logical and coherent?
3. Relevance (1-10): Is the response directly relevant to the case context and the trial transcript?
4. Quality of Argument (1-10): Is the argument persuasive or logical?
5. Overall Quality (1-10): Combined score.
6. Feedback: Detailed commentary on what was good or what could be improved.

Response to evaluate:
{json.dumps(reply)}

Context:
Role: {role}
Case Details: {json.dumps(case_json)}
Transcript: {json.dumps(spoken_statements)}

Respond STRICTLY with a valid JSON object of this structure:
{{
  "role_adherence": <score between 1 and 10>,
  "coherence": <score between 1 and 10>,
  "relevance": <score between 1 and 10>,
  "argument_quality": <score between 1 and 10>,
  "overall_quality": <score between 1 and 10>,
  "feedback": "detailed feedback text"
}}
"""
        return self.get_json_answer(prompt,schema=EvaluationSchema)

    def evaluate_case_generation(self, generated_case: dict) -> dict:
        """Evaluates the quality of a generated courtroom case."""
        prompt = f"""You are an expert scenario evaluator. Evaluate the quality of the generated courtroom case.

Criteria:
1. Scenario Coherence (1-10): Are case description, police report, and absolute truth consistent?
2. Legal Playability (1-10): Is the case interesting and balanced for both prosecution and defense?
3. Completeness (1-10): Are evidence items and witnesses fully detailed and relevant?
4. Overall Quality (1-10): Combined score.
5. Feedback: Detailed commentary on what was good or what could be improved.

Respond STRICTLY with a valid JSON object of this structure:
{{
  "scenario_coherence": <score between 1 and 10>,
  "legal_playability": <score between 1 and 10>,
  "completeness": <score between 1 and 10>,
  "overall_quality": <score between 1 and 10>,
  "feedback": "detailed feedback text"
}}

Generated Case:
{json.dumps(generated_case)}
"""
        return self.get_json_answer(prompt,schema=EvaluationSchema)