const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const { authorizeRoles } = require('../middleware/roleMiddleware'); // YANGI: Rollarni tekshirishni import qilish
const { getUserProfile, updateUserProfile, getUserStatistics } = require('../controllers/userController');

const router = express.Router();

// 1. Profilni olish (Bu student, teacher, admin barchasi uchun ochiq)
router.get('/profile', protect, getUserProfile);

// 2. Profilni yangilash (Bu student, teacher, admin barchasi uchun ochiq)
router.put('/profile', protect, updateUserProfile);

// 3. Foydalanuvchi statistikalarini olish
router.get('/statistics', protect, getUserStatistics);

// 4. Barcha studentlar reytingini olish
router.get('/ratings', protect, getStudentsRatings); 

// 2. YENGI: Faqat ADMIN kira oladigan route
// Bu yerda ikki bosqichli himoya ishlaydi:
// 1. protect: Tizimga kirganmi?
// 2. authorizeRoles('admin'): Uning roli "admin" mi?
router.get(
    '/admin-only-test', 
    protect, 
    authorizeRoles('admin'), // Faqat roli 'admin' bo'lganlarga ruxsat
    (req, res) => {
        res.json({ 
            message: `Xush kelibsiz Admin ${req.user.name}. Bu route himoyalangan.`,
            role: req.user.role
        });
    }
);

module.exports = router;