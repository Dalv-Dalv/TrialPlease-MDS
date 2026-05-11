import os
import sys

# Ensure Python can find the api module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.ai_service import getAgentAcuserReply, getAgentDefendentReply, generateCase

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
    
    assert isinstance(prosecutor_reply, dict), "Prosecutor reply must be a JSON dictionary"
    assert "action" in prosecutor_reply, "Missing 'action' key"
    assert "reason" in prosecutor_reply, "Missing 'reason' key"
    assert "dialogue" in prosecutor_reply, "Missing 'dialogue' key"
    assert prosecutor_reply["action"] in ["statement", "objection"], "Action must be 'statement' or 'objection'"
    print("✅ Prosecutor JSON structure is valid!")
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
    
    assert isinstance(defense_reply, dict), "Defense reply must be a JSON dictionary"
    assert "action" in defense_reply, "Missing 'action' key"
    assert "reason" in defense_reply, "Missing 'reason' key"
    assert "dialogue" in defense_reply, "Missing 'dialogue' key"
    assert defense_reply["action"] in ["statement", "objection"], "Action must be 'statement' or 'objection'"
    print("✅ Defense JSON structure is valid!")
except Exception as e:
    print(f"\n❌ Error running Defense: {e}")
    import traceback
    traceback.print_exc()

print("\n\n=============================")
print("🧪 TESTING CASE GENERATION")
print("=============================")

try:
    # Test case generation
    generated_case = generateCase()
    print("\n[GENERATED CASE]:")
    print(json.dumps(generated_case, indent=2))
    
    assert isinstance(generated_case, dict), "Generated case must be a JSON dictionary"
    
    # Assert top-level keys
    required_keys = [
        "case_name", "case_type", "case_description", "police_report", 
        "absolute_truth", "defendant", "victim", "correct_verdict",
        "possible_choices", "evidence_items", "witnesses"
    ]
    for key in required_keys:
        assert key in generated_case, f"Missing '{key}' key in generated case"
        
    # Assert array structures
    assert isinstance(generated_case["possible_choices"], list), "'possible_choices' must be a list"
    assert len(generated_case["possible_choices"]) > 0, "'possible_choices' must not be empty"
    assert "verdict_option" in generated_case["possible_choices"][0], "Missing 'verdict_option' in possible_choices"
    assert "score_points" in generated_case["possible_choices"][0], "Missing 'score_points' in possible_choices"
    
    assert isinstance(generated_case["evidence_items"], list), "'evidence_items' must be a list"
    assert isinstance(generated_case["witnesses"], list), "'witnesses' must be a list"
    
    if len(generated_case["witnesses"]) > 0:
        witness = generated_case["witnesses"][0]
        assert "name" in witness, "Missing 'name' in witness"
        assert "role" in witness, "Missing 'role' in witness"
        assert "summary_statement" in witness, "Missing 'summary_statement' in witness"
        assert "hidden_truth" in witness, "Missing 'hidden_truth' in witness"
        
    print("✅ Generated Case JSON structure is valid!")
except Exception as e:
    print(f"\n❌ Error running Case Generation: {e}")
    import traceback
    traceback.print_exc()
