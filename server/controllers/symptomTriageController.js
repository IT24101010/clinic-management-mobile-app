const axios = require('axios');
const DoctorProfile = require('../models/DoctorProfile');

/**
 * Controller to handle symptom triage requests.
 * Proxies the request to the Python FastAPI ML service, gets the prediction,
 * and fetches matching available doctors from MongoDB.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const triageSymptoms = async (req, res) => {
    try {
        console.log('[Triage] Received triage request.');
        const { symptoms } = req.body;

        // 1. Validate Input
        if (!symptoms || typeof symptoms !== 'string') {
            console.log('[Triage] Validation failed: Symptoms missing or not a string.');
            return res.status(400).json({
                success: false,
                message: 'Symptoms must be provided as a string'
            });
        }

        if (symptoms.trim().length < 3 || symptoms.trim().length > 2000) {
            console.log('[Triage] Validation failed: Symptoms length out of bounds.');
            return res.status(400).json({
                success: false,
                message: 'Symptoms must be between 3 and 2000 characters long'
            });
        }

        console.log(`[Triage] Valid symptoms format. Sending request to ML Service...`);

        // 2. Call FastAPI ML service
        let mlResponse;
        try {
            mlResponse = await axios.post(
                'http://127.0.0.1:8000/triage-symptoms',
                { symptoms: symptoms.trim() },
                { timeout: 5000 } // 5-second timeout
            );
        } catch (error) {
            console.error('[Triage] Error communicating with ML service:', error.message);

            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                return res.status(502).json({
                    success: false,
                    message: `ML Service Error: ${error.response.data?.message || 'Bad Gateway'}`,
                    error: error.response.data
                });
            } else if (error.request) {
                // The request was made but no response was received (e.g. timeout or connection refused)
                return res.status(503).json({
                    success: false,
                    message: 'AI Triage service is currently unreachable or timed out. Please try again later.'
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error while contacting AI Triage service'
                });
            }
        }

        const prediction = mlResponse.data;
        const specialty = prediction.recommended_specialty;

        console.log(`[Triage] ML Service responded. Recommended Specialty: ${specialty}`);

        const mappedPrediction = {
            condition: prediction.predicted_disease || prediction.condition,
            specialty: prediction.recommended_specialty || prediction.specialty,
            confidence: prediction.confidence,
            is_low_confidence: prediction.is_low_confidence,
            disclaimer: prediction.disclaimer
        };

        // 3. Query MongoDB for available doctors matching the recommended specialty
        if (!specialty) {
            console.log('[Triage] ML prediction did not include a recommended specialty.');
            return res.status(200).json({
                success: true,
                prediction: mappedPrediction,
                filteredDoctors: [],
                message: 'Could not determine a recommended specialty from the symptoms'
            });
        }

        console.log(`[Triage] Querying database for available ${specialty} doctors...`);
        // Case-insensitive regex search for the exact specialty string
        const doctorQuery = {
            specialization: { $regex: new RegExp(`^${specialty}$`, 'i') },
            isAvailable: true
        };

        const doctors = await DoctorProfile.find(doctorQuery)
            .populate({
                path: 'userId',
                select: 'name email' // Exclude sensitive fields
            })
            .lean(); // Optional: returns plain JS objects

        // Filter out cases where the populated userId might be null (e.g. orphaned doctor profile)
        const validDoctors = doctors.filter(doc => doc.userId != null);

        console.log(`[Triage] Found ${validDoctors.length} available matching doctors.`);

        // 4. Send the successful response
        if (validDoctors.length === 0) {
            return res.status(200).json({
                success: true,
                prediction: mappedPrediction,
                filteredDoctors: [],
                message: 'No specialists matching your symptoms are currently available'
            });
        }

        return res.status(200).json({
            success: true,
            prediction: mappedPrediction,
            filteredDoctors: validDoctors
        });

    } catch (error) {
        console.error('[Triage] Unexpected Server Error:', error);
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred processing your request'
        });
    }
};

module.exports = { triageSymptoms };
