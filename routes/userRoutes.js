const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { getUserProfile, updateUserProfile, getUserStatistics, getStudentsRatings, getNotifications, getMyScores, getAllUsers } = require('../controllers/userController');

const router = express.Router();

// 1. Profilni olish (Bu student, teacher, admin barchasi uchun ochiq)
router.get('/profile', protect, getUserProfile);

// 2. Profilni yangilash (Bu student, teacher, admin barchasi uchun ochiq)
router.put('/profile', protect, updateUserProfile);

// 3. Foydalanuvchi statistikalarini olish
router.get('/statistics', protect, getUserStatistics);

// 4. Barcha studentlar reytingini olish
router.get('/ratings', protect, getStudentsRatings);

// 5. Xabarlarni olish
router.get('/notifications', protect, getNotifications);

// 6. O'quvchi uchun o'z ballarini olish
router.get('/my-scores', protect, getMyScores);

// 7. Admin: barcha foydalanuvchilar (User Info jadvali)
router.get('/admin/all', protect, restrictTo('admin'), getAllUsers);

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