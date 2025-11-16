const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Foydalanuvchini topish uchun

// Bu funksiya JWT tokeni mavjudligini va to'g'riligini tekshiradi
const protect = async (req, res, next) => {
    let token;

    // 1. Authorization sarlavhasini (Header) tekshirish
    // Token odatda "Bearer TOKEN_STRINGI" formatida keladi
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // "Bearer" so'zini olib tashlab, faqat tokenni olamiz
            token = req.headers.authorization.split(' ')[1];

            // 2. Tokenni yashirin kalit (JWT_SECRET) orqali tekshirish va dekod qilish
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Dekod qilingan ID orqali foydalanuvchini topish
            // Paroldan tashqari barcha ma'lumotlarni req.user ga biriktiramiz
            req.user = await User.findById(decoded.id).select('-password');

            // 4. Keyingi Middleware yoki Controller funksiyasiga o'tish
            next();
            
        } catch (error) {
            console.error(error);
            // Token yaroqsiz bo'lsa
            res.status(401).json({ message: 'Avtorizatsiya muvaffaqiyatsiz, token yaroqsiz.' });
        }
    }

    if (!token) {
        // Token sarlavhada mavjud bo'lmasa
        res.status(401).json({ message: 'Avtorizatsiya muvaffaqiyatsiz, token topilmadi.' });
    }
};

module.exports = { protect };