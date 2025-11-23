const express = require('express');
const router = express.Router();
const { createSubmission } = require('../controllers/submissionController');
// protect'ni authMiddleware'dan to'g'ri import qilishni unutmang
const { protect } = require('../middleware/authMiddleware'); 

// Vazifani topshirish (POST /api/submissions)
router.post('/', protect, createSubmission); 

// Kerakli boshqa marshrutlar (Masalan: GET barcha topshiriqlar)
// router.get('/', protect, restrictTo('teacher', 'admin'), getSubmissions);

module.exports = router;