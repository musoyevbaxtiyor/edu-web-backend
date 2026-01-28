// edu-web-backend/controllers/submissionController.js
const asyncHandler = require('express-async-handler');
const Submission = require('../models/submissionModel');
const Progress = require('../models/progressModel'); // Progress modelini import qilish
const Course = require('../models/courseModel'); // Kurs modelini import qilish shart
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

    console.log("Fayl:", req.file);
    console.log("Body:", req.body);



    // const userId = req.user.id; 
    
// 🔥 TO'G'RILASH: req.body mavjudligini kafolatlang
    if (!req.body) {
         res.status(400);
         throw new Error("So'rovda ma'lumotlar mavjud emas (req.body undefined).");
    }

    const userId = req.user.id; 
    
    // Matnli maydonlarni to'g'ri olish
    // req.body dan 'lessonId', 'courseId', 'submissionComment' ni oling
    const { lessonId, courseId, submissionComment } = req.body; // 🔥 Xato bo'lgan qator

    // Fayl manzilini olish
    const submissionUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;
    
    if (!lessonId || !courseId || !submissionUrl) {
        // Multer faylni yuklagan bo'lsa ham, keyingi tekshiruv 400 qaytaradi
        res.status(400);
        throw new Error("Dars IDsi, Kurs IDsi va fayl kiritilishi shart.");
    }
//----------------------------------
    // 1. Yangi topshiriqni yaratish/yangilash
    const submission = await Submission.findOneAndUpdate(
        { user: userId, lesson: lessonId },
        { 
            submissionUrl: submissionUrl, // 🔥 Yangi maydon
            submissionComment: submissionComment, // Opsional izoh
            status: 'submitted' 
        },
        { new: true, upsert: true }
    );
    
    // 2. PROGRESS STATUSINI YANGILASH (oldingidek qoladi)
    // ...
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
    const teacherId = req.user.id;

    const courses = await Course.find({ teacher: teacherId }).select('_id');
    if (courses.length === 0) {
        return res.status(200).json({ submissions: [], message: 'Siz hali kurs yaratmagansiz.' });
    }

    const courseIds = courses.map(course => course._id);

    const allSubmissions = await Submission.find({})
        .populate({
            path: 'lesson',
            select: 'title course order',
            match: { course: { $in: courseIds } }
        })
        .populate('user', 'name email')
        .sort('-createdAt');

    const filteredSubmissions = allSubmissions.filter(sub => sub.lesson !== null);

    res.status(200).json({
        submissions: filteredSubmissions,
        count: filteredSubmissions.length
    });
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
        
        // Coins qo'shish
        if (coins !== undefined && coins !== null) {
            submissionUpdate.coins = Math.max(0, parseInt(coins) || 0);
            
            // 3. User coins'ini yangilash (faqat approved holatida)
            const User = require('../models/userModel');
            
            // Avval user'ni topib, coins maydoni borligini tekshiramiz
            const user = await User.findById(submission.user).select('coins');
            
            if (user) {
                // Agar coins maydoni yo'q yoki null bo'lsa, uni 0 ga o'rnatamiz
                if (user.coins === undefined || user.coins === null) {
                    await User.findByIdAndUpdate(submission.user, {
                        $set: { coins: 0 }
                    });
                }
                
                // Endi coins qo'shamiz
                await User.findByIdAndUpdate(submission.user, {
                    $inc: { coins: submissionUpdate.coins }
                });
            }
        }
    }

    const updatedSubmission = await Submission.findByIdAndUpdate(submissionId, submissionUpdate, { new: true });

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
        ? `Vazifa muvaffaqiyatli tasdiqlandi. Ball: ${grade || 0}/100, Coins: ${coins || 0}. Talaba keyingi darsga o'tdi.`
        : 'Vazifa rad etildi. Talaba qayta topshirishi mumkin.';

    res.status(200).json({
        message: message,
        submission: updatedSubmission,
        progress: progress
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

module.exports = {
    createSubmission,
    approveSubmission: handleSubmissionReview, // Eski funksiya nomini yangisiga almashtirdik (Agar eskisi ishlatilmasa uni o'chirish kerak)
    handleSubmissionReview, // 🔥 YANGI FUNKSIYANI EKSPORT QILAMIZ
    getSubmissionsByLesson,
    getPendingSubmissionsForTeacher,
    getAllSubmissionsForTeacher,
    getMySubmission
};