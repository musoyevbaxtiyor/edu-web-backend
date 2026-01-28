const express = require('express');
const router = express.Router();
const { createSubmission,handleSubmissionReview, getMySubmission } = require('../controllers/submissionController');
const { approveSubmission, getSubmissionsByLesson, getPendingSubmissionsForTeacher, getAllSubmissionsForTeacher, getAllMySubmissions } = require('../controllers/submissionController');
const { uploadSubmissionFile } = require('../middleware/submissionMiddleware'); // 🔥 IMPORT QILAMIZ
// protect'ni authMiddleware'dan to'g'ri import qilishni unutmang
// const { protect } = require('../middleware/authMiddleware'); 
const { protect, restrictTo } = require('../middleware/authMiddleware'); // <--- restrictTo qo'shildi!
// // Vazifani topshirish (POST /api/submissions)
// router.post('/', protect, createSubmission); 

// Kerakli boshqa marshrutlar (Masalan: GET barcha topshiriqlar)
// router.get('/', protect, restrictTo('teacher', 'admin'), getSubmissions);

// Vazifani topshirish (POST /api/submissions)
router.post('/', 
    protect, 
    restrictTo('student'), 
    uploadSubmissionFile, // 🔥 MUHIM: MULTER ENDI BIRINCHI KELADI
    createSubmission      // 🔥 VA Controller Endi Ikkinchi KELADI
); 

// --- O'qituvchi: barcha topshiriqlar jadvali (/:lessonId dan OLDIN bo'lishi shart) ---
router.get('/teacher/all', protect, restrictTo('teacher', 'admin'), getAllSubmissionsForTeacher);
router.get('/teacher/pending', protect, restrictTo('teacher', 'admin'), getPendingSubmissionsForTeacher);

// Vazifani tasdiqlash/baholash
router.put('/review/:submissionId', protect, restrictTo('teacher', 'admin'), handleSubmissionReview);

// Student barcha submission'lari (vazifalar jadvali) — /my/:lessonId dan oldin
router.get('/my', protect, restrictTo('student'), getAllMySubmissions);
router.get('/my/:lessonId', protect, restrictTo('student'), getMySubmission);

// Vazifalarni dars bo'yicha olish (Faqat O'qituvchi/Admin)
router.get('/:lessonId', protect, restrictTo('teacher', 'admin'), getSubmissionsByLesson);

module.exports = router;