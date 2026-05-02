const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

// @desc    Get all active doctor profiles
// @route   GET /api/doctors
// @access  Public
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await DoctorProfile.find({ isAvailable: true }).populate('userId', 'name email profileImage');
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching doctors' });
    }
};

// @desc    Get all doctor profiles (including inactive)
// @route   GET /api/doctors/admin/all
// @access  Private/Admin
const getAllDoctorsAdmin = async (req, res) => {
    try {
        const doctors = await DoctorProfile.find({}).populate('userId', 'name email profileImage');
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching doctors' });
    }
};

// @desc    Get doctor profile by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
    try {
        const doctor = await DoctorProfile.findById(req.params.id).populate('userId', 'name email profileImage');

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        res.status(200).json(doctor);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching doctor profile' });
    }
};

// @desc    Create new doctor profile
// @route   POST /api/doctors
// @access  Private/Admin
const createDoctorProfile = async (req, res) => {
    try {
        const { userId, specialization, qualifications, experience, availableSlots, consultationFee, bio, isAvailable } = req.body;

        const doctorExists = await DoctorProfile.findOne({ userId });

        if (doctorExists) {
            return res.status(400).json({ message: 'Doctor profile already exists for this user' });
        }

        const doctor = await DoctorProfile.create({
            userId,
            specialization,
            qualifications,
            experience,
            availableSlots,
            consultationFee,
            bio,
            isAvailable
        });

        res.status(201).json(doctor);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error creating doctor profile' });
    }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/:id
// @access  Private/Admin
const updateDoctorProfile = async (req, res) => {
    try {
        const doctor = await DoctorProfile.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        const updatedDoctor = await DoctorProfile.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('userId', 'name email profileImage');

        res.status(200).json(updatedDoctor);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating doctor profile' });
    }
};

// @desc    Soft delete doctor profile
// @route   DELETE /api/doctors/:id
// @access  Private/Admin
const deleteDoctorProfile = async (req, res) => {
    try {
        const doctor = await DoctorProfile.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        // Soft delete: set isAvailable to false
        doctor.isAvailable = false;
        await doctor.save();

        res.status(200).json({ message: 'Doctor profile successfully deactivated (soft delete)' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error deleting doctor profile' });
    }
};

// @desc    Get the logged-in doctor's own profile
// @route   GET /api/doctors/me
// @access  Private/Doctor
const getMyDoctorProfile = async (req, res) => {
    try {
        const profile = await DoctorProfile.findOne({ userId: req.user._id }).populate('userId', 'name email phone dateOfBirth');

        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching profile' });
    }
};

// @desc    Update the logged-in doctor's own profile
// @route   PUT /api/doctors/me
// @access  Private/Doctor
const updateMyDoctorProfile = async (req, res) => {
    try {
        const { name, phone, dateOfBirth, specialization, experience, qualifications, bio, consultationFee } = req.body;

        // Update user fields
        await User.findByIdAndUpdate(req.user._id, { name, phone, dateOfBirth });

        // Update doctor profile fields
        const profile = await DoctorProfile.findOneAndUpdate(
            { userId: req.user._id },
            { specialization, experience, qualifications, bio, consultationFee },
            { new: true, runValidators: true }
        ).populate('userId', 'name email phone dateOfBirth');

        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        res.status(200).json(profile);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Error updating profile' });
    }
};

module.exports = {
    getAllDoctors,
    getAllDoctorsAdmin,
    getDoctorById,
    createDoctorProfile,
    updateDoctorProfile,
    deleteDoctorProfile,
    getMyDoctorProfile,
    updateMyDoctorProfile,
};
