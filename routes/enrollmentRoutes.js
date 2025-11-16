const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const { authorizeRoles } = require('../middleware/roleMiddleware'); 
const {
    enrollCourse,
    getMyEnrollments,
} = require('../controllers/enrollmentController');
const router = express.Router();

// Talabalik rolini tekshiruvchi middleware
const onlyStudents = authorizeRoles('student');

// POST /api/enroll - Kursga ro'yxatdan o'tish
// Barcha foydalanuvchilar (Student/Teacher/Admin) ro'yxatdan o'tishga urinishi mumkin, lekin mantiqni Controller tekshiradi
router.post('/', protect, enrollCourse);

// GET /api/enroll/my-courses - O'zining kurslarini olish
router.get('/my-courses', protect, getMyEnrollments);

module.exports = router;