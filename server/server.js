require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const symptomTriageRoutes = require('./routes/symptomTriageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(morgan('dev'));

// Connect to Database
connectDB();

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/health-screening', require('./routes/healthScreeningRoutes'));
app.use('/api/triage', symptomTriageRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware (must be attached last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});
