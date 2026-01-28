const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getTelegramToken,
    connectTelegram,
    connectTelegramWithLogin,
    getStudentData,
    getTeacherNotifications
} = require('../controllers/telegramController');

// Foydalanuvchi uchun Telegram token olish
router.get('/token', protect, getTelegramToken);

// Bot orqali Telegram ulash (public, lekin token bilan)
router.post('/connect', connectTelegram);

// Bot orqali Telegram ulash (login va parol bilan)
router.post('/connect-login', connectTelegramWithLogin);

// O'quvchi ma'lumotlarini olish (bot uchun)
router.get('/student-data/:chatId', getStudentData);

// O'qituvchi xabarlarini olish (bot uchun)
router.get('/teacher-notifications/:chatId', getTeacherNotifications);

module.exports = router;
