import os
import sys

# Ensure Python can find the api module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.ai_service import getAgentAcuserReply, getAgentDefendentReply

# Mock a simple case and transcript
mock_case = {
    "case_name": "The Great Vault Heist",
    "defendant": "John 'Slippery' Doe - Accused of breaking into the bank vault.",
    "victim": "The First National Bank",
    "police_report": "The defendant was found near the bank vault with a bag of money. The vault was breached.",
}

mock_transcript = [
    {"side": "judge", "text": "The prosecution may begin."}
]

print("=============================")
print("🧪 TESTING PROSECUTOR AI")
print("=============================")
try:
    # Test Prosecutor with 'high' confidence
    prosecutor_reply = getAgentAcuserReply(mock_case, mock_transcript, confidence_level="high")
    print("\n[PROSECUTOR RESPONSE]:")
    import json
    print(json.dumps(prosecutor_reply, indent=2))
except Exception as e:
    print(f"\n❌ Error running Prosecutor: {e}")
    import traceback
    traceback.print_exc()

print("\n\n=============================")
print("🧪 TESTING DEFENSE AI")
print("=============================")

# Update transcript to simulate the trial moving forward
mock_transcript.append({
    "side": "prosecutor", 
    "text": "The defendant was clearly caught red-handed. The police report confirms he was found holding the bag!"
})

try:
    # Test Defense with 'normal' confidence responding to the prosecutor
    defense_reply = getAgentDefendentReply(mock_case, mock_transcript, confidence_level="normal")
    print("\n[DEFENSE RESPONSE]:")
    print(json.dumps(defense_reply, indent=2))
except Exception as e:
    print(f"\n❌ Error running Defense: {e}")
    import traceback
    traceback.print_exc()
