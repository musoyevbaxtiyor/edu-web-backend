// edu-web-backend/routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getCourses, 
    getCourseById, 
    createCourse, 
    updateCourse, 
    deleteCourse 
} = require('../controllers/courseController');
// restrictTo'ni import qilamiz
const { protect, restrictTo } = require('../middleware/authMiddleware'); 

// ...

// Barcha kurslarni olish (Hamma kirishi mumkin)
router.get('/', protect, getCourses); 

// Bitta kursni olish (Hamma kirishi mumkin)
router.get('/:id', protect, getCourseById); 

// Kurs yaratish (Faqat O'qituvchi va Admin)
router.post('/', 
    protect, 
    restrictTo('teacher', 'admin'), 
    createCourse
);

// Kursni tahrirlash (Faqat O'z egasi va Admin)
// Eslatma: O'z egaligini tekshirishni Controllerda qilamiz
router.put('/:id', 
    protect, 
    restrictTo('teacher', 'admin'), 
    updateCourse
);

// Kursni o'chirish (Faqat O'z egasi va Admin)
router.delete('/:id', 
    protect, 
    restrictTo('teacher', 'admin'), 
    deleteCourse
);

module.exports = router;