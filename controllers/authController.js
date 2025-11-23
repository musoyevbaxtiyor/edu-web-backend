// edu-web-backend/controllers/authController.js

const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs'); // Parolni solishtirish uchun

// @desc    Yangi foydalanuvchini ro'yxatdan o'tkazish
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    // ... (Sizning registerUser funksiyangiz kodi o'zgarishsiz qoladi) ...
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
            phone,
            age,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token: generateToken(user._id),
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


// @desc    Foydalanuvchini tizimga kiritish
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Foydalanuvchini email orqali topish
        const user = await User.findOne({ email });

        // 2. Foydalanuvchi mavjudligini va parolni tekshirish
        if (user && (await bcrypt.compare(password, user.password))) {
            // Parol to'g'ri, muvaffaqiyatli javob yuboramiz
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                message: "Tizimga muvaffaqiyatli kirdingiz!"
            });
        } else {
            // Foydalanuvchi topilmasa yoki parol noto'g'ri bo'lsa
            res.status(401).json({ message: 'Email yoki parol noto\'g\'ri.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server xatosi: ' + error.message });
    }
};

// =========================================================
// YENGI QO'SHILGAN FUNKSIYA: Token orqali foydalanuvchi ma'lumotlarini olish (GET /api/auth/me)
// =========================================================
// @desc    Token orqali joriy foydalanuvchi ma'lumotlarini olish
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    // req.user obyektini 'protect' middleware qo'shgan bo'lishi kerak.
    // Bu obyektda foydalanuvchining hamma ma'lumotlari (shu jumladan role) mavjud.
    
    // Odatda parolsiz ma'lumotlarni yuborish yaxshi
    const user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role, // Frontendga kerak bo'lgan ROL!
        phone: req.user.phone,
        age: req.user.age
    };

    res.status(200).json({ user }); // { user: {...} } formatida javob yuboramiz
};

module.exports = { 
    registerUser, 
    loginUser, 
    getMe // <<<< getMe ni eksport qilishni unutmang!
};