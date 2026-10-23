const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Progress = require('../models/progressModel'); // Progress Modelini import qilamiz
const Lesson = require('../models/lessonModel');
const Enrollment = require('../models/EnrollmentModel');

// Dars "tugatilgan" hisoblanadigan statuslar (lessonController dagi qulf mantiqi bilan bir xil)
const DONE_STATUSES = ['completed', 'approved'];

/**
 * @desc    Yangi progress yozuvini yaratish yoki mavjudini started ga o'tkazish
 * @route   POST /api/progress
 * @access  Private (Talaba)
 */
const startLessonProgress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lessonId, courseId } = req.body || {};

    if (!lessonId || !courseId) {
        res.status(400);
        throw new Error("Dars (lessonId) va Kurs (courseId) IDlari kiritilishi shart.");
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400);
        throw new Error('Noto\'g\'ri dars yoki kurs ID formati.');
    }

    // Progress faqat talabalar uchun yuritiladi
    if (req.user.role !== 'student') {
        res.status(403);
        throw new Error('Dars progressi faqat talabalar uchun yuritiladi.');
    }

    // Kurs IDsi mijozdan emas, darsning o'zidan olinadi
    const lesson = await Lesson.findById(lessonId).select('course order');
    if (!lesson) {
        res.status(404);
        throw new Error('Dars topilmadi.');
    }
    if (lesson.course.toString() !== String(courseId)) {
        res.status(400);
        throw new Error('Bu dars ko\'rsatilgan kursga tegishli emas.');
    }

    // Talaba kursga yozilgan bo'lishi shart
    const enrolled = await Enrollment.exists({ student: userId, course: lesson.course });
    if (!enrolled) {
        res.status(403);
        throw new Error('Siz ushbu kursga yozilmagansiz. Iltimos, avval kursga yoziling.');
    }

    // Mavjud progress hech qachon pasaytirilmaydi (submitted/completed saqlanadi)
    let progress = await Progress.findOne({ user: userId, lesson: lesson._id });
    if (progress) {
        if (progress.status === 'unlocked') {
            await Progress.updateOne({ _id: progress._id, status: 'unlocked' }, { status: 'started' });
            progress.status = 'started';
        }
        return res.status(200).json({
            success: true,
            message: 'Dars muvaffaqiyatli boshlandi.',
            progress: progress
        });
    }

    // Qulf tekshiruvi: birinchi dars yoki oldingi dars (order bo'yicha) tugatilgan bo'lishi kerak
    const prevLesson = await Lesson.findOne({ course: lesson.course, order: { $lt: lesson.order } })
        .sort('-order')
        .select('_id');
    if (prevLesson) {
        const prevProgress = await Progress.findOne({ user: userId, lesson: prevLesson._id }).select('status');
        if (!prevProgress || !DONE_STATUSES.includes(prevProgress.status)) {
            res.status(403);
            throw new Error('Bu dars hali qulflangan. Avval oldingi darsni yakunlang.');
        }
    }

    // Yangi yozuv yaratish ($setOnInsert: parallel so'rovda ham mavjud status o'zgarmaydi)
    progress = await Progress.findOneAndUpdate(
        { user: userId, lesson: lesson._id },
        {
            $setOnInsert: {
                course: lesson.course,
                status: 'started',
            },
        },
        {
            new: true, // Yangilangan hujjatni qaytarish
            upsert: true, // Agar yozuv mavjud bo'lmasa, yangisini yaratish
            setDefaultsOnInsert: true // Yangi yozuv yaratilganda default qiymatlarni ishlatish
        }
    );

    res.status(200).json({
        success: true,
        message: 'Dars muvaffaqiyatli boshlandi.',
        progress: progress
    });
});


// Foydalanuvchi barcha darslarni ko'rib bo'lganini belgilash (Masalan, video dars yakunlanganda)
// Bu funksiya keyinchalik kerak bo'ladi, hozir uni shunchaki ta'riflaymiz
const markLessonCompleted = asyncHandler(async (req, res) => {
    // ... complete mantiqi
    res.status(501).json({ message: 'Mark completed funksiyasi hali amalga oshirilmagan.' });
});


module.exports = {
    startLessonProgress,
    markLessonCompleted,
};