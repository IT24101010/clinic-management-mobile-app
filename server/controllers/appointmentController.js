const Appointment = require('../models/Appointment');
const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const Doctor = require('../models/DoctorProfile');

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Protected
const createAppointment = async (req, res, next) => {
    try {
        const { doctorId, serviceId, date, timeSlotId, notes } = req.body;
        const patientId = req.user._id;

        const timeSlot = await TimeSlot.findById(timeSlotId);
        if (!timeSlot || !timeSlot.isActive) {
            return res.status(404).json({ success: false, message: 'Time slot is unavailable or does not exist.' });
        }
        if (timeSlot.currentBookings >= timeSlot.maxCapacity) {
            return res.status(400).json({ success: false, message: 'This time slot is fully booked.' });
        }

        const existingAppointment = await Appointment.findOne({
            patientId,
            timeSlotId,
            status: { $ne: 'cancelled' }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'You have already booked this time slot.'
            });
        }

        const patient = await User.findById(patientId);
        const priorityFlag = patient.riskLevel === 'High' ? 'red' : 'normal';

        const newBookings = timeSlot.currentBookings + 1;
        const tokenNumber = newBookings;

        timeSlot.currentBookings = newBookings;
        await timeSlot.save();

        const appointment = await Appointment.create({
            patientId,
            doctorId,
            serviceId,
            date,
            timeSlotId,
            priorityFlag,
            notes,
            tokenNumber
        });

        res.status(201).json(appointment);
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's appointments
// @route   GET /api/appointments/my
// @access  Protected
const getMyAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user._id })
            .populate('doctorId', 'name')
            .populate('serviceId', 'serviceName')
            .populate('timeSlotId')
            .sort({ date: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all appointments (Admin)
// @route   GET /api/appointments
// @access  Protected/Admin
const getAllAppointments = async (req, res, next) => {
    try {
        const { date, doctorId, status } = req.query;
        let query = {};

        if (date) query.date = date;
        if (doctorId) query.doctorId = doctorId;
        if (status) query.status = status;

        const appointments = await Appointment.find(query)
            .populate('patientId', 'name email')
            .populate('doctorId', 'name')
            .populate('serviceId', 'serviceName')
            .populate('timeSlotId')
            .sort({ createdAt: -1 });

        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Protected
const updateAppointment = async (req, res, next) => {
    try {
        let appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const wasCancelled = appointment.status === 'cancelled';
        const willBeCancelled = req.body.status === 'cancelled';

        appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!wasCancelled && willBeCancelled) {
            const timeSlot = await TimeSlot.findById(appointment.timeSlotId);
            if (timeSlot) {
                timeSlot.currentBookings = Math.max(0, timeSlot.currentBookings - 1);
                await timeSlot.save();
            }
        }

        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Protected/Admin
const deleteAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.status !== 'cancelled') {
            const timeSlot = await TimeSlot.findById(appointment.timeSlotId);
            if (timeSlot) {
                timeSlot.currentBookings = Math.max(0, timeSlot.currentBookings - 1);
                await timeSlot.save();
            }
        }

        await Appointment.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Appointment removed' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get logged in doctor's appointments
// @route   GET /api/appointments/doctor/my
// @access  Protected/Doctor
const getMyDoctorAppointments = async (req, res, next) => {
    try {
        const appointments = await Appointment.find({ doctorId: req.user._id })
            .populate('patientId', 'name email phone profileImage riskLevel bloodReports')
            .populate('serviceId', 'serviceName')
            .populate('timeSlotId')
            .sort({ date: 1, tokenNumber: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

// @desc    Get appointments for a specific time slot (Doctor only)
// @route   GET /api/appointments/slot/:slotId
// @access  Protected/Doctor
const getAppointmentsForTimeSlot = async (req, res, next) => {
    try {
        const timeSlot = await TimeSlot.findById(req.params.slotId);
        if (!timeSlot || timeSlot.doctorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this time slot' });
        }

        const appointments = await Appointment.find({ timeSlotId: req.params.slotId })
            .populate('patientId', '-password') // Full populate minus password
            .populate('serviceId', 'serviceName price')
            .sort({ tokenNumber: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        next(error);
    }
};

// @desc    Update appointment status directly
// @route   PUT /api/appointments/:id/status
// @access  Protected/Doctor,Admin
const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        let appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // If it's a doctor acting, ensure they own it
        if (req.user.role === 'doctor') {
            if (appointment.doctorId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Unauthorized to modify this appointment' });
            }
        }

        const wasCancelled = appointment.status === 'cancelled';
        const willBeCancelled = status === 'cancelled';

        appointment.status = status;
        await appointment.save();

        if (!wasCancelled && willBeCancelled) {
            const timeSlot = await TimeSlot.findById(appointment.timeSlotId);
            if (timeSlot) {
                timeSlot.currentBookings = Math.max(0, timeSlot.currentBookings - 1);
                await timeSlot.save();
            }
        }

        res.status(200).json(appointment);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    updateAppointment,
    deleteAppointment,
    getMyDoctorAppointments,
    getAppointmentsForTimeSlot,
    updateAppointmentStatus
};
