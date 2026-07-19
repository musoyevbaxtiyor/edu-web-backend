const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getExams,
    getExam,
    createExam,
    updateExam,
    deleteExam,
    submitExam,
    getMyExamResults,
} = require('../controllers/examController');

// Talaba natijalari (/:id dan OLDIN bo'lishi shart)
router.get('/my/results', protect, getMyExamResults);

// Imtihonlar ro'yxati
router.get('/', protect, getExams);

// Yangi imtihon (Teacher/Admin)
router.post('/', protect, restrictTo('teacher', 'admin'), createExam);

// Imtihonni topshirish
router.post('/:id/submit', protect, submitExam);

// Bitta imtihon
router.get('/:id', protect, getExam);

// Tahrirlash / o'chirish (Teacher/Admin)
router.put('/:id', protect, restrictTo('teacher', 'admin'), updateExam);
router.delete('/:id', protect, restrictTo('teacher', 'admin'), deleteExam);

module.exports = router;
