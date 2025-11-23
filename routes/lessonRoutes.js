// edu-web-backend/routes/lessonRoutes.js

const express = require('express');
const router = express.Router();
const { 
    createLesson, 
    getLessonsByCourse,
    // getLessonContent,    // YANGI: Dars kontentini olish uchun
    submitTask,          // YANGI: Vazifani topshirish uchun
    updateLesson,        // YANGI: Tahrirlash uchun
    deleteLesson,        // YANGI: O'chirish uchun
} = require('../controllers/lessonController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// --- 1. Dars yaratish va Kurs darslarini olish ---

// Dars yaratish (Faqat O'qituvchi va Admin)
router.post('/', 
    protect, 
    restrictTo('teacher', 'admin'), 
    createLesson
);

// Kurs darslarini olish (Ro'yxatdan o'tgan foydalanuvchilar uchun)
router.get('/:courseId', 
    protect, 
    getLessonsByCourse
);

// --- 2. Yagona Darsga oid Harakatlar (Content, Submit, Update, Delete) ---

// Dars kontentini olish va uni o'zgartirish/o'chirish
router.route('/:lessonId') // Eslatma: :id o'rniga :lessonId ishlatildi (kontent olish uchun)
    // .get(protect, getLessonContent)
    .put(protect, restrictTo('teacher', 'admin'), updateLesson)
    .delete(protect, restrictTo('teacher', 'admin'), deleteLesson);

// Vazifani topshirish (Faqat Talaba)
router.post('/:lessonId/submit',
    protect,
    restrictTo('student'),
    submitTask
);

module.exports = router;