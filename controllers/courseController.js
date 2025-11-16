const Course = require('../models/courseModel');
const User = require('../models/userModel'); // O'qituvchi rolini olish uchun

// @desc    Yangi kurs yaratish
// @route   POST /api/courses
// @access  Private (Admin/Teacher)
const createCourse = async (req, res) => {
    // req.user himoya middleware'i orqali o'rnatilgan
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
        return res.status(400).json({ message: 'Iltimos, barcha kurs maydonlarini to\'ldiring.' });
    }

    try {
        // Kursni yaratgan foydalanuvchining ID'sini avtomatik kiritamiz
        const course = await Course.create({
            title,
            description,
            price,
            teacher: req.user.id, // req.user.id himoya (protect) middleware'idan keladi
        });

        res.status(201).json({
            message: "Kurs muvaffaqiyatli yaratildi!",
            course
        });

    } catch (error) {
        // MongoDB unikallik xatosini tutish (duplicate title)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Bu nomdagi kurs allaqachon mavjud.' });
        }
        res.status(500).json({ message: 'Server xatosi: ' + error.message });
    }
};

// ------------------------------
// ... (createCourse va getAllCourses funksiyalari yuqorida qoladi) ...
const mongoose = require('mongoose'); // Valid MongoDB ID'ni tekshirish uchun

// @desc    Kursni tahrirlash (UPDATE)
// @route   PUT /api/courses/:id
// @access  Private (Admin/Teacher)
const updateCourse = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // ID'ning to'g'ri formatda ekanligini tekshirish
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Noto\'g\'ri kurs ID formati.' });
    }

    try {
        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({ message: 'Kurs topilmadi.' });
        }

        // --- EGALIKNI VA ROLNI TEKSHIRISH ---
        // Foydalanuvchi Admin emasmi VA u kursning egasi (teacher) emasmi?
        const isOwner = course.teacher.toString() === req.user.id.toString();

        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Ruxsat yo\'q. Siz faqat o\'zingiz yaratgan kursni tahrirlay olasiz.' });
        }
        // ------------------------------------

        // Kursni yangilash
        const updatedCourse = await Course.findByIdAndUpdate(id, updates, {
            new: true, // Yangilangan hujjatni qaytarish
            runValidators: true // Schema validatsiyalarini ishlatish
        });

        res.status(200).json({
            message: 'Kurs muvaffaqiyatli tahrirlandi!',
            course: updatedCourse
        });

    } catch (error) {
        res.status(500).json({ message: 'Kursni tahrirlashda xato: ' + error.message });
    }
};

// @desc    Kursni o'chirish (DELETE)
// @route   DELETE /api/courses/:id
// @access  Private (Admin/Teacher)
const deleteCourse = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Noto\'g\'ri kurs ID formati.' });
    }

    try {
        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({ message: 'Kurs topilmadi.' });
        }

        // --- EGALIKNI VA ROLNI TEKSHIRISH ---
        const isOwner = course.teacher.toString() === req.user.id.toString();

        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Ruxsat yo\'q. Siz faqat o\'zingiz yaratgan kursni o\'chira olasiz.' });
        }
        // ------------------------------------
        
        await Course.deleteOne({ _id: id }); // Kursni o'chirish

        res.status(200).json({ message: 'Kurs muvaffaqiyatli o\'chirildi.' });

    } catch (error) {
        res.status(500).json({ message: 'Kursni o\'chirishda xato: ' + error.message });
    }
};


// ------------------------------

// @desc    Barcha kurslarni olish (Hamma uchun ochiq, ammo token talab)
// @route   GET /api/courses
// @access  Private (Talaba, O'qituvchi, Admin)
const getAllCourses = async (req, res) => {
    try {
        // Barcha kurslarni o'qituvchi ma'lumotlari bilan birga yuklash
        const courses = await Course.find({}).populate('teacher', 'name email role'); 

        res.status(200).json({ 
            count: courses.length,
            courses 
        });

    } catch (error) {
        res.status(500).json({ message: 'Kurslarni olishda xato: ' + error.message });
    }
};

// ... (getAllCourses funksiyasi tugaganidan keyin) ...

// @desc    Yagona kursni ID bo'yicha olish (READ Single)
// @route   GET /api/courses/:id
// @access  Private (Hamma uchun ochiq, token talab)
const getSingleCourse = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Noto\'g\'ri kurs ID formati.' });
    }

    try {
        // Kursni va uning o'qituvchisini yuklash
        const course = await Course.findById(id).populate('teacher', 'name email');

        if (!course) {
            return res.status(404).json({ message: 'Kurs topilmadi.' });
        }

        res.status(200).json({ course });

    } catch (error) {
        res.status(500).json({ message: 'Kursni olishda xato: ' + error.message });
    }
};

// ... (updateCourse va deleteCourse funksiyalari) ...

module.exports = { 
    createCourse, 
    getAllCourses, 
    getSingleCourse, // EKSPORTNI YANGILASH
    updateCourse, 
    deleteCourse 
};

// module.exports = { createCourse, getAllCourses, updateCourse, deleteCourse }; // Eksportni yangilash!