// edu-web-backend/controllers/submissionController.js
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const Submission = require('../models/submissionModel');
const Progress = require('../models/progressModel'); // Progress modelini import qilish
const Course = require('../models/courseModel'); // Kurs modelini import qilish shart
const Lesson = require('../models/lessonModel');
const Enrollment = require('../models/EnrollmentModel');
const mongoose = require('mongoose');
const { resolveUpload, sendUpload } = require('../utils/uploads');

// Tekshiruvchi uchun topshiriqlar: admin — barchasi, o'qituvchi — faqat o'z kurslari darslari bo'yicha.
// O'qituvchining kursi bo'lmasa null qaytaradi.
const findReviewerSubmissions = async (user, filter = {}) => {
    const query = { ...filter };
    if (user.role !== 'admin') {
        const courses = await Course.find({ teacher: user._id }).select('_id');
        if (courses.length === 0) return null;
        const lessons = await Lesson.find({ course: { $in: courses.map((c) => c._id) } }).select('_id');
        query.lesson = { $in: lessons.map((l) => l._id) };
    }
    return Submission.find(query)
        .populate('lesson', 'title course order')
        .populate('user', 'name email')
        .sort({ submittedAt: -1, createdAt: -1 });
};

// Dars bo'yicha tekshirish huquqi: admin — hammasi, o'qituvchi — faqat o'z kursi
const canReviewLesson = async (user, lessonId) => {
    if (user.role === 'admin') return true;
    const lesson = await Lesson.findById(lessonId).populate('course', 'teacher');
    return !!lesson?.course?.teacher && lesson.course.teacher.toString() === user._id.toString();
};

// Bitta topshiriq uchun beriladigan coinlarning yuqori chegarasi
const MAX_COINS = 1000;
// ...
// Vazifa: POST /api/submissions
// const createSubmission = asyncHandler(async (req, res) => {
//     // protect middleware'dan kelgan userId
//     const userId = req.user.id; 
//     const { lessonId, submissionText, courseId } = req.body; // Frontenddan courseId ham kelishi kerak
//     
//     if (!lessonId || !submissionText || !courseId) { // courseId ni tekshirishni qo'shdik
//         res.status(400);
//         throw new Error("Dars IDsi, kurs IDsi va topshiriq matni kiritilishi shart.");
//     }

//     // 1. Yangi topshiriqni yaratish (yoki eskini yangilash - faqat bitta topshiriq bo'lishi kerak)
//     const submission = await Submission.findOneAndUpdate(
//         { user: userId, lesson: lessonId },
//         { 
//             submissionText: submissionText,
//             status: 'submitted' 
//         },
//         { new: true, upsert: true } // Topilmasa yaratadi, topsa yangilaydi
//     );

//     // 2. 🔥 PROGRESS STATUSINI YANGILASH (yoki YARATISH) 🔥
//     const filter = { user: userId, lesson: lessonId, course: courseId };

//     const update = { 
//         status: 'submitted',
//         // Agar yangi yaratilayotgan bo'lsa ham, bu qiymatlar uzatiladi
//         $setOnInsert: { // Faqat yangi yozuv yaratilganda ishlaydigan maydonlar
//              user: userId,
//              lesson: lessonId,
//              course: courseId
//         }
//     };

//     const progress = await Progress.findOneAndUpdate(
//         filter,
//         update,
//         { 
//             new: true, 
//             upsert: true, // Agar topilmasa yaratadi
//             setDefaultsOnInsert: true // Default qiymatlarni ham ishlatish
//         }
//     );

//     // // 2. 🔥 PROGRESS STATUSINI YANGILASH 🔥
//     // // Progress modelidagi statusni 'submitted' ga o'zgartiramiz
//     // const progress = await Progress.findOneAndUpdate(
//     //     { user: userId, lesson: lessonId, course: courseId },
//     //     { 
//     //         status: 'submitted',
//     //         // Topshirish sanasini progressga saqlash ham mumkin
//     //         updatedAt: Date.now() 
//     //     },
//     //     { new: true, upsert: true }
//     // );

//     res.status(201).json({
//         success: true,
//         message: 'Vazifa muvaffaqiyatli topshirildi. O\'qituvchi tekshirishini kuting.',
//         submission: submission,
//         progress: progress
//     });
// });

// ------------------------------------------------------------
// Vazifa: POST /api/submissions
const createSubmission = asyncHandler(async (req, res) => {
// 🔥 TO'G'RILASH: req.body mavjudligini kafolatlang
    if (!req.body) {
         res.status(400);
         throw new Error("So'rovda ma'lumotlar mavjud emas (req.body undefined).");
    }

    const userId = req.user.id;

    // Matnli maydonlarni to'g'ri olish
    // req.body dan 'lessonId', 'courseId', 'submissionComment' ni oling
    const { lessonId, submissionComment } = req.body;

    // Fayl manzilini olish
    const submissionUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;

    // Xato bo'lsa, multer saqlagan keraksiz faylni o'chiramiz
    const reject = (status, message) => {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(status);
        throw new Error(message);
    };

    if (!lessonId || !submissionUrl) {
        reject(400, "Dars IDsi va fayl kiritilishi shart.");
    }
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
        reject(400, "Noto'g'ri dars ID formati.");
    }

    // Kurs IDsi mijozdan emas, darsning o'zidan olinadi
    const lesson = await Lesson.findById(lessonId).select('course order');
    if (!lesson) {
        reject(404, 'Dars topilmadi.');
    }
    if (!(await Enrollment.exists({ student: userId, course: lesson.course }))) {
        reject(403, 'Siz ushbu kursga yozilmagansiz.');
    }

    // Qulf tekshiruvi (progressController bilan bir xil): progress bo'lmasa, oldingi dars tugatilgan bo'lishi kerak
    const existingProgress = await Progress.findOne({ user: userId, lesson: lesson._id }).select('status');
    if (!existingProgress) {
        const prevLesson = await Lesson.findOne({ course: lesson.course, order: { $lt: lesson.order } })
            .sort('-order')
            .select('_id');
        if (prevLesson) {
            const prevProgress = await Progress.findOne({ user: userId, lesson: prevLesson._id }).select('status');
            if (!prevProgress || prevProgress.status !== 'completed') {
                reject(403, 'Bu dars hali qulflangan. Avval oldingi darsni yakunlang.');
            }
        }
    }
//----------------------------------
    // 1. Yangi topshiriqni yaratish/yangilash
    const submission = await Submission.findOneAndUpdate(
        { user: userId, lesson: lesson._id },
        {
            submissionUrl: submissionUrl, // 🔥 Yangi maydon
            submissionFileName: req.file.originalname, // Yuklab olishda asl nom
            submissionComment: submissionComment, // Opsional izoh
            submittedAt: new Date(), // Qayta topshirilganda ham ro'yxat tepasiga chiqadi
            status: 'submitted'
        },
        { new: true, upsert: true }
    );
    
    // 2. 🔥 PROGRESS STATUSINI YANGILASH (yoki YARATISH) 🔥
    // Tugatilgan dars qayta topshirilsa, 'completed' saqlanadi (keyingi darslar qulflanib qolmasin)
    if (existingProgress?.status !== 'completed') {
        await Progress.findOneAndUpdate(
            { user: userId, lesson: lesson._id },
            {
                status: 'submitted',
                $setOnInsert: { course: lesson.course } // Faqat yangi yozuv yaratilganda
            },
            {
                new: true,
                upsert: true, // Agar topilmasa yaratadi
                setDefaultsOnInsert: true // Default qiymatlarni ham ishlatish
            }
        );
    }

    res.status(201).json({
        success: true,
        message: 'Vazifa muvaffaqiyatli topshirildi.',
        submission: submission
    });
});



// ---------------------------------------------------------

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

    if (!(await canReviewLesson(req.user, lessonId))) {
        res.status(403);
        throw new Error("Bu dars topshiriqlarini ko'rish huquqingiz yo'q.");
    }

    const submissions = await Submission.find({ lesson: lessonId })
        .populate('user', 'name email') // Kim topshirganini bilish uchun
        .sort('-createdAt'); // Eng yangilarini birinchi ko'rsatish
        
    if (!submissions || submissions.length === 0) {
        return res.status(200).json({ submissions: [], message: 'Bu dars bo\'yicha topshiriqlar topilmadi.' });
    }

    res.status(200).json({ submissions });
});

// @desc   O'qituvchi kurslari bo'yicha BARCHA topshiriqlarni jadval uchun olish (ball, dars nomi, o'quvchi)
// @route   GET /api/submissions/teacher/all
// @access  Private (Teacher/Admin)
const getAllSubmissionsForTeacher = asyncHandler(async (req, res) => {
    const submissions = await findReviewerSubmissions(req.user);
    if (!submissions) {
        return res.status(200).json({ submissions: [], message: 'Siz hali kurs yaratmagansiz.' });
    }

    res.status(200).json({
        submissions,
        count: submissions.length
    });
});

// @desc   O'qituvchi kurslari bo'yicha barcha topshiriqlarni olish
// @route   GET /api/submissions/teacher/pending
// @access  Private (Teacher/Admin)
const getPendingSubmissionsForTeacher = asyncHandler(async (req, res) => {
    // Faqat tekshirilmagan vazifalar (admin — barcha kurslar bo'yicha)
    const submissions = await findReviewerSubmissions(req.user, { status: { $in: ['submitted', 'in_review'] } });
    if (!submissions) {
        return res.status(200).json({ submissions: [], message: 'Siz hali kurs yaratmagansiz.' });
    }

    res.status(200).json({
        submissions,
        count: submissions.length
    });
});

// @desc   Vazifani baholash va statusni o'zgartirish (Tasdiqlash/Rad etish)
// @route   PUT /api/submissions/review/:submissionId
// @access  Private (Teacher/Admin)
const handleSubmissionReview = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const { grade, coins, feedback, status } = req.body; // grade va coins qabul qilinadi

    if (!submissionId || !status || !['approved', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error("Submission ID va status ('approved' yoki 'rejected') kiritilishi shart.");
    }
    
    // 1. Submissionni topish
    const submission = await Submission.findById(submissionId);

    if (!submission) {
        res.status(404);
        throw new Error("Topshiriq yozuvi topilmadi.");
    }

    // O'qituvchi faqat o'z kursidagi topshiriqlarni baholaydi (admin — hammasini)
    if (!(await canReviewLesson(req.user, submission.lesson))) {
        res.status(403);
        throw new Error("Bu topshiriqni baholash huquqingiz yo'q.");
    }

    // 🔥 Progress uchun yangi statusni aniqlash
    let newProgressStatus;
    if (status === 'approved') {
        newProgressStatus = 'completed'; // Tasdiqlansa, keyingi dars ochiladi
    } else if (status === 'rejected') {
        newProgressStatus = 'started'; // Rad etilsa, talaba qayta topshirishi uchun 'started' holatiga qaytadi
    } else {
        res.status(400);
        throw new Error("Noto'g'ri status qiymati.");
    }

    // 2. Submissionni yangilash
    const submissionUpdate = {
        status: status, // 'approved' yoki 'rejected'
        feedback: feedback
    };

    // Faqat approved holatida grade va coins qo'shamiz
    if (status === 'approved') {
        // Grade qo'shish (0-100 orasida)
        if (grade !== undefined && grade !== null) {
            const gradeValue = Math.max(0, Math.min(100, parseInt(grade) || 0));
            submissionUpdate.grade = gradeValue;
        }
        
        // Coins: submission.coins — shu topshiriq uchun o'quvchiga allaqachon berilgan coinlar.
        // Qayta tasdiqlashda faqat farq qo'shiladi (coinlar ikki marta berilmaydi).
        if (coins !== undefined && coins !== null) {
            submissionUpdate.coins = Math.min(MAX_COINS, Math.max(0, parseInt(coins) || 0));
        }
    }

    const prevCoins = submission.coins || 0;
    // Atomik yangilash: parallel so'rovlar bir xil coinlarni ikki marta bermasligi uchun
    // (eski hujjatlarda coins maydoni umuman bo'lmasligi mumkin — null shu holatni ham qamraydi)
    const updatedSubmission = await Submission.findOneAndUpdate(
        { _id: submissionId, coins: prevCoins === 0 ? { $in: [0, null] } : prevCoins },
        submissionUpdate,
        { new: true }
    );
    if (!updatedSubmission) {
        res.status(409);
        throw new Error("Topshiriq hozirgina boshqa so'rov bilan yangilandi. Sahifani yangilab, qayta urinib ko'ring.");
    }

    // 3. User coins'ini yangilash (faqat farq)
    const coinDelta = (updatedSubmission.coins || 0) - prevCoins;
    if (coinDelta !== 0) {
        const User = require('../models/userModel');
        await User.updateOne({ _id: submission.user }, { $inc: { coins: coinDelta } });
    }

    // 4. PROGRESS STATUSINI YANGILASH
    const progress = await Progress.findOneAndUpdate(
        { user: submission.user, lesson: submission.lesson }, 
        { 
            status: newProgressStatus, // 🔥 'completed' yoki 'started' ga o'rnatiladi
            reviewedBy: req.user.id 
        },
        { new: true } 
    );
    
    const message = status === 'approved' 
        ? `Vazifa muvaffaqiyatli tasdiqlandi. Ball: ${updatedSubmission.grade ?? 0}/100, Coins: ${updatedSubmission.coins || 0}. Talaba keyingi darsga o'tdi.`
        : 'Vazifa rad etildi. Talaba qayta topshirishi mumkin.';

    res.status(200).json({
        message: message,
        submission: updatedSubmission,
        progress: progress
    });
});

// @desc    Student barcha submission'larini olish (vazifalar jadvali uchun)
// @route   GET /api/submissions/my
// @access  Private (Student)
const getAllMySubmissions = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const submissions = await Submission.find({ user: userId })
        .populate('lesson', 'title course order')
        .populate('user', 'name email')
        .sort('-createdAt');

    res.status(200).json({
        submissions,
        count: submissions.length
    });
});

// @desc    Student o'z submission'ini olish (bitta lesson uchun)
// @route   GET /api/submissions/my/:lessonId
// @access  Private (Student)
const getMySubmission = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const userId = req.user.id;

    // Eng yangi submission'ni topish
    const submissions = await Submission.find({ 
        user: userId, 
        lesson: lessonId 
    })
    .populate('lesson', 'title order')
    .sort({ createdAt: -1 }) // Eng yangi submission
    .limit(1);

    const submission = submissions.length > 0 ? submissions[0] : null;

    if (!submission) {
        return res.status(200).json({ 
            submission: null,
            message: 'Bu dars uchun topshirish topilmadi.' 
        });
    }

    res.status(200).json({ 
        submission: submission
    });
});

// @desc    Vazifa faylini yuklab olish (ZIP va boshqa formatlar — token bilan, brauzerda ko'rish uchun)
// @route   GET /api/submissions/file/:submissionId
// @access  Private (Admin — hammasi, Teacher — o'z kursi, Student — o'z topshirig'i)
const getSubmissionFile = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const submission = await Submission.findById(submissionId)
        .populate({ path: 'lesson', select: 'course', populate: { path: 'course', select: 'teacher' } });
    if (!submission || !submission.submissionUrl) {
        res.status(404);
        throw new Error('Topshiriq yoki fayl topilmadi.');
    }

    const { role } = req.user;
    const userId = req.user._id.toString();
    const courseTeacher = submission.lesson?.course?.teacher?.toString();
    const allowed =
        role === 'admin' ||
        (role === 'teacher' && courseTeacher === userId) ||
        (role === 'student' && submission.user.toString() === userId);
    if (!allowed) {
        res.status(403);
        throw new Error('Ushbu faylni yuklab olish huquqingiz yo\'q.');
    }

    const filePath = resolveUpload('submissions', submission.submissionUrl);
    if (!filePath) {
        res.status(404);
        throw new Error('Fayl serverda topilmadi (server qayta ishga tushganda o\'chib ketgan bo\'lishi mumkin). O\'quvchidan qayta yuklashni so\'rang.');
    }
    sendUpload(res, filePath, submission.submissionFileName || path.basename(filePath));
});

module.exports = {
    createSubmission,
    approveSubmission: handleSubmissionReview,
    handleSubmissionReview,
    getSubmissionsByLesson,
    getPendingSubmissionsForTeacher,
    getAllSubmissionsForTeacher,
    getAllMySubmissions,
    getMySubmission,
    getSubmissionFile
};