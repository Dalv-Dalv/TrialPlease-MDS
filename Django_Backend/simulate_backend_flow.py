import urllib.request
import json
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api/cases"

def post_json(url, payload=None):
    data = json.dumps(payload).encode('utf-8') if payload else b'{}'
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
        exit(1)

print("=========================================")
print("🎬 FULL BACKEND GAMEFLOW SIMULATION 🎬")
print("=========================================\n")

# 1. Generate Case
print("⏳ [1] GENERATING NEW CASE (POST /generate/)...")
case_resp = post_json(f"{BASE_URL}/generate/")
case_data = case_resp["case"]
case_id = case_data["id"]
print(f"✅ Case Generated: {case_data['case_name']} (ID: {case_id})")

transcript = []

# 2. Prosecutor Opening
print("\n⏳ [2] PROSECUTOR OPENING (POST /lawyer_action/)...")
pros_payload = {
    "lawyer_type": "prosecutor",
    "confidence_level": "normal",
    "transcript": transcript
}
pros_reply = post_json(f"{BASE_URL}/{case_id}/lawyer_action/", pros_payload)
print(f"⚖️ Prosecutor ({pros_reply.get('action', 'statement')}): {pros_reply.get('dialogue', '')}")
transcript.append({"side": "prosecutor", "text": pros_reply.get("dialogue", "")})

# 3. Defense Opening
print("\n⏳ [3] DEFENSE REBUTTAL (POST /lawyer_action/)...")
def_payload = {
    "lawyer_type": "defense",
    "confidence_level": "normal",
    "transcript": transcript
}
def_reply = post_json(f"{BASE_URL}/{case_id}/lawyer_action/", def_payload)
print(f"⚖️ Defense ({def_reply.get('action', 'statement')}): {def_reply.get('dialogue', '')}")
transcript.append({"side": "defense", "text": def_reply.get("dialogue", "")})

# 4. Witness Cross-Examination
print("\n⏳ [4] CROSS-EXAMINING WITNESS (POST /witness_answer/)...")
if case_data["witnesses"]:
    witness = case_data["witnesses"][0]
    wit_payload = {
        "witness_id": witness["id"],
        "question": "Where were you exactly when the crime took place? Be specific.",
        "transcript": transcript
    }
    wit_reply = post_json(f"{BASE_URL}/{case_id}/witness_answer/", wit_payload)
    print(f"🗣️ Witness {witness['name']} answers: {wit_reply.get('dialogue', '')}")
else:
    print("⚠️ No witnesses in this case.")

# 5. Debrief
print("\n⏳ [5] RENDERING VERDICT (POST /debrief/)...")
debrief_payload = {
    "verdict": "Guilty"
}
debrief_reply = post_json(f"{BASE_URL}/{case_id}/debrief/", debrief_payload)
print("✅ DEBRIEF RECEIVED:")
print(json.dumps(debrief_reply, indent=2))

print("\n🎉 GAMEFLOW TEST COMPLETE!")
