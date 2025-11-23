// edu-web-backend/controllers/submissionController.js
const asyncHandler = require('express-async-handler');
const Submission = require('../models/submissionModel');
const Progress = require('../models/progressModel'); // Progress modelini import qilish
const Course = require('../models/courseModel'); // Kurs modelini import qilish shart
// ...
// Vazifa: POST /api/submissions
const createSubmission = asyncHandler(async (req, res) => {
    // protect middleware'dan kelgan userId
    const userId = req.user.id; 
    const { lessonId, submissionText, courseId } = req.body; // Frontenddan courseId ham kelishi kerak
    
    if (!lessonId || !submissionText || !courseId) { // courseId ni tekshirishni qo'shdik
        res.status(400);
        throw new Error("Dars IDsi, kurs IDsi va topshiriq matni kiritilishi shart.");
    }

    // 1. Yangi topshiriqni yaratish (yoki eskini yangilash - faqat bitta topshiriq bo'lishi kerak)
    const submission = await Submission.findOneAndUpdate(
        { user: userId, lesson: lessonId },
        { 
            submissionText: submissionText,
            status: 'submitted' 
        },
        { new: true, upsert: true } // Topilmasa yaratadi, topsa yangilaydi
    );

    // 2. 🔥 PROGRESS STATUSINI YANGILASH (yoki YARATISH) 🔥
    const filter = { user: userId, lesson: lessonId, course: courseId };

    const update = { 
        status: 'submitted',
        // Agar yangi yaratilayotgan bo'lsa ham, bu qiymatlar uzatiladi
        $setOnInsert: { // Faqat yangi yozuv yaratilganda ishlaydigan maydonlar
             user: userId,
             lesson: lessonId,
             course: courseId
        }
    };

    const progress = await Progress.findOneAndUpdate(
        filter,
        update,
        { 
            new: true, 
            upsert: true, // Agar topilmasa yaratadi
            setDefaultsOnInsert: true // Default qiymatlarni ham ishlatish
        }
    );

    // // 2. 🔥 PROGRESS STATUSINI YANGILASH 🔥
    // // Progress modelidagi statusni 'submitted' ga o'zgartiramiz
    // const progress = await Progress.findOneAndUpdate(
    //     { user: userId, lesson: lessonId, course: courseId },
    //     { 
    //         status: 'submitted',
    //         // Topshirish sanasini progressga saqlash ham mumkin
    //         updatedAt: Date.now() 
    //     },
    //     { new: true, upsert: true }
    // );

    res.status(201).json({
        success: true,
        message: 'Vazifa muvaffaqiyatli topshirildi. O\'qituvchi tekshirishini kuting.',
        submission: submission,
        progress: progress
    });
});

// @desc   Vazifani tasdiqlash va baholash (O'qituvchi)
// @route   PUT /api/submissions/approve/:submissionId
// @access  Private (Teacher/Admin)
const approveSubmission = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const { grade, feedback, courseId } = req.body; // courseId ni tekshirish uchun qabul qilish foydali

    if (!submissionId) {
        res.status(400);
        throw new Error("Tasdiqlash uchun Submission IDsi kerak.");
    }
    
    // 1. Submissionni topish
    const submission = await Submission.findById(submissionId);

    if (!submission) {
        res.status(404);
        throw new Error("Topshiriq yozuvi topilmadi.");
    }
    
    // 2. Submissionni yangilash
    const approvedSubmission = await Submission.findByIdAndUpdate(submissionId, {
        status: 'approved',
        grade: grade || submission.grade, 
        feedback: feedback || submission.feedback
    }, { new: true });

    // 3. 🔥 PROGRESS STATUSINI YAKUNLASH ('completed' ga o'tkazish) 🔥
    // Bu keyingi darsni ochish uchun asosiy qadam
    const progress = await Progress.findOneAndUpdate(
        { user: submission.user, lesson: submission.lesson }, // Submissiondan user va lesson IDlarini olamiz
        { 
            status: 'completed',
            reviewedBy: req.user.id // Tasdiqlagan o'qituvchi IDsi
        },
        { new: true } 
    );
    
    // Agar progress topilmasa (bu kamdan-kam bo'ladi, lekin ehtiyot shart)
    if (!progress) {
        console.error(`Xato: Submission uchun Progress topilmadi. Submission ID: ${submissionId}`);
    }

    res.status(200).json({
        message: 'Vazifa muvaffaqiyatli tasdiqlandi va baholandi. Talaba keyingi darsga o\'tdi.',
        submission: approvedSubmission,
        progress: progress
    });
});


// @desc   Darsdagi barcha topshiriqlarni olish (O'qituvchi)
// @route   GET /api/submissions/:lessonId
// @access  Private (Teacher/Admin)
const getSubmissionsByLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    
    const submissions = await Submission.find({ lesson: lessonId })
        .populate('user', 'name email') // Kim topshirganini bilish uchun
        .sort('-createdAt'); // Eng yangilarini birinchi ko'rsatish
        
    if (!submissions) {
        return res.status(200).json({ submissions: [], message: 'Bu dars bo\'yicha topshiriqlar topilmadi.' });
    }

    res.status(200).json({ submissions });
});

// @desc   O'qituvchi kurslari bo'yicha barcha topshiriqlarni olish
// @route   GET /api/submissions/teacher/pending
// @access  Private (Teacher/Admin)
const getPendingSubmissionsForTeacher = asyncHandler(async (req, res) => {
    const teacherId = req.user.id;
    
    // 1. O'qituvchining barcha kurslarini topish
    const courses = await Course.find({ teacher: teacherId }).select('_id');
    
    if (courses.length === 0) {
        return res.status(200).json({ submissions: [], message: 'Siz hali kurs yaratmagansiz.' });
    }

    const courseIds = courses.map(course => course._id);

    // 2. Ushbu kurslar bo'yicha "submitted" statusdagi barcha topshiriqlarni topish
    const pendingSubmissions = await Submission.find({
        status: { $in: ['submitted', 'in_review'] } // Faqat tekshirilmagan vazifalar
    })
    .populate({
        path: 'lesson',
        select: 'title course order', // Dars nomini, kurs IDsi va tartib raqamini olamiz
        match: { course: { $in: courseIds } } // Faqat o'qituvchining kurslaridagi darslarni topish
    })
    .populate('user', 'name email') // Talaba ma'lumotlarini olish
    .sort('-createdAt'); // Eng yangi topshiriqlar birinchi kelsin

    // Faqat tegishli kurslarga oid bo'lgan submissionlarni filtrlaymiz (populate.match tufayli)
    const filteredSubmissions = pendingSubmissions.filter(sub => sub.lesson !== null);

    res.status(200).json({ 
        submissions: filteredSubmissions,
        count: filteredSubmissions.length 
    });
});

module.exports = {
    createSubmission,
    approveSubmission, // 🔥 YANGI FUNKSIYANI EKSPORT QILAMIZ
    getSubmissionsByLesson, // 🔥 YANGI FUNKSIYANI EKSPORT QILAMIZ
    getPendingSubmissionsForTeacher // 🔥 EKSPORT QILAMIZ
};