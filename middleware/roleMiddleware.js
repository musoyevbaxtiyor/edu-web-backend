// Bu funksiya yuqori tartibli funksiya (High-Order Function) bo'lib,
// qabul qiluvchi ruxsat berilgan rollar massivi asosida yangi middleware qaytaradi.
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user faqatgina 'protect' middleware'i muvaffaqiyatli ishga tushganidan keyin mavjud bo'ladi.
        
        // 1. Foydalanuvchi mavjudligini va uning rolini tekshirish
        if (!req.user || !req.user.role) {
            // Avtorizatsiyadan o'tmagan
            return res.status(401).json({ 
                message: 'Avtorizatsiya muvaffaqiyatsiz. Iltimos, tizimga kiring.' 
            });
        }

        // 2. Foydalanuvchi rolini ruxsat berilgan rollar ro'yxati bilan solishtirish
        const hasPermission = allowedRoles.includes(req.user.role);

        if (hasPermission) {
            // Agar ro'yxatdan o'tgan bo'lsa, keyingi funksiyaga o'tish
            next();
        } else {
            // Ruxsat yo'q
            res.status(403).json({ 
                message: 'Ruxsat yo\'q. Ushbu amalni bajarish uchun sizga tegishli rol (Admin/Teacher) kerak.' 
            });
        }
    };
};

module.exports = { authorizeRoles };