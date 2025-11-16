const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const { authorizeRoles } = require('../middleware/roleMiddleware'); 
// const { createCourse, getAllCourses, updateCourse, deleteCourse } = require('../controllers/courseController'); // YANGI funksiyalarni import qilish
const router = express.Router();

// Asosiy Middleware Massivi (Admin va Teacher uchun)
const adminOrTeacher = [protect, authorizeRoles('admin', 'teacher')];

// 1. Kurs yaratish
// router.post('/', adminOrTeacher, createCourse);

// 2. Barcha kurslarni olish (Tizimga kirgan har bir kishi uchun)
// router.get('/', protect, getAllCourses);

// 3. YENGI: Kursni tahrirlash (ID orqali)
// router.put('/:id', adminOrTeacher, updateCourse);

// 4. YENGI: Kursni o'chirish (ID orqali)
// router.delete('/:id', adminOrTeacher, deleteCourse);
// ---------------
// ...
const { 
    createCourse, 
    getAllCourses, 
    getSingleCourse, // YANGI: import
    updateCourse, 
    deleteCourse 
} = require('../controllers/courseController');
// ...

// 1. Kurs yaratish
router.post('/', adminOrTeacher, createCourse);

// 2. Barcha kurslarni olish
router.get('/', protect, getAllCourses);

// 3. YENGI: Yagona kursni olish (Frontend tahrirlash formasini to'ldirish uchun)
router.get('/:id', protect, getSingleCourse);

// 4. Kursni tahrirlash
router.put('/:id', adminOrTeacher, updateCourse);

// 5. Kursni o'chirish
router.delete('/:id', adminOrTeacher, deleteCourse);

module.exports = router;