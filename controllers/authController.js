const User = require('../models/userModel');

// @desc    Yangi foydalanuvchini ro'yxatdan o'tkazish
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    // YENGI MAYDONLAR QO'SHILDI
    const { name, email, password, phone, age } = req.body; 

    // 1. Barcha maydonlar to'ldirilganligini tekshirish
    if (!name || !email || !password || !phone || !age) {
        return res.status(400).json({ message: 'Iltimos, barcha maydonlarni (Ism, Email, Parol, Telefon, Yosh) to\'ldiring.' });
    }

    try {
        // 2. Foydalanuvchi mavjudligini tekshirish (Email orqali)
        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ message: 'Ushbu email yoki telefon raqam allaqachon ro\'yxatdan o\'tgan.' });
        }

        // 3. Yangi foydalanuvchini yaratish
        const user = await User.create({
            name,
            email,
            password,
            phone, // YANGI
            age,     // YANGI
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone, // Javobga qo'shildi
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