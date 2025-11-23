const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Autentifikatsiya middleware'i
const { startLessonProgress } = require('../controllers/progressController');

// /api/progress manziliga murojaatlar
router.route('/')
    .post(protect, startLessonProgress); // Darsni boshlash / Progress yozuvini yaratish

// Keyinchalik:
// router.route('/:id/complete')
// .put(protect, markLessonCompleted);

module.exports = router;