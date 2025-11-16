const User = require('../models/userModel');

// @desc    Yangi foydalanuvchini ro'yxatdan o'tkazish
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    // 1. Maydonlar to'ldirilganligini tekshirish
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Iltimos, barcha maydonlarni to\'ldiring.' });
    }

    try {
        // 2. Foydalanuvchi mavjudligini tekshirish
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Ushbu email allaqachon ro\'yxatdan o\'tgan.' });
        }

        // 3. Yangi foydalanuvchini yaratish
        const user = await User.create({ name, email, password });

        if (user) {
            res.status(201).json({
                name: user.name,
                email: user.email,
                message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!"
            });
        } else {
            res.status(400).json({ message: 'Foydalanuvchini yaratishda xato.' });
        }

    } catch (error) {
        // Ma'lumotlar bazasi yoki server xatosi
        res.status(500).json({ message: 'Server xatosi: ' + error.message });
    }
};

module.exports = { registerUser };