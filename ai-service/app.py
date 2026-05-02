"""
==================================================================
AI Service — FastAPI Application (app.py)
==================================================================
Project:  ML-Assisted Clinic Management System (G04)
Purpose:  Serves two AI engines as REST API endpoints:
          - Engine 1: POST /predict-risk   (Metabolic Profiler)
          - Engine 2: POST /triage-symptoms (NLP Symptom Triage)

Run:      uv run uvicorn app:app --reload --port 8000
Docs:     http://localhost:8000/docs (auto-generated Swagger UI)

Architecture:
  React → Node.js → FastAPI (this file) → .pkl models → JSON response
  
  Node.js calls this server using the AI_SERVICE_URL env variable.
  Default: http://localhost:8000
==================================================================
"""

import os
import json
import logging
from contextlib import asynccontextmanager

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
# LOGGING SETUP
# ============================================================
# Logs every prediction request for debugging and auditing.
# In production, these logs help track AI performance over time.

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ai-service")

# ============================================================
# GLOBAL VARIABLES FOR LOADED MODELS
# ============================================================
# These are populated at startup by the lifespan function.
# Loading models at startup (not per-request) is critical for
# performance — loading a .pkl file takes ~200ms, but using an
# already-loaded model takes <1ms per prediction.

diabetes_model = None
diabetes_scaler = None
heart_model = None
heart_scaler = None
model_metadata = None

# Engine 2 models (loaded if .pkl files exist)
nlp_model = None
tfidf_vectorizer = None
disease_specialty_map = None

# ============================================================
# OPTIMAL THRESHOLDS (from the improvement notebook)
# ============================================================
# These were found via threshold tuning to maximize F1-score.
# Lower thresholds = catch more sick patients (fewer false negatives)
# which is safer for a medical screening system.

DIABETES_THRESHOLD = 0.35
HEART_THRESHOLD = 0.50


# ============================================================
# PYDANTIC MODELS (Request/Response Schemas)
# ============================================================
# Pydantic validates incoming JSON automatically. If Node.js sends
# a string where a number is expected, FastAPI returns a clear
# 422 error instead of crashing.

class HealthScreeningRequest(BaseModel):
    """
    Request body for POST /predict-risk.
    These fields match the React health screening form.
    
    Blood pressure is split into two fields because:
    - Diabetes model (Pima dataset) expects DIASTOLIC BP (bottom number)
    - Heart disease model (UCI dataset) expects SYSTOLIC BP (top number)
    Collecting both ensures each model gets the correct value.
    """
    age: int = Field(..., ge=1, le=120, description="Patient's age")
    gender: int = Field(..., ge=0, le=1, description="0=female, 1=male")
    bmi: float = Field(..., gt=0, le=100, description="Body Mass Index")
    bp_systolic: int = Field(..., ge=60, le=300, description="Systolic BP — top number (mmHg)")
    bp_diastolic: int = Field(..., ge=30, le=200, description="Diastolic BP — bottom number (mmHg)")
    glucose: int = Field(..., ge=0, le=600, description="Fasting glucose (mg/dL)")
    cholesterol: int = Field(..., ge=0, le=600, description="Total cholesterol (mg/dL)")
    exercise_chest_pain: int = Field(
        default=-1,
        ge=-1,
        le=1,
        description="Does patient experience chest pain during exercise? 0=No, 1=Yes, -1=Not provided (optional)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "age": 45,
                "gender": 1,
                "bmi": 28.5,
                "bp_systolic": 135,
                "bp_diastolic": 88,
                "glucose": 130,
                "cholesterol": 220,
                "exercise_chest_pain": 0
            }
        }


class RiskPredictionResponse(BaseModel):
    """Response body for POST /predict-risk."""
    risk_level: str
    confidence: float
    reasons: list[str]
    diabetes: dict
    heart_disease: dict
    disclaimer: str


class SymptomTriageRequest(BaseModel):
    """
    Request body for POST /triage-symptoms.
    The patient types their symptoms in plain English.
    """
    symptoms: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Patient's symptom description in plain English"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "symptoms": "I have severe chest pain and difficulty breathing"
            }
        }


class SymptomTriageResponse(BaseModel):
    """Response body for POST /triage-symptoms."""
    predicted_disease: str
    confidence: float
    recommended_specialty: str
    disclaimer: str


class HealthCheckResponse(BaseModel):
    """Response body for GET /health."""
    status: str
    engine1_loaded: bool
    engine2_loaded: bool
    model_metadata: dict | None


# ============================================================
# LIFESPAN: Load models at startup, cleanup at shutdown
# ============================================================
# This runs ONCE when the server starts. It loads all .pkl files
# into memory so they're ready for instant predictions.
# If a model file is missing, the server still starts but that
# engine returns an error when called.

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models at startup, release at shutdown."""
    global diabetes_model, diabetes_scaler
    global heart_model, heart_scaler, model_metadata
    global nlp_model, tfidf_vectorizer, disease_specialty_map

    models_dir = os.path.join(os.path.dirname(__file__), "models")
    logger.info(f"Loading models from: {models_dir}")

    # ---- ENGINE 1: Risk Prediction Models ----
    try:
        diabetes_model = joblib.load(os.path.join(models_dir, "diabetes_model.pkl"))
        diabetes_scaler = joblib.load(os.path.join(models_dir, "diabetes_scaler.pkl"))
        heart_model = joblib.load(os.path.join(models_dir, "heart_model.pkl"))
        heart_scaler = joblib.load(os.path.join(models_dir, "heart_scaler.pkl"))
        logger.info("Engine 1 (Risk Prediction) — loaded successfully")
    except FileNotFoundError as e:
        logger.error(f"Engine 1 — model file missing: {e}")
    except Exception as e:
        logger.error(f"Engine 1 — failed to load: {e}")

    # ---- Load metadata ----
    metadata_path = os.path.join(models_dir, "model_metadata.json")
    try:
        with open(metadata_path, "r") as f:
            model_metadata = json.load(f)
        logger.info("Model metadata loaded")
    except FileNotFoundError:
        logger.warning("model_metadata.json not found — skipping")
        model_metadata = None

    # ---- ENGINE 2: NLP Triage Models ----
    # These files are created by the NLP training notebook.
    # If they don't exist yet, Engine 2 just won't be available.
    try:
        nlp_model = joblib.load(os.path.join(models_dir, "nlp_model.pkl"))
        tfidf_vectorizer = joblib.load(os.path.join(models_dir, "tfidf_vectorizer.pkl"))
        with open(os.path.join(models_dir, "disease_specialty_map.json"), "r") as f:
            disease_specialty_map = json.load(f)
        logger.info("Engine 2 (Symptom Triage) — loaded successfully")
    except FileNotFoundError:
        logger.warning("Engine 2 — model files not found (NLP not trained yet)")
    except Exception as e:
        logger.error(f"Engine 2 — failed to load: {e}")

    logger.info("AI Service ready — all available models loaded")

    yield  # Server is running

    # Cleanup on shutdown
    logger.info("AI Service shutting down")


# ============================================================
# FASTAPI APP INSTANCE
# ============================================================

app = FastAPI(
    title="CMS AI Service — G04",
    description=(
        "AI Microservice for the ML-Assisted Clinic Management System. "
        "Provides health risk prediction (Engine 1) and symptom-based "
        "specialist routing (Engine 2)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---- CORS Middleware ----
# Allows the Node.js backend (and React dev server) to call
# this API. In production, replace "*" with your actual domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to your Node.js URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ENDPOINT: GET / (Root)
# ============================================================

@app.get("/", tags=["General"])
async def root():
    """Root endpoint — confirms the AI service is running."""
    return {
        "service": "CMS AI Service — G04",
        "status": "running",
        "endpoints": {
            "health_check": "GET /health",
            "risk_prediction": "POST /predict-risk",
            "symptom_triage": "POST /triage-symptoms",
            "api_docs": "GET /docs",
        }
    }


# ============================================================
# ENDPOINT: GET /health (Health Check)
# ============================================================

@app.get("/health", response_model=HealthCheckResponse, tags=["General"])
async def health_check():
    """
    Health check endpoint. Called by Node.js to verify the AI
    service is running and which engines are available.
    """
    return HealthCheckResponse(
        status="healthy",
        engine1_loaded=(diabetes_model is not None and heart_model is not None),
        engine2_loaded=(nlp_model is not None and tfidf_vectorizer is not None),
        model_metadata=model_metadata,
    )


# ============================================================
# ENDPOINT: POST /predict-risk (Engine 1 — Metabolic Profiler)
# ============================================================
# Flow: React form → Node.js controller → THIS ENDPOINT → response
#
# Node.js calls this with the patient's vitals. We run them through
# both models (diabetes + heart) and return a combined risk assessment.
# Node.js then:
#   1. Updates the patient's User document: riskLevel = "High"
#   2. Saves a HealthScreening record for history
#   3. Returns the result to React for display

@app.post(
    "/predict-risk",
    response_model=RiskPredictionResponse,
    tags=["Engine 1 — Risk Prediction"],
    summary="Predict diabetes and heart disease risk from patient vitals",
)
async def predict_risk(request: HealthScreeningRequest):
    """
    Takes patient vitals from the health screening form and returns
    a combined risk assessment for diabetes and heart disease.

    **Input:** age, gender, bmi, bp_systolic, bp_diastolic, glucose, cholesterol  
    **Output:** risk_level (Low/Medium/High), confidence, reasons, per-disease details
    """

    # ---- Check models are loaded ----
    if diabetes_model is None or heart_model is None:
        raise HTTPException(
            status_code=503,
            detail="Engine 1 models not loaded. Check server logs."
        )

    try:
        # ---- DIABETES PREDICTION ----
        # Map form inputs to the Pima dataset's 8 features.
        # The Pima dataset's 'BloodPressure' column is DIASTOLIC BP
        # (the bottom number), so we use bp_diastolic here.
        # Features the form doesn't collect get sensible defaults
        # (medians from the training data).
        diabetes_input = pd.DataFrame([{
            "Pregnancies": 0,                        # default (unknown)
            "Glucose": request.glucose,              # from form
            "BloodPressure": request.bp_diastolic,   # from form (diastolic!)
            "SkinThickness": 29,                     # training data median
            "Insulin": 125,                          # training data median
            "BMI": request.bmi,                      # from form
            "DiabetesPedigreeFunction": 0.3725,      # training data median
            "Age": request.age,                      # from form
        }])

        diabetes_input_scaled = diabetes_scaler.transform(diabetes_input)
        diabetes_prob = float(
            diabetes_model.predict_proba(diabetes_input_scaled)[0][1]
        )

        # ---- HEART DISEASE PREDICTION ----
        # Map form inputs to the UCI dataset's features.
        # The UCI dataset's 'trestbps' column is resting SYSTOLIC BP
        # (the top number), so we use bp_systolic here.
        # We dynamically build the input based on which features
        # survived the cleanup (some were dropped for >60% missing).
        # Smart defaults: use age-based max heart rate estimate instead of flat 150
        # Formula: 220 - age is the standard estimated max heart rate
        # If patient provided exercise chest pain answer, use it; otherwise default to 0
        estimated_max_hr = max(220 - request.age, 100)
        exang_value = request.exercise_chest_pain if request.exercise_chest_pain != -1 else 0

        heart_defaults = {
            "age": request.age,
            "sex": request.gender,
            "cp": 0,                                     # default: typical angina
            "trestbps": request.bp_systolic,             # from form (systolic)
            "chol": request.cholesterol,                 # from form
            "fbs": 1 if request.glucose > 120 else 0,   # derived from glucose
            "restecg": 0,                                # default: normal
            "thalch": estimated_max_hr,                  # age-based estimate (was hardcoded 150)
            "exang": exang_value,                        # from form if provided, else 0
            "oldpeak": 0,                                # default: no ST depression
            "slope": 1,                                  # default: flat
            "ca": 0,                                     # default: no major vessels
            "thal": 2,                                   # default: normal
        }

        # Get the feature names the heart model was trained on
        # (stored in the scaler's feature_names_in_ attribute)
        heart_feature_cols = list(heart_scaler.feature_names_in_)
        heart_input_dict = {
            col: heart_defaults.get(col, 0) for col in heart_feature_cols
        }
        heart_input = pd.DataFrame([heart_input_dict])

        heart_input_scaled = heart_scaler.transform(heart_input)
        heart_prob = float(
            heart_model.predict_proba(heart_input_scaled)[0][1]
        )

        # ---- COMBINE RESULTS ----
        # Use optimized thresholds from the improvement notebook
        diabetes_at_risk = diabetes_prob >= DIABETES_THRESHOLD
        heart_at_risk = heart_prob >= HEART_THRESHOLD

        max_prob = max(diabetes_prob, heart_prob)
        if max_prob >= 0.7:
            risk_level = "High"
        elif max_prob >= 0.4:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # ---- BUILD REASONS LIST ----
        # These are displayed on the doctor's dashboard and in
        # the patient's risk result screen.
        reasons = []
        if diabetes_at_risk:
            reasons.append(
                f"Elevated diabetes risk ({diabetes_prob*100:.0f}% probability)"
            )
        if heart_at_risk:
            reasons.append(
                f"Elevated heart disease risk ({heart_prob*100:.0f}% probability)"
            )
        if request.glucose > 140:
            reasons.append("High glucose level")
        if request.bp_systolic > 140:
            reasons.append(f"High systolic blood pressure ({request.bp_systolic} mmHg)")
        if request.bp_diastolic > 90:
            reasons.append(f"High diastolic blood pressure ({request.bp_diastolic} mmHg)")
        if request.bmi > 30:
            reasons.append("BMI indicates obesity")
        if request.cholesterol > 240:
            reasons.append("High cholesterol")
        if request.exercise_chest_pain == 1:
            reasons.append("Reports chest pain during exercise")
        if not reasons:
            reasons.append("All vitals within acceptable range")

        # ---- LOG THE PREDICTION ----
        logger.info(
            f"Risk prediction: age={request.age}, "
            f"exang={exang_value}, thalch={estimated_max_hr}, "
            f"risk_level={risk_level}, "
            f"diabetes_prob={diabetes_prob:.3f}, "
            f"heart_prob={heart_prob:.3f}"
        )

        return RiskPredictionResponse(
            risk_level=risk_level,
            confidence=round(max_prob, 4),
            reasons=reasons,
            diabetes={
                "probability": round(diabetes_prob, 4),
                "risk": (
                    "High" if diabetes_prob >= 0.7
                    else ("Medium" if diabetes_prob >= 0.4 else "Low")
                ),
                "at_risk": diabetes_at_risk,
            },
            heart_disease={
                "probability": round(heart_prob, 4),
                "risk": (
                    "High" if heart_prob >= 0.7
                    else ("Medium" if heart_prob >= 0.4 else "Low")
                ),
                "at_risk": heart_at_risk,
            },
            disclaimer=(
                "This is an AI-based risk estimation for triage support only. "
                "It does NOT replace professional medical diagnosis."
            ),
        )

    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


# ============================================================
# ENDPOINT: POST /triage-symptoms (Engine 2 — NLP Triage)
# ============================================================
# Flow: React doctor list page → Node.js → THIS ENDPOINT → response
#
# Node.js sends the symptom text. We vectorize it with TF-IDF,
# predict the disease, map it to a specialty, and return everything.
# Node.js then queries doctors by that specialty and returns the
# filtered list to React.

# Confidence threshold for Engine 2 predictions.
# With 24 classes, random chance is ~4.17%. A threshold of 10%
# (2.4x random chance) catches meaningful predictions while routing
# ambiguous inputs to a General Physician for safety.
TRIAGE_CONFIDENCE_THRESHOLD = 0.10


def clean_symptom_text(text: str) -> str:
    """
    Clean symptom text for inference.
    MUST MATCH the clean_text() function used in the training notebook
    (notebooks/train_nlp_model.ipynb, Cell 4).
    """
    import re
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)   # keep letters, digits, spaces
    text = re.sub(r'\s+', ' ', text).strip()   # collapse multiple spaces
    return text


@app.post(
    "/triage-symptoms",
    response_model=SymptomTriageResponse,
    tags=["Engine 2 — Symptom Triage"],
    summary="Predict disease from symptoms and recommend specialist",
)
async def triage_symptoms(request: SymptomTriageRequest):
    """
    Takes a patient's symptom description in plain English and
    returns the predicted disease and recommended specialist.

    **Input:** symptoms (string, min 3 chars)  
    **Output:** predicted_disease, confidence, recommended_specialty

    If the model's confidence is below TRIAGE_CONFIDENCE_THRESHOLD,
    the patient is routed to a General Physician as a safety fallback.
    """

    # ---- Check models are loaded ----
    if nlp_model is None or tfidf_vectorizer is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Engine 2 (NLP Triage) models not loaded. "
                "Train the NLP model first using the symptom triage notebook."
            )
        )

    try:
        # ---- PREPROCESS ----
        # Apply the same cleaning used during training.
        # Mismatched cleaning silently degrades predictions.
        symptom_text = clean_symptom_text(request.symptoms)

        # Guard against inputs that become empty after cleaning
        # (e.g., user types only special characters).
        if not symptom_text:
            raise HTTPException(
                status_code=422,
                detail="Symptom text contains no valid characters after cleaning."
            )

        # ---- VECTORIZE ----
        # Convert text to TF-IDF vector using the saved vectorizer.
        # The vectorizer's vocabulary was learned during training —
        # unknown words are silently ignored (which is fine).
        text_vectorized = tfidf_vectorizer.transform([symptom_text])

        # ---- PREDICT ----
        predicted_disease = nlp_model.predict(text_vectorized)[0]
        confidence = float(nlp_model.predict_proba(text_vectorized).max())

        # ---- CONFIDENCE THRESHOLD SAFETY NET ----
        # If the model is uncertain, route to General Physician
        # rather than risk sending the patient to a wrong specialist.
        # This directly mitigates the "AI Misdiagnosis" risk from
        # the project's Risk Management plan.
        is_uncertain = confidence < TRIAGE_CONFIDENCE_THRESHOLD

        if is_uncertain:
            recommended_specialty = "General Physician"
            logger.info(
                f"Symptom triage: LOW CONFIDENCE "
                f"'{symptom_text[:50]}...' → "
                f"{predicted_disease} ({confidence:.2%}) → "
                f"fallback to General Physician"
            )
        else:
            recommended_specialty = disease_specialty_map.get(
                predicted_disease, "General Physician"
            )
            logger.info(
                f"Symptom triage: '{symptom_text[:50]}...' → "
                f"{predicted_disease} ({confidence:.2%}) → "
                f"{recommended_specialty}"
            )

        return SymptomTriageResponse(
            predicted_disease=predicted_disease,
            confidence=round(confidence, 4),
            recommended_specialty=recommended_specialty,
            disclaimer=(
                "This is an AI-based suggestion for triage support only. "
                "It does NOT replace professional medical diagnosis."
            ),
        )

    except HTTPException:
        # Re-raise HTTPExceptions (like the 422 above) without wrapping them
        raise
    except Exception as e:
        logger.error(f"Symptom triage error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Triage failed: {str(e)}"
        )
# ============================================================
# ENDPOINT: GET /model-info (Admin endpoint)
# ============================================================

@app.get("/model-info", tags=["Admin"])
async def get_model_info():
    """
    Returns model metadata including accuracy metrics, feature lists,
    and training timestamps. Used by the admin dashboard (Module 4)
    to display AI performance metrics.
    """
    if model_metadata is None:
        raise HTTPException(
            status_code=404,
            detail="Model metadata not found. Re-run the training notebook."
        )
    return model_metadata