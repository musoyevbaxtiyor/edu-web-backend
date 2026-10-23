const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Foydalanuvchini topish uchun
const asyncHandler = require('express-async-handler'); // (Agar avval import qilmagan bo'lsangiz, uni qo'shing)
// Bu funksiya JWT tokeni mavjudligini va to'g'riligini tekshiradi
const protect = asyncHandler(
    async (req, res, next) => {
    // 1. Authorization sarlavhasini (Header) tekshirish
    // Token odatda "Bearer TOKEN_STRINGI" formatida keladi
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith('Bearer')
    ) {
        // Token sarlavhada mavjud bo'lmasa
        res.status(401).json({ message: 'Avtorizatsiya muvaffaqiyatsiz, token topilmadi.' });
        return; // <<<<< MUHIM QO'SHIMCHA: Kod shu yerda to'xtaydi
    }

    // "Bearer" so'zini olib tashlab, faqat tokenni olamiz
    const token = req.headers.authorization.split(' ')[1];

    // 2. Tokenni yashirin kalit (JWT_SECRET) orqali tekshirish va dekod qilish
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        console.error(error.message);
        // Token yaroqsiz bo'lsa
        res.status(401).json({ message: 'Avtorizatsiya muvaffaqiyatsiz, token yaroqsiz.' });
        return; // <<<<< MUHIM QO'SHIMCHA: Kod shu yerda to'xtaydi
    }

    // 3. Dekod qilingan ID orqali foydalanuvchini topish
    // Paroldan tashqari barcha ma'lumotlarni req.user ga biriktiramiz
    const user = await User.findById(decoded.id).select('-password');

    // Foydalanuvchi o'chirilgan bo'lsa — 401 (frontend sessiyani tozalaydi)
    if (!user) {
        res.status(401).json({ message: 'Foydalanuvchi topilmadi, qayta kiring.' });
        return;
    }

    // Token paroldan oldin berilgan bo'lsa — yaroqsiz (passwordChangedAt yo'q eski userlarga ta'sir qilmaydi)
    if (user.passwordChangedAt && decoded.iat
        && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
        res.status(401).json({ message: 'Parol o\'zgartirilgan. Iltimos, qaytadan kiring.' });
        return;
    }

    req.user = user;

    // 4. Keyingi Middleware yoki Controller funksiyasiga o'tish
    next();
}
);
// edu-web-backend/middleware/authMiddleware.js

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user obyektida protect middleware orqali foydalanuvchi roli mavjud
        if (!req.user) {
            res.status(401);
            throw new Error('Avtorizatsiya muvaffaqiyatsiz. Iltimos, tizimga kiring.');
        }
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Ruxsat yo'q. Faqat ${roles.join(', ')} bu amalni bajarishi mumkin.`);
        }
        next();
    };
};

module.exports = { protect, restrictTo }; // Exportni yangilash