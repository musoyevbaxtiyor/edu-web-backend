// edu-web-backend/routes/lessonRoutes.js

const express = require('express');
const router = express.Router();
const { 
    createLesson, 
    getLessonsByCourse,
    // getLessonContent,    // YANGI: Dars kontentini olish uchun
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

// --- 2. Yagona Darsga oid Harakatlar (Update, Delete) ---

// Darsni o'zgartirish/o'chirish (controller req.params.lessonId ni o'qiydi)
router.route('/:lessonId')
    // .get(protect, getLessonContent)
    .put(protect, restrictTo('teacher', 'admin'), updateLesson)
    .delete(protect, restrictTo('teacher', 'admin'), deleteLesson);

// Eslatma: vazifa topshirish POST /api/submissions orqali (eski /:lessonId/submit olib tashlandi)

module.exports = router;