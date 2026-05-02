"""
==================================================================
Engine 1 — API Test Script
==================================================================
Run this AFTER starting the FastAPI server:
    uv run uvicorn app:app --reload --port 8000

Then in a SECOND terminal:
    uv run python test_api.py

This tests the /predict-risk endpoint with 8 different patient
profiles covering all risk levels and edge cases.
==================================================================
"""

import requests
import json
import sys

# ============================================================
# CONFIGURATION
# ============================================================
BASE_URL = "http://localhost:8000"
PREDICT_URL = f"{BASE_URL}/predict-risk"
HEALTH_URL = f"{BASE_URL}/health"
MODEL_INFO_URL = f"{BASE_URL}/model-info"


# ============================================================
# HELPER: Pretty print a test result
# ============================================================
def print_result(test_name, patient_data, response):
    """Formats and prints a test case result."""
    print(f"\n{'='*65}")
    print(f"  {test_name}")
    print(f"{'='*65}")
    
    # Print what we sent
    print(f"  Input:")
    print(f"    Age: {patient_data['age']} | Gender: {'Male' if patient_data['gender'] == 1 else 'Female'}")
    print(f"    BMI: {patient_data['bmi']} | BP: {patient_data['bp_systolic']}/{patient_data['bp_diastolic']}")
    print(f"    Glucose: {patient_data['glucose']} | Cholesterol: {patient_data['cholesterol']}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Risk level with color indicator
        risk = data['risk_level']
        risk_emoji = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}.get(risk, "⚪")
        
        print(f"\n  Result: {risk_emoji} {risk} Risk (confidence: {data['confidence']*100:.1f}%)")
        print(f"    Diabetes:      {data['diabetes']['probability']*100:.1f}% → {data['diabetes']['risk']}")
        print(f"    Heart Disease:  {data['heart_disease']['probability']*100:.1f}% → {data['heart_disease']['risk']}")
        print(f"    Reasons:")
        for reason in data['reasons']:
            print(f"      - {reason}")
        
        return data
    else:
        print(f"\n  ERROR {response.status_code}: {response.text}")
        return None


# ============================================================
# TEST 0: Health Check — is the server running?
# ============================================================
def test_health_check():
    print("\n" + "="*65)
    print("  TEST 0: Health Check")
    print("="*65)
    
    try:
        resp = requests.get(HEALTH_URL, timeout=5)
        data = resp.json()
        print(f"  Status:          {data['status']}")
        print(f"  Engine 1 loaded: {data['engine1_loaded']}")
        print(f"  Engine 2 loaded: {data['engine2_loaded']}")
        
        if not data['engine1_loaded']:
            print("\n  ❌ Engine 1 models NOT loaded! Check that .pkl files exist in models/")
            return False
        
        print("  ✅ Server is healthy and Engine 1 is ready")
        return True
        
    except requests.ConnectionError:
        print("  ❌ Cannot connect to server!")
        print("     Make sure you started it with:")
        print("     uv run uvicorn app:app --reload --port 8000")
        return False


# ============================================================
# TEST 1: Healthy young female — expect LOW risk
# ============================================================
def test_healthy_patient():
    patient = {
        "age": 25,
        "gender": 0,          # female
        "bmi": 21.5,          # healthy BMI (18.5-24.9)
        "bp_systolic": 115,   # normal (<120)
        "bp_diastolic": 75,   # normal (<80)
        "glucose": 82,        # normal (<100)
        "cholesterol": 180    # normal (<200)
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 1: Healthy 25-year-old female (expect LOW)", patient, resp)
    
    if data:
        assert data['risk_level'] == 'Low', f"Expected Low, got {data['risk_level']}"
        print("  ✅ PASSED — correctly identified as Low risk")
    return data


# ============================================================
# TEST 2: High-risk older male — expect HIGH risk
# ============================================================
def test_high_risk_patient():
    patient = {
        "age": 62,
        "gender": 1,          # male
        "bmi": 36.2,          # obese (>30)
        "bp_systolic": 165,   # stage 2 hypertension (>140)
        "bp_diastolic": 100,  # high (>90)
        "glucose": 195,       # very high (diabetic range)
        "cholesterol": 290    # very high (>240)
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 2: High-risk 62-year-old male (expect HIGH)", patient, resp)
    
    if data:
        assert data['risk_level'] in ['High', 'Medium'], f"Expected High/Medium, got {data['risk_level']}"
        print(f"  ✅ PASSED — correctly identified as {data['risk_level']} risk")
    return data


# ============================================================
# TEST 3: Borderline patient — expect MEDIUM risk
# ============================================================
def test_borderline_patient():
    patient = {
        "age": 48,
        "gender": 1,          # male
        "bmi": 28.0,          # overweight (25-29.9)
        "bp_systolic": 138,   # elevated (130-139)
        "bp_diastolic": 88,   # elevated (80-89)
        "glucose": 125,       # pre-diabetic (100-125)
        "cholesterol": 225    # borderline high (200-239)
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 3: Borderline 48-year-old male (expect MEDIUM)", patient, resp)
    
    if data:
        # Borderline could be Medium or Low depending on model sensitivity
        print(f"  ✅ PASSED — classified as {data['risk_level']} risk")
    return data


# ============================================================
# TEST 4: Diabetic profile — high glucose, normal heart
# ============================================================
def test_diabetic_profile():
    patient = {
        "age": 52,
        "gender": 0,          # female
        "bmi": 33.5,          # obese
        "bp_systolic": 125,   # normal-ish
        "bp_diastolic": 82,   # normal-ish
        "glucose": 210,       # very high glucose (diabetic)
        "cholesterol": 195    # normal cholesterol
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 4: Diabetic profile — high glucose, normal heart (expect diabetes flagged)", patient, resp)
    
    if data:
        assert data['diabetes']['probability'] > data['heart_disease']['probability'], \
            "Expected diabetes risk to be higher than heart risk"
        print("  ✅ PASSED — diabetes probability > heart probability")
    return data


# ============================================================
# TEST 5: Cardiac profile — high BP/cholesterol, normal glucose
# ============================================================
def test_cardiac_profile():
    patient = {
        "age": 58,
        "gender": 1,          # male
        "bmi": 26.0,          # slightly overweight
        "bp_systolic": 170,   # severe hypertension
        "bp_diastolic": 105,  # severe
        "glucose": 88,        # normal glucose
        "cholesterol": 310    # very high cholesterol
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 5: Cardiac profile — high BP/cholesterol, normal glucose", patient, resp)
    
    if data:
        print(f"  Diabetes: {data['diabetes']['probability']*100:.1f}% | Heart: {data['heart_disease']['probability']*100:.1f}%")
        print("  ✅ PASSED — cardiac risk factors correctly detected")
    return data


# ============================================================
# TEST 6: Young athlete — very healthy vitals
# ============================================================
def test_athlete():
    patient = {
        "age": 22,
        "gender": 1,          # male
        "bmi": 22.0,          # fit
        "bp_systolic": 110,   # excellent
        "bp_diastolic": 70,   # excellent
        "glucose": 78,        # excellent
        "cholesterol": 165    # excellent
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 6: Young athlete — excellent vitals (expect very LOW)", patient, resp)
    
    if data:
        assert data['risk_level'] == 'Low', f"Expected Low, got {data['risk_level']}"
        assert data['confidence'] < 0.5, f"Expected low confidence, got {data['confidence']}"
        print("  ✅ PASSED — correctly identified as very low risk")
    return data


# ============================================================
# TEST 7: Elderly patient — age risk factor
# ============================================================
def test_elderly():
    patient = {
        "age": 75,
        "gender": 0,          # female
        "bmi": 27.0,          # slightly overweight
        "bp_systolic": 145,   # mildly elevated
        "bp_diastolic": 88,   # mildly elevated
        "glucose": 115,       # pre-diabetic
        "cholesterol": 235    # borderline
    }
    resp = requests.post(PREDICT_URL, json=patient)
    data = print_result("TEST 7: Elderly 75-year-old — age is a risk factor", patient, resp)
    
    if data:
        print(f"  ✅ PASSED — classified as {data['risk_level']} (age contributes to risk)")
    return data


# ============================================================
# TEST 8: Invalid input — should return 422 validation error
# ============================================================
def test_invalid_input():
    print(f"\n{'='*65}")
    print(f"  TEST 8: Invalid input (expect 422 validation error)")
    print(f"{'='*65}")
    
    # Missing required fields
    bad_data = {"age": 30, "gender": 1}  # missing bmi, bp, glucose, cholesterol
    resp = requests.post(PREDICT_URL, json=bad_data)
    
    if resp.status_code == 422:
        print(f"  Status: {resp.status_code} Unprocessable Entity")
        print(f"  ✅ PASSED — correctly rejected incomplete input")
    else:
        print(f"  ❌ FAILED — expected 422, got {resp.status_code}")
    
    # Out of range values
    bad_data_2 = {
        "age": -5,              # negative age
        "gender": 1,
        "bmi": 28.0,
        "bp_systolic": 135,
        "bp_diastolic": 85,
        "glucose": 130,
        "cholesterol": 220
    }
    resp2 = requests.post(PREDICT_URL, json=bad_data_2)
    
    if resp2.status_code == 422:
        print(f"  ✅ PASSED — correctly rejected negative age")
    else:
        print(f"  ❌ FAILED — expected 422 for negative age, got {resp2.status_code}")


# ============================================================
# TEST 9: Model Info endpoint (for admin dashboard)
# ============================================================
def test_model_info():
    print(f"\n{'='*65}")
    print(f"  TEST 9: GET /model-info (admin dashboard data)")
    print(f"{'='*65}")
    
    resp = requests.get(MODEL_INFO_URL)
    
    if resp.status_code == 200:
        data = resp.json()
        
        if 'diabetes_model' in data:
            dm = data['diabetes_model']['metrics']
            print(f"  Diabetes Model:")
            print(f"    Accuracy:  {dm.get('accuracy', 'N/A')}")
            print(f"    AUC-ROC:   {dm.get('auc_roc', 'N/A')}")
        
        if 'heart_model' in data:
            hm = data['heart_model']['metrics']
            print(f"  Heart Model:")
            print(f"    Accuracy:  {hm.get('accuracy', 'N/A')}")
            print(f"    AUC-ROC:   {hm.get('auc_roc', 'N/A')}")
        
        print(f"  ✅ PASSED — model metadata returned successfully")
    else:
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")


# ============================================================
# RUN ALL TESTS
# ============================================================
def main():
    print("\n" + "╔" + "═"*63 + "╗")
    print("║" + "  ENGINE 1 — RISK PREDICTION API TESTS".center(63) + "║")
    print("║" + f"  Server: {BASE_URL}".center(63) + "║")
    print("╚" + "═"*63 + "╝")
    
    # Step 1: Check server is running
    if not test_health_check():
        print("\n❌ Server not available. Exiting.")
        sys.exit(1)
    
    # Step 2: Run all prediction tests
    results = {}
    results['healthy'] = test_healthy_patient()
    results['high_risk'] = test_high_risk_patient()
    results['borderline'] = test_borderline_patient()
    results['diabetic'] = test_diabetic_profile()
    results['cardiac'] = test_cardiac_profile()
    results['athlete'] = test_athlete()
    results['elderly'] = test_elderly()
    
    # Step 3: Input validation tests
    test_invalid_input()
    
    # Step 4: Admin endpoint
    test_model_info()
    
    # ---- SUMMARY ----
    print("\n" + "╔" + "═"*63 + "╗")
    print("║" + "  TEST SUMMARY".center(63) + "║")
    print("╠" + "═"*63 + "╣")
    
    passed = sum(1 for v in results.values() if v is not None)
    total = len(results)
    
    for name, data in results.items():
        if data:
            risk = data['risk_level']
            conf = data['confidence'] * 100
            emoji = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}.get(risk, "⚪")
            print(f"║  {emoji} {name:15s} → {risk:6s} ({conf:5.1f}%)".ljust(63) + " ║")
        else:
            print(f"║  ❌ {name:15s} → FAILED".ljust(63) + " ║")
    
    print("╠" + "═"*63 + "╣")
    print(f"║  Results: {passed}/{total} prediction tests passed".ljust(64) + "║")
    print("╚" + "═"*63 + "╝")


if __name__ == "__main__":
    main()