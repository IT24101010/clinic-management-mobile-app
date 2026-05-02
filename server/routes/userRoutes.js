const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const User = require('../models/User');
const { uploadImage, uploadDocument, uploadToCloudinary } = require('../config/cloudinary');

const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    deleteMyAccount
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

// Validation Rules
const registerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, validateRequest, registerUser);
router.post('/login', loginValidation, validateRequest, loginUser);

router.post('/upload-avatar', protect, uploadImage.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image file provided' });

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'clinic-cms/images',
            transformation: [{ width: 500, height: 500, crop: 'limit' }],
        });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.profileImage = result.secure_url;
        await user.save();

        res.json({ imageUrl: result.secure_url, user });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading avatar', error: error.message });
    }
});

router.post('/upload-report', protect, uploadDocument.single('report'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'clinic-cms/reports',
            resource_type: 'auto',
        });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newReport = {
            fileUrl: result.secure_url,
            fileName: req.file.originalname,
            uploadDate: new Date(),
        };

        user.bloodReports.push(newReport);
        await user.save();

        res.json({ report: newReport, user });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading report', error: error.message });
    }
});

router.delete('/reports/:reportId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const report = user.bloodReports.id(req.params.reportId);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        // Delete file from Cloudinary using the public_id extracted from the URL
        try {
            const { cloudinary } = require('../config/cloudinary');
            const urlParts = report.fileUrl.split('/');
            const fileWithExt = urlParts[urlParts.length - 1];
            const fileName = fileWithExt.split('.')[0];
            const folder = urlParts[urlParts.length - 2];
            const publicId = `${folder}/${fileName}`;
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (_) {
            // Cloudinary deletion failure should not block DB removal
        }

        user.bloodReports.pull(req.params.reportId);
        await user.save();

        res.json({ message: 'Report deleted successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting report', error: error.message });
    }
});

router
    .route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile)
    .delete(protect, authorize('patient'), deleteMyAccount);

router
    .route('/')
    .post(protect, authorize('admin'), createUser)
    .get(protect, authorize('admin'), getAllUsers);

router
    .route('/:id')
    .get(protect, authorize('admin'), getUserById)
    .put(protect, authorize('admin'), updateUser)
    .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
