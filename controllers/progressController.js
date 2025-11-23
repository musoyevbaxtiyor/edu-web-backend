const asyncHandler = require('express-async-handler');
const Progress = require('../models/progressModel'); // Progress Modelini import qilamiz

/**
 * @desc    Yangi progress yozuvini yaratish yoki mavjudini started ga o'tkazish
 * @route   POST /api/progress
 * @access  Private (Talaba)
 */
const startLessonProgress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lessonId, courseId } = req.body;

    if (!lessonId || !courseId) {
        res.status(400);
        throw new Error("Dars (lessonId) va Kurs (courseId) IDlari kiritilishi shart.");
    }

    // Progressni topish va yangilash (yoki yangisini yaratish)
    const progress = await Progress.findOneAndUpdate(
        { user: userId, lesson: lessonId },
        { 
            course: courseId, // Agar yangi yozuv yaratilsa, kurs IDsi qo'shiladi
            status: 'started', // Statusni 'started' ga o'tkazish
            // submission: '', // Agar oldin submission bo'lsa uni tozalash mantiqi bo'lishi mumkin
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