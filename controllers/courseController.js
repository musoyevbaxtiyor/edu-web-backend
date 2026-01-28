const asyncHandler = require('express-async-handler');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const Lesson = require('../models/lessonModel');
const Submission = require('../models/submissionModel');
const Progress = require('../models/progressModel');
const mongoose = require('mongoose');

// @desc    Yangi kurs yaratish
// @route   POST /api/courses
// @access  Private (Admin/Teacher)
const createCourse = asyncHandler(async (req, res) => { // <<< asyncHandler bilan o'raldi
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
        res.status(400);
        throw new Error('Iltimos, barcha kurs maydonlarini to\'ldiring.'); // <<< Xato tashlash
    }

    // Kursni yaratish
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
    // try/catch olib tashlandi. Xatolik (masalan, 11000 duplicate key error) errorMiddleware orqali boshqariladi.
});


// @desc    Barcha kurslarni olish (Hamma uchun ochiq, ammo token talab)
// @route   GET /api/courses
// @access  Private (Talaba, O'qituvchi, Admin)
const getAllCourses = asyncHandler(async (req, res) => { // <<< asyncHandler bilan o'raldi
    // Barcha kurslarni o'qituvchi ma'lumotlari bilan birga yuklash
    const courses = await Course.find({}).populate('teacher', 'name email role'); 

    res.status(200).json({ 
        count: courses.length,
        courses 
    });
});


const getTeacherCourses = async (req, res) => {
    try {
        // req.user.id 'protect' middleware tomonidan qo'shilgan.
        const courses = await Course.find({ teacher: req.user.id })
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
    const course = await Course.findById(id).populate('teacher', 'name email');

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
    
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    
    res.status(200).json({ 
        message: 'Kurs muvaffaqiyatli yangilandi', 
        getMyCreatedCourses, // <<< YANGI FUNKSIYANI EKSPORT QILAMIZ
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

    // O'chirilgan kursga tegishli darslar, vazifalar va progresslarni ham o'chirish
    const lessons = await Lesson.find({ course: courseId }).select('_id');
    const lessonIds = lessons.map((l) => l._id);

    if (lessonIds.length > 0) {
        await Submission.deleteMany({ lesson: { $in: lessonIds } });
    }
    await Progress.deleteMany({ course: courseId });
    await Lesson.deleteMany({ course: courseId });
    await Course.deleteOne({ _id: courseId });

    res.status(200).json({ message: 'Kurs va unga tegishli darslar, vazifalar va progresslar muvaffaqiyatli o\'chirildi.' });
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