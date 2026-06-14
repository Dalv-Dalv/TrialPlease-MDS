import os
import sys
import json

# Ensure Python can find the api module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.ai_service import Prosecutor, DefenseAttorney, CaseArchitect, AIEvaluator, WitnessAgent

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
print("[TEST] TESTING PROSECUTOR AI")
print("=============================")
try:
    # Test Prosecutor with 'high' confidence
    prosecutor = Prosecutor()
    prosecutor_reply = prosecutor.get_reply(mock_case, mock_transcript, confidence_level="high")
    print("\n[PROSECUTOR RESPONSE]:")
    print(json.dumps(prosecutor_reply, indent=2))
    
    assert isinstance(prosecutor_reply, dict), "Prosecutor reply must be a JSON dictionary"
    assert "action" in prosecutor_reply, "Missing 'action' key"
    assert "reason" in prosecutor_reply, "Missing 'reason' key"
    assert "dialogue" in prosecutor_reply, "Missing 'dialogue' key"
    assert prosecutor_reply["action"] in ["statement", "objection"], "Action must be 'statement' or 'objection'"
    print("[OK] Prosecutor JSON structure is valid!")
    
    evaluator = AIEvaluator()
    print("\n[EVALUATING PROSECUTOR RESPONSE QUALITY...]")
    prosecutor_evaluation = evaluator.evaluate_lawyer_reply(
        case_json=mock_case,
        spoken_statements=mock_transcript,
        role="Prosecutor",
        reply=prosecutor_reply
    )
    print("[PROSECUTOR EVALUATION]:")
    print(json.dumps(prosecutor_evaluation, indent=2))
    
    assert isinstance(prosecutor_evaluation, dict), "Evaluation result must be a dictionary"
    for key in ["role_adherence", "coherence", "relevance", "argument_quality", "overall_quality", "feedback"]:
        assert key in prosecutor_evaluation, f"Missing key '{key}' in evaluation result"
    
    assert prosecutor_evaluation["overall_quality"] >= 7, f"Prosecutor overall quality too low: {prosecutor_evaluation['overall_quality']}/10. Feedback: {prosecutor_evaluation['feedback']}"
    print("[OK] Prosecutor reply quality is high! (Overall Quality >= 7)")
except Exception as e:
    print(f"\n[ERROR] Error running Prosecutor: {e}")
    import traceback
    traceback.print_exc()

print("\n\n=============================")
print("[TEST] TESTING DEFENSE AI")
print("=============================")

# Update transcript to simulate the trial moving forward
mock_transcript.append({
    "side": "prosecutor", 
    "text": "The defendant was clearly caught red-handed. The police report confirms he was found holding the bag!"
})

try:
    defenceAgent = DefenseAttorney()
    # Test Defense with 'normal' confidence responding to the prosecutor
    defense_reply = defenceAgent.get_reply(mock_case, mock_transcript, confidence_level="normal")
    print("\n[DEFENSE RESPONSE]:")
    print(json.dumps(defense_reply, indent=2))
    
    assert isinstance(defense_reply, dict), "Defense reply must be a JSON dictionary"
    assert "action" in defense_reply, "Missing 'action' key"
    assert "reason" in defense_reply, "Missing 'reason' key"
    assert "dialogue" in defense_reply, "Missing 'dialogue' key"
    assert defense_reply["action"] in ["statement", "objection"], "Action must be 'statement' or 'objection'"
    print("[OK] Defense JSON structure is valid!")
    
    evaluator = AIEvaluator()
    print("\n[EVALUATING DEFENSE RESPONSE QUALITY...]")
    defense_evaluation = evaluator.evaluate_lawyer_reply(
        case_json=mock_case,
        spoken_statements=mock_transcript,
        role="Defense Attorney",
        reply=defense_reply
    )
    print("[DEFENSE EVALUATION]:")
    print(json.dumps(defense_evaluation, indent=2))
    
    assert isinstance(defense_evaluation, dict), "Evaluation result must be a dictionary"
    for key in ["role_adherence", "coherence", "relevance", "argument_quality", "overall_quality", "feedback"]:
        assert key in defense_evaluation, f"Missing key '{key}' in evaluation result"
        
    assert defense_evaluation["overall_quality"] >= 7, f"Defense overall quality too low: {defense_evaluation['overall_quality']}/10. Feedback: {defense_evaluation['feedback']}"
    print("[OK] Defense reply quality is high! (Overall Quality >= 7)")
except Exception as e:
    print(f"\n[ERROR] Error running Defense: {e}")
    import traceback
    traceback.print_exc()

print("\n\n=============================")
print("[TEST] TESTING CASE GENERATION")
print("=============================")

try:
    # Test case generation
    caseArchitect = CaseArchitect()
    generated_case = caseArchitect.generate_case()
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
    if len(generated_case["evidence_items"]) > 0:
        evidence = generated_case["evidence_items"][0]
        assert "name" in evidence, "Missing 'name' in evidence"
        assert "description" in evidence, "Missing 'description' in evidence"
        assert "image" in evidence, "Missing 'image' in evidence"

    assert isinstance(generated_case["witnesses"], list), "'witnesses' must be a list"
    
    if len(generated_case["witnesses"]) > 0:
        witness = generated_case["witnesses"][0]
        assert "name" in witness, "Missing 'name' in witness"
        assert "role" in witness, "Missing 'role' in witness"
        assert "summary_statement" in witness, "Missing 'summary_statement' in witness"
        assert "hidden_truth" in witness, "Missing 'hidden_truth' in witness"
        
    print("[OK] Generated Case JSON structure is valid!")
    
    evaluator = AIEvaluator()
    print("\n[EVALUATING CASE GENERATION QUALITY...]")
    case_evaluation = evaluator.evaluate_case_generation(generated_case)
    print("[CASE GENERATION EVALUATION]:")
    print(json.dumps(case_evaluation, indent=2))
    
    assert isinstance(case_evaluation, dict), "Evaluation result must be a dictionary"
    for key in ["case_coherence", "legal_playability", "completeness", "overall_quality", "feedback"]:
        assert key in case_evaluation, f"Missing key '{key}' in evaluation result"
        
    assert case_evaluation["overall_quality"] >= 7, f"Case generation overall quality too low: {case_evaluation['overall_quality']}/10. Feedback: {case_evaluation['feedback']}"
    print("[OK] Case generation quality is high! (Overall Quality >= 7)")
except Exception as e:
    print(f"\n[ERROR] Error running Case Generation: {e}")
    import traceback
    traceback.print_exc()

print("\n\n=============================")
print("[TEST] TESTING WITNESS AI")
print("=============================")

try:
    if 'generated_case' in locals() and generated_case.get("witnesses"):
        witness_data = generated_case["witnesses"][0]
        witness_agent = WitnessAgent()
        
        lawyer_question = "Where were you at the time of the event? Can you explain the flour trail?"
        
        # Test witness response
        witness_reply = witness_agent.get_reply(
            case_json=generated_case,
            witness_data=witness_data,
            lawyer_question=lawyer_question,
            spoken_statements=mock_transcript
        )
        
        print("\n[WITNESS RESPONSE]:")
        print(json.dumps(witness_reply, indent=2))
        
        assert isinstance(witness_reply, dict), "Witness reply must be a JSON dictionary"
        assert "dialogue" in witness_reply, "Missing 'dialogue' key in witness reply"
        print("[OK] Witness JSON structure is valid!")
        
        evaluator = AIEvaluator()
        print("\n[EVALUATING WITNESS RESPONSE QUALITY...]")
        witness_evaluation = evaluator.evaluate_witness_reply(
            case_json=generated_case,
            witness_data=witness_data,
            lawyer_question=lawyer_question,
            spoken_statements=mock_transcript,
            reply=witness_reply
        )
        print("[WITNESS EVALUATION]:")
        print(json.dumps(witness_evaluation, indent=2))
        
        assert isinstance(witness_evaluation, dict), "Evaluation result must be a dictionary"
        for key in ["role_adherence", "coherence", "relevance", "reveal_control", "overall_quality", "feedback"]:
            assert key in witness_evaluation, f"Missing key '{key}' in evaluation result"
        assert witness_evaluation["overall_quality"] >= 7, f"Witness overall quality too low: {witness_evaluation['overall_quality']}/10. Feedback: {witness_evaluation['feedback']}"
        print("[OK] Witness reply quality is high! (Overall Quality >= 7)")
    else:
        print("[SKIP] No generated case/witness available to test Witness AI.")
except Exception as e:
    print(f"\n[ERROR] Error running Witness: {e}")
    import traceback
    traceback.print_exc()
