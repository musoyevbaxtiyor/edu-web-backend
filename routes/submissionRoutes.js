const express = require('express');
const router = express.Router();
const { createSubmission,handleSubmissionReview, getMySubmission } = require('../controllers/submissionController');
const { approveSubmission, getSubmissionsByLesson,getPendingSubmissionsForTeacher } = require('../controllers/submissionController'); // approveSubmission va getSubmissionsByLesson ni import qiling
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

// Vazifalarni dars bo'yicha olish (Faqat O'qituvchi/Admin ko'ra oladi)
router.get('/:lessonId', protect, restrictTo('teacher', 'admin'), getSubmissionsByLesson);

// Vazifani tasdiqlash/baholash (PUT /api/submissions/approve/:submissionId)
router.put('/review/:submissionId', // 🔥 MARSHRUT NOMINI O'ZGARTIRDIK
    protect, 
    restrictTo('teacher', 'admin'), 
    handleSubmissionReview // 🔥 HANDLER NI YANGILASH
);

// --- YANIG: O'qituvchi panel uchun marshrut ---
router.get('/teacher/pending', 
    protect, 
    restrictTo('teacher', 'admin'), 
    getPendingSubmissionsForTeacher // 🔥 Vazifalarni olish
);

// --- Student o'z submission'ini olish ---
router.get('/my/:lessonId', 
    protect, 
    restrictTo('student'), 
    getMySubmission
);

module.exports = router;