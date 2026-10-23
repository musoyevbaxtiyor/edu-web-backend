const asyncHandler = require('express-async-handler');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const Lesson = require('../models/lessonModel');
const Submission = require('../models/submissionModel');
const Progress = require('../models/progressModel');
const Enrollment = require('../models/EnrollmentModel');
const mongoose = require('mongoose');

// Kurs narxini tekshirish: bo'sh -> 0 (bepul), manfiy yoki son bo'lmasa -> null
const PRICE_ERROR = 'Kurs narxi 0 yoki undan katta son bo\'lishi kerak.';
const parsePrice = (price) => {
    if (price === undefined || price === null || price === '') return 0;
    const value = Number(price);
    return Number.isFinite(value) && value >= 0 ? value : null;
};

// O'qituvchi maydonlari: email va rol faqat admin uchun (talabalarga xodimlar emaili berilmaydi)
const teacherFieldsFor = (user) => (user && user.role === 'admin' ? 'name email role' : 'name');

// @desc    Yangi kurs yaratish
// @route   POST /api/courses
// @access  Private (Admin/Teacher)
const createCourse = asyncHandler(async (req, res) => { // <<< asyncHandler bilan o'raldi
    const { title, description, price, isPublished } = req.body || {};

    if (!title || !description) {
        res.status(400);
        throw new Error('Iltimos, barcha kurs maydonlarini to\'ldiring.'); // <<< Xato tashlash
    }

    // Narx 0 (bepul kurs) ham to'g'ri qiymat
    const finalPrice = parsePrice(price);
    if (finalPrice === null) {
        res.status(400);
        throw new Error(PRICE_ERROR);
    }

    // Kursni yaratish
    const course = await Course.create({
        title,
        description,
        price: finalPrice,
        isPublished: isPublished === true || isPublished === 'true', // "Darhol nashr qilish" belgisi
        teacher: req.user.id, // req.user.id himoya (protect) middleware'idan keladi
    });

    res.status(201).json({
        message: "Kurs muvaffaqiyatli yaratildi!",
        course
    });
    // try/catch olib tashlandi. Xatolik (masalan, 11000 duplicate key error) errorMiddleware orqali boshqariladi.
});


// @desc    Barcha kurslarni olish (Hamma uchun ochiq, ammo token talab)
// @route   GET /api/courses
// @access  Private (Talaba, O'qituvchi, Admin)
const getAllCourses = asyncHandler(async (req, res) => { // <<< asyncHandler bilan o'raldi
    // Barcha kurslarni o'qituvchi ma'lumotlari bilan birga yuklash
    const courses = await Course.find({}).populate('teacher', teacherFieldsFor(req.user));

    res.status(200).json({ 
        count: courses.length,
        courses 
    });
});


const getTeacherCourses = async (req, res) => {
    try {
        // req.user.id 'protect' middleware tomonidan qo'shilgan.
        // Admin barcha kurslarni boshqaradi, o'qituvchi faqat o'zinikini
        const filter = req.user.role === 'admin' ? {} : { teacher: req.user.id };
        const courses = await Course.find(filter)
            .populate('teacher', 'name'); // O'qituvchi nomini yuklash

        res.status(200).json({ courses });
    } catch (error) {
        res.status(500).json({ message: 'O\'qituvchi kurslarini yuklashda xato: ' + error.message });
    }
}

// @desc    Yagona kursni ID bo'yicha olish (READ Single)
// @route   GET /api/courses/:id
// @access  Private (Hamma uchun ochiq, token talab)
const getSingleCourse = asyncHandler(async (req, res) => { // <<< asyncHandler bilan o'raldi
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error('Noto\'g\'ri kurs ID formati.');
    }

    // Kursni va uning o'qituvchisini yuklash
    const course = await Course.findById(id).populate('teacher', teacherFieldsFor(req.user));

    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi.');
    }

    res.status(200).json({ course });
});

// edu-web-backend/controllers/courseController.js

// ... (boshqa funksiyalar) ...

// @desc    Foydalanuvchi yaratgan barcha kurslarni olish (O'qituvchi/Admin)
// @route   GET /api/courses/my-created-courses
// @access  Private (O'qituvchi/Admin)
const getMyCreatedCourses = asyncHandler(async (req, res) => {
    // req.user himoya (protect) middleware'idan keladi
    const courses = await Course.find({ teacher: req.user.id }).populate('teacher', 'name email role');

    res.status(200).json({
        count: courses.length,
        courses,
    });
});

// module.exports qismini yangilang

// @desc    Kursni tahrirlash (UPDATE)
// @route   PUT /api/courses/:id
// @access  Private (Admin/Teacher)
const updateCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi');
    }
    
    // RBAC: Faqat ADMIN yoki kursning egasi tahrirlay oladi
    if (req.user.role !== 'admin' && course.teacher.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Siz faqat o\'zingiz yaratgan kursni tahrirlashingiz mumkin.');
    }
    
    // Faqat ruxsat etilgan maydonlar (teacher/egasini o'zgartirib bo'lmaydi)
    const { title, description, price, isPublished } = req.body || {};
    const fields = {};
    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (isPublished !== undefined) fields.isPublished = isPublished === true || isPublished === 'true';
    if (price !== undefined) {
        const finalPrice = parsePrice(price);
        if (finalPrice === null) {
            res.status(400);
            throw new Error(PRICE_ERROR);
        }
        fields.price = finalPrice;
    }

    if ((fields.title !== undefined && !String(fields.title).trim()) ||
        (fields.description !== undefined && !String(fields.description).trim())) {
        res.status(400);
        throw new Error('Kurs nomi va tavsifi bo\'sh bo\'lishi mumkin emas.');
    }

    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, fields, {
        new: true,
        runValidators: true,
    });
    
    res.status(200).json({
        message: 'Kurs muvaffaqiyatli yangilandi',
        course: updatedCourse
    });
});


// @desc    Kursni o'chirish (DELETE)
// @route   DELETE /api/courses/:id
// @access  Private (Admin/Teacher)
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi');
    }

    // RBAC: Faqat ADMIN yoki kursning egasi o'chira oladi
    if (req.user.role !== 'admin' && course.teacher.toString() !== req.user.id) {
        res.status(403);
        throw new Error('Siz faqat o\'zingiz yaratgan kursni o\'chirishingiz mumkin.');
    }

    const courseId = req.params.id;

    // O'chirilgan kursga tegishli darslar, vazifalar, progress va enrollmentlarni ham o'chirish
    const lessons = await Lesson.find({ course: courseId }).select('_id');
    const lessonIds = lessons.map((l) => l._id);

    if (lessonIds.length > 0) {
        await Submission.deleteMany({ lesson: { $in: lessonIds } });
    }
    await Progress.deleteMany({ course: courseId });
    await Lesson.deleteMany({ course: courseId });
    await Enrollment.deleteMany({ course: courseId }); // Enrollment yozuvlarini ham o'chirish
    await Course.deleteOne({ _id: courseId });

    res.status(200).json({ message: 'Kurs va unga tegishli darslar, vazifalar, progress va ro\'yxatdan o\'tishlar muvaffaqiyatli o\'chirildi.' });
});

// FUNKSIYALARNI EKSPORT QILISH
module.exports = { 
    createCourse, 
    getTeacherCourses,
    // Nomlar Marshrut (Routes) va Controller o'rtasida moslashtirildi:
    getCourses: getAllCourses,     
    getCourseById: getSingleCourse, 
    updateCourse, 
    deleteCourse 
};