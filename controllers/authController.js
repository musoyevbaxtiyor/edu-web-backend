// edu-web-backend/controllers/authController.js

const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const { comparePassword } = require('../utils/passwordHelper'); // Parolni solishtirish uchun
const { normalizeEmail, isValidEmail, MIN_PASSWORD_LENGTH, MAX_EMAIL_LENGTH } = require('../utils/validation');

// @desc    Yangi foydalanuvchini ro'yxatdan o'tkazish
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phone, age } = req.body || {};

    // 1. Barcha maydonlar to'ldirilganligini tekshirish
    if (!name || !email || !password || !phone || !age) {
        return res.status(400).json({ message: 'Iltimos, barcha maydonlarni (Ism, Email, Parol, Telefon, Yosh) to\'ldiring.' });
    }

    // 1.1 Maydonlar turi va formatini tekshirish (faqat yangi ro'yxatdan o'tish uchun)
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
        || (typeof phone !== 'string' && typeof phone !== 'number')) {
        return res.status(400).json({ message: 'Ma\'lumotlar noto\'g\'ri formatda yuborildi.' });
    }
    // Faqat bo'sh joydan iborat ism/telefon ham to'ldirilmagan hisoblanadi
    if (!name.trim() || !String(phone).trim()) {
        return res.status(400).json({ message: 'Iltimos, barcha maydonlarni (Ism, Email, Parol, Telefon, Yosh) to\'ldiring.' });
    }
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ message: 'Noto\'g\'ri email formati.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ message: `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.` });
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 14 || ageNum > 120) {
        return res.status(400).json({ message: 'Yosh 14 dan 120 gacha bo\'lishi kerak.' });
    }
    const cleanPhone = String(phone).trim();

    try {
        // 2. Foydalanuvchi mavjudligini tekshirish (email — harfga befarq, telefon)
        const userExists = (await User.findByEmail(cleanEmail)) || (await User.findOne({ phone: cleanPhone }));
        if (userExists) {
            return res.status(400).json({ message: 'Ushbu email yoki telefon raqam allaqachon ro\'yxatdan o\'tgan.' });
        }

        // 3. Yangi foydalanuvchini yaratish (email kichik harfda saqlanadi)
        const user = await User.create({
            name: name.trim(),
            email: cleanEmail,
            password,
            phone: cleanPhone,
            age: ageNum,
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
        // Bir vaqtda ikki marta yuborilsa — unique indeks xatosi
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ushbu email yoki telefon raqam allaqachon ro\'yxatdan o\'tgan.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors).map((e) => e.message).join(', ') });
        }
        // Ma'lumotlar bazasi yoki server xatosi (ichki tafsilotlar foydalanuvchiga ko'rsatilmaydi)
        console.error('Ro\'yxatdan o\'tishda xato:', error);
        res.status(500).json({ message: 'Server xatosi. Iltimos, keyinroq urinib ko\'ring.' });
    }
};


// @desc    Foydalanuvchini tizimga kiritish
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body || {};

    // Faqat satr qabul qilinadi (obyekt yuborib so'rovni buzishning oldini olish)
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).json({ message: 'Email va parolni kiriting.' });
    }
    // Juda uzun email hech qaysi hisobga mos kelmaydi — bazaga so'rov yubormaymiz
    if (email.trim().length > MAX_EMAIL_LENGTH) {
        return res.status(401).json({ message: 'Email yoki parol noto\'g\'ri.' });
    }

    try {
        // 1. Foydalanuvchini email orqali topish (katta-kichik harfga befarq)
        const user = await User.findByEmail(email);

        // 2. Foydalanuvchi mavjudligini va parolni tekshirish
        if (user && (await comparePassword(password, user.password))) {
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
        console.error('Tizimga kirishda xato:', error);
        res.status(500).json({ message: 'Server xatosi. Iltimos, keyinroq urinib ko\'ring.' });
    }
};

// =========================================================
// YENGI QO'SHILGAN FUNKSIYA: Token orqali foydalanuvchi ma'lumotlarini olish (GET /api/auth/me)
// =========================================================
// @desc    Token orqali joriy foydalanuvchi ma'lumotlarini olish
// @route   GET /api/auth/me
// @access  Private
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
        age: req.user.age,
        coins: req.user.coins || 0,
        createdAt: req.user.createdAt // Profil: "A'zo bo'lgan sana"
    };

    res.status(200).json({ user }); // { user: {...} } formatida javob yuboramiz
};

module.exports = { 
    registerUser, 
    loginUser, 
    getMe // <<<< getMe ni eksport qilishni unutmang!
};
