const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Foydalanuvchini topish uchun
const asyncHandler = require('express-async-handler'); // (Agar avval import qilmagan bo'lsangiz, uni qo'shing)
// Bu funksiya JWT tokeni mavjudligini va to'g'riligini tekshiradi
const protect = asyncHandler(
    async (req, res, next) => {
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
            return; // <<<<< MUHIM QO'SHIMCHA: Kod shu yerda to'xtaydi
        }
    }

    if (!token) {
        // Token sarlavhada mavjud bo'lmasa
        res.status(401).json({ message: 'Avtorizatsiya muvaffaqiyatsiz, token topilmadi.' });
        return; // <<<<< MUHIM QO'SHIMCHA: Kod shu yerda to'xtaydi
    }
}
);
// edu-web-backend/middleware/authMiddleware.js

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user obyektida protect middleware orqali foydalanuvchi roli mavjud
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Ruxsat yo'q. Faqat ${roles.join(', ')} bu amalni bajarishi mumkin.`);
        }
        next();
    };
};

module.exports = { protect, restrictTo }; // Exportni yangilash