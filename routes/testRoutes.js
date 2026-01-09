const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getTests,
    getTest,
    createTest,
    updateTest,
    deleteTest,
    checkTestAnswer
} = require('../controllers/testController');

const router = express.Router();

// Barcha testlarni olish (Hamma uchun)
router.get('/', protect, getTests);

// Bitta testni olish (Hamma uchun)
router.get('/:id', protect, getTest);

// Test javobini tekshirish (Hamma uchun)
router.post('/:id/check', protect, checkTestAnswer);

// Yangi test yaratish (Faqat Teacher va Admin)
router.post('/', protect, restrictTo('teacher', 'admin'), createTest);

// Testni yangilash (Faqat Teacher va Admin - o'z testini)
router.put('/:id', protect, restrictTo('teacher', 'admin'), updateTest);

// Testni o'chirish (Faqat Teacher va Admin - o'z testini)
router.delete('/:id', protect, restrictTo('teacher', 'admin'), deleteTest);

module.exports = router;
