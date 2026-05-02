const express = require('express');
const router = express.Router();
const { triageSymptoms } = require('../controllers/symptomTriageController');

/**
 * @route   POST /api/triage
 * @desc    Triage symptoms using AI to suggest a matching specialty and fetch available doctors
 * @access  Public
 */
router.post('/', triageSymptoms);

module.exports = router;
