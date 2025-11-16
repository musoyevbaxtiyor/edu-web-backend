// @desc    Tizimga kirgan foydalanuvchi profilini olish
// @route   GET /api/users/profile
// @access  Private (Himoyalangan)
const getUserProfile = (req, res) => {
    // req.user avtomatik ravishda authMiddleware.js orqali to'ldirilgan
    res.json({
        user: req.user,
        message: 'Bu ma\'lumotni faqat tokeni bor foydalanuvchi ko\'ra oladi.'
    });
};

module.exports = { getUserProfile };