const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

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

// @desc    Foydalanuvchi profilini yangilash
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const { name, email, phone, age } = req.body;
    const userId = req.user._id;

    // Yangilanishi kerak bo'lgan maydonlarni yig'ish
    const updateFields = {};
    
    if (name) {
        if (name.trim().length < 2) {
            return res.status(400).json({ 
                message: 'Ism kamida 2 belgidan iborat bo\'lishi kerak.' 
            });
        }
        updateFields.name = name.trim();
    }

    if (email) {
        // Email formatini tekshirish
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Noto\'g\'ri email formati.' 
            });
        }

        // Email boshqa foydalanuvchi tomonidan ishlatilganligini tekshirish
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            _id: { $ne: userId } // Joriy foydalanuvchidan boshqa
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Bu email allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda.' 
            });
        }

        updateFields.email = email.toLowerCase();
    }

    if (phone !== undefined && phone !== null && phone !== '') {
        // Telefon raqamini tozalash va tekshirish
        const cleanPhone = phone.toString().trim().replace(/\s+/g, '');
        
        if (cleanPhone.length < 9) {
            return res.status(400).json({ 
                message: 'Telefon raqami noto\'g\'ri. Kamida 9 belgi bo\'lishi kerak.' 
            });
        }

        // Telefon boshqa foydalanuvchi tomonidan ishlatilganligini tekshirish
        const existingPhone = await User.findOne({ 
            phone: cleanPhone,
            _id: { $ne: userId } // Joriy foydalanuvchidan boshqa
        });

        if (existingPhone) {
            return res.status(400).json({ 
                message: 'Bu telefon raqami allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda.' 
            });
        }

        updateFields.phone = cleanPhone;
    }

    if (age !== undefined && age !== null) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 14 || ageNum > 120) {
            return res.status(400).json({ 
                message: 'Yosh 14 dan 120 gacha bo\'lishi kerak.' 
            });
        }
        updateFields.age = ageNum;
    }

    // Agar hech qanday maydon yangilanmasa
    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ 
            message: 'Yangilanishi kerak bo\'lgan maydonlar ko\'rsatilmagan.' 
        });
    }

    try {
        // Foydalanuvchi ma'lumotlarini yangilash
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { 
                new: true, // Yangilangan ma'lumotlarni qaytarish
                runValidators: true // Schema validatsiyasini ishga tushirish
            }
        ).select('-password'); // Parolni javobdan olib tashlash

        if (!updatedUser) {
            return res.status(404).json({ 
                message: 'Foydalanuvchi topilmadi.' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profil muvaffaqiyatli yangilandi.',
            user: updatedUser
        });

    } catch (error) {
        // MongoDB validation xatolari
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: errors.join(', ') 
            });
        }

        // Duplicate key xatosi (unique constraint)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                message: `${field} allaqachon mavjud.` 
            });
        }

        // Boshqa xatolar
        console.error('Profilni yangilashda xato:', error);
        res.status(500).json({ 
            message: 'Server xatosi. Profilni yangilashda muammo yuz berdi.' 
        });
    }
});

module.exports = { getUserProfile, updateUserProfile };