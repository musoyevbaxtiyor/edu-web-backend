const express = require('express');
const { protect } = require('../middleware/authMiddleware'); // Middleware'ni import qilish
const { getUserProfile } = require('../controllers/userController');
const router = express.Router();

// protect middleware'ini ushbu route'ga qo'shamiz
// Endi bu route'ga so'rov yuborish uchun Token talab qilinadi
router.get('/profile', protect, getUserProfile); 

module.exports = router;