const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getTelegramToken,
    connectTelegram,
    connectTelegramWithLogin,
    getStudentData,
    getTeacherNotifications,
    requireBotSecret
} = require('../controllers/telegramController');

// Foydalanuvchi uchun Telegram token olish
router.get('/token', protect, getTelegramToken);

// Quyidagilar faqat bot uchun: X-Bot-Secret sarlavhasi talab qilinadi.
// Serverdagi bot ularni chaqirmaydi — controller funksiyalarini to'g'ridan-to'g'ri ishlatadi.

// Bot orqali Telegram ulash (token bilan)
router.post('/connect', requireBotSecret, connectTelegram);

// Bot orqali Telegram ulash (login va parol bilan)
router.post('/connect-login', requireBotSecret, connectTelegramWithLogin);

// O'quvchi ma'lumotlarini olish (bot uchun)
router.get('/student-data/:chatId', requireBotSecret, getStudentData);

// O'qituvchi xabarlarini olish (bot uchun)
router.get('/teacher-notifications/:chatId', requireBotSecret, getTeacherNotifications);

module.exports = router;
