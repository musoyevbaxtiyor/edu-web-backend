const User = require('../models/userModel');
const Enrollment = require('../models/EnrollmentModel');
const Progress = require('../models/progressModel');
const Lesson = require('../models/lessonModel');
const Submission = require('../models/submissionModel');
const TestResult = require('../models/testResultModel');
const ExamResult = require('../models/examResultModel');
const PracticeSubmission = require('../models/practiceSubmissionModel');
const PracticeTask = require('../models/practiceTaskModel');
const Course = require('../models/courseModel');
const asyncHandler = require('express-async-handler');

/* ============================================================
   Reyting ballarini hisoblash (bitta o'quvchi uchun)
   Umumiy ball = kurs vazifalari + testlar + amaliy tasklar + imtihonlar
   - Kurs vazifasi: har dars uchun eng yuqori tasdiqlangan baho (0-100)
   - Test: to'g'ri javoblar score yig'indisi
   - Amaliy task: har task uchun eng yuqori tasdiqlangan baho (0-100)
   - Imtihon: har imtihon uchun eng yaxshi natija foizi (100% = 100 ball)
   ============================================================ */
async function computeScores(studentId) {
    // A) Kurs vazifalari — har dars uchun maksimal baho
    const submissions = await Submission.find({ user: studentId, status: 'approved' }).select('grade lesson');
    const lessonScores = new Map();
    submissions.forEach((sub) => {
        if (sub.grade !== undefined && sub.grade !== null && sub.lesson) {
            const key = sub.lesson.toString();
            if ((lessonScores.get(key) || 0) < sub.grade) lessonScores.set(key, sub.grade);
        }
    });
    const submissionScore = Array.from(lessonScores.values()).reduce((sum, g) => sum + (g || 0), 0);

    // B) Testlar
    const testResults = await TestResult.find({ student: studentId, isCorrect: true }).select('score');
    const testScore = testResults.reduce((sum, r) => sum + (r.score || 0), 0);

    // C) Amaliy tasklar — har task uchun maksimal baho
    const practiceSubs = await PracticeSubmission.find({ student: studentId, status: 'approved' }).select('grade task');
    const taskScores = new Map();
    practiceSubs.forEach((s) => {
        if (s.grade !== undefined && s.grade !== null && s.task) {
            const key = s.task.toString();
            if ((taskScores.get(key) || 0) < s.grade) taskScores.set(key, s.grade);
        }
    });
    const practiceScore = Array.from(taskScores.values()).reduce((sum, g) => sum + (g || 0), 0);

    // D) Imtihonlar — har imtihon uchun eng yaxshi foiz (100% = 100 ball)
    const examResults = await ExamResult.find({ student: studentId }).select('scorePercent exam');
    const examBest = new Map();
    examResults.forEach((r) => {
        if (r.exam) {
            const key = r.exam.toString();
            if ((examBest.get(key) || 0) < (r.scorePercent || 0)) examBest.set(key, r.scorePercent || 0);
        }
    });
    const examScore = Array.from(examBest.values()).reduce((sum, g) => sum + (g || 0), 0);

    const totalScore = submissionScore + testScore + practiceScore + examScore;

    return { submissionScore, testScore, practiceScore, examScore, totalScore };
}

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

// @desc    Foydalanuvchi statistikalarini olish
// @route   GET /api/users/statistics
// @access  Private
const getUserStatistics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Faqat studentlar uchun statistika
    if (userRole !== 'student') {
        const user = await User.findById(userId).select('coins');
        const coins = user?.coins || 0;
        return res.status(200).json({
            courses: 0,
            completed: 0,
            progress: 0,
            certificates: 0,
            coins: coins
        });
    }

    try {
        // 1. Ro'yxatdan o'tgan kurslar
        const enrollments = await Enrollment.find({ student: userId })
            .populate('course', '_id title');

        const totalCourses = enrollments.length;
        
        // 2. Tugallangan kurslar (completionStatus === 'Completed')
        const completedCourses = enrollments.filter(
            e => e.completionStatus === 'Completed'
        ).length;

        // 3. Umumiy progress hisoblash
        let totalProgress = 0;
        let coursesWithProgress = 0;

        for (const enrollment of enrollments) {
            const courseId = enrollment.course._id;
            
            // Kursdagi jami darslar soni
            const totalLessons = await Lesson.countDocuments({ course: courseId });
            
            if (totalLessons > 0) {
                // Talabaning bu kursdagi tugallangan darslar soni
                const completedLessons = await Progress.countDocuments({
                    user: userId,
                    course: courseId,
                    status: 'completed'
                });
                
                const courseProgress = (completedLessons / totalLessons) * 100;
                totalProgress += courseProgress;
                coursesWithProgress++;
            }
        }

        // O'rtacha progress
        const averageProgress = coursesWithProgress > 0 
            ? Math.round(totalProgress / coursesWithProgress) 
            : 0;

        // 4. Sertifikatlar (tugallangan kurslar = sertifikatlar)
        const certificates = completedCourses;

        // 5. User coins'ini olish
        const user = await User.findById(userId).select('coins');
        const coins = user?.coins || 0;

        res.status(200).json({
            courses: totalCourses,
            completed: completedCourses,
            progress: averageProgress,
            certificates: certificates,
            coins: coins
        });

    } catch (error) {
        console.error('Statistika yuklashda xato:', error);
        res.status(500).json({
            message: 'Statistika yuklashda xato yuz berdi.',
            courses: 0,
            completed: 0,
            progress: 0,
            certificates: 0,
            coins: 0
        });
    }
});

// @desc    Barcha studentlar reytingini olish
// @route   GET /api/users/ratings
// @access  Private (Hamma ko'ra oladi)
const getStudentsRatings = asyncHandler(async (req, res) => {
    // 1. Barcha studentlarni olish
    const students = await User.find({ role: 'student' })
        .select('_id name email avatar')
        .sort({ name: 1 });

    if (!students || students.length === 0) {
        return res.status(200).json({
            success: true,
            count: 0,
            ratings: []
        });
    }

    // 2. Har bir student uchun ballarni hisoblash
    const ratings = await Promise.all(
        students.map(async (student) => {
            const studentId = student._id;

            // Umumiy ballarni hisoblash (vazifa + test + amaliy + imtihon)
            const scores = await computeScores(studentId);

            // Qo'shimcha ma'lumotlar
            const completedLessons = await Progress.countDocuments({
                user: studentId,
                status: 'completed'
            });

            const totalTests = await TestResult.countDocuments({
                student: studentId
            });

            const correctTests = await TestResult.countDocuments({
                student: studentId,
                isCorrect: true
            });

            return {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    avatar: student.avatar
                },
                submissionScore: scores.submissionScore,
                testScore: scores.testScore,
                practiceScore: scores.practiceScore,
                examScore: scores.examScore,
                totalScore: scores.totalScore,
                completedLessons: completedLessons,
                totalTests: totalTests,
                correctTests: correctTests,
                testAccuracy: totalTests > 0 ? Math.round((correctTests / totalTests) * 100) : 0
            };
        })
    );

    // 3. Umumiy ball bo'yicha saralash (eng yuqoridan pastga)
    ratings.sort((a, b) => b.totalScore - a.totalScore);

    // 4. Reyting o'rni qo'shish
    ratings.forEach((rating, index) => {
        rating.rank = index + 1;
    });

    res.status(200).json({
        success: true,
        count: ratings.length,
        ratings: ratings
    });
});

// @desc    Xabarlarni olish (O'quvchi va O'qituvchi uchun)
// @route   GET /api/users/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    let notifications = [];

    if (userRole === 'student') {
        // O'quvchi uchun: tasdiqlangan/rejected submissions
        const submissions = await Submission.find({
            user: userId,
            status: { $in: ['approved', 'rejected'] }
        })
        .populate({
            path: 'lesson',
            select: 'title course',
            populate: {
                path: 'course',
                select: 'title _id'
            }
        })
        .sort({ updatedAt: -1 })
        .limit(50);

        notifications = submissions.map(sub => ({
            id: sub._id,
            type: 'submission',
            status: sub.status,
            title: sub.status === 'approved' 
                ? `Vazifa tasdiqlandi` 
                : `Vazifa rad etildi`,
            message: sub.status === 'approved'
                ? `"${sub.lesson?.title || 'Dars'}" darsidagi vazifangiz tasdiqlandi. ${sub.coins || 0} coin olgansiz.`
                : `"${sub.lesson?.title || 'Dars'}" darsidagi vazifangiz rad etildi. ${sub.feedback || 'Izoh kiritilmagan.'}`,
            course: sub.lesson?.course?.title || 'Noma\'lum kurs',
            lessonId: sub.lesson?._id,
            coins: sub.coins || 0,
            feedback: sub.feedback,
            date: sub.updatedAt
        }));

        // Amaliy tasklar bo'yicha (tasdiqlangan/rad etilgan)
        const practiceSubs = await PracticeSubmission.find({
            student: userId,
            status: { $in: ['approved', 'rejected'] }
        })
        .populate('task', 'title category level')
        .sort({ updatedAt: -1 })
        .limit(50);

        const practiceNotifs = practiceSubs
            .filter((s) => s.task)
            .map((s) => ({
                id: s._id,
                type: 'practice',
                status: s.status,
                title: s.status === 'approved' ? 'Amaliy task tasdiqlandi' : 'Amaliy task rad etildi',
                message: s.status === 'approved'
                    ? `"${s.task?.title || 'Task'}" amaliy taskingiz tasdiqlandi. Ball: ${s.grade ?? 0}/100.`
                    : `"${s.task?.title || 'Task'}" amaliy taskingiz rad etildi. ${s.feedback || 'Izoh kiritilmagan.'}`,
                course: 'Amaliy tasklar',
                grade: s.grade ?? 0,
                feedback: s.feedback,
                date: s.updatedAt,
            }));

        notifications = [...notifications, ...practiceNotifs]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50);

    } else if (userRole === 'teacher' || userRole === 'admin') {
        // O'qituvchi uchun: yangi topshirilgan submissions
        // O'qituvchining kurslarini topish
        const courses = await Course.find({ teacher: userId }).select('_id');
        const courseIds = courses.map(c => c._id);

        if (courseIds.length > 0) {
            const submissions = await Submission.find({
                status: { $in: ['submitted', 'in_review'] }
            })
            .populate({
                path: 'lesson',
                select: 'title course',
                match: { course: { $in: courseIds } },
                populate: {
                    path: 'course',
                    select: 'title'
                }
            })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

            notifications = submissions
                .filter(sub => sub.lesson !== null)
                .map(sub => ({
                    id: sub._id,
                    type: 'submission',
                    status: sub.status,
                    title: `Yangi vazifa topshirildi`,
                    message: `${sub.user?.name || 'Talaba'} "${sub.lesson?.title || 'Dars'}" darsiga vazifa topshirdi.`,
                    course: sub.lesson?.course?.title || 'Noma\'lum kurs',
                    courseId: sub.lesson?.course?._id || null,
                    studentName: sub.user?.name || 'Noma\'lum',
                    lessonId: sub.lesson?._id,
                    date: sub.createdAt
                }));
        }

        // Amaliy tasklar bo'yicha yangi topshiriqlar (o'qituvchi qo'shgan tasklar; admin — barchasi)
        const taskFilter = {};
        if (userRole === 'teacher') taskFilter.createdBy = userId;
        const myTasks = await PracticeTask.find(taskFilter).select('_id').lean();
        const myTaskIds = myTasks.map((t) => t._id);

        if (myTaskIds.length > 0) {
            const practiceSubs = await PracticeSubmission.find({
                task: { $in: myTaskIds },
                status: { $in: ['submitted', 'in_review'] }
            })
            .populate('task', 'title category level')
            .populate('student', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

            const practiceNotifs = practiceSubs
                .filter((s) => s.task)
                .map((s) => ({
                    id: s._id,
                    type: 'practice',
                    status: s.status,
                    title: 'Yangi amaliy task topshirildi',
                    message: `${s.student?.name || 'Talaba'} "${s.task?.title || 'Task'}" amaliy taskini topshirdi.`,
                    course: 'Amaliy tasklar',
                    studentName: s.student?.name || 'Noma\'lum',
                    date: s.createdAt,
                }));

            notifications = [...notifications, ...practiceNotifs]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 50);
        }
    }

    res.status(200).json({
        success: true,
        count: notifications.length,
        notifications: notifications
    });
});

// @desc    O'quvchi uchun o'z ballarini olish
// @route   GET /api/users/my-scores
// @access  Private (Student)
const getMyScores = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole !== 'student') {
        return res.status(200).json({
            submissionScore: 0,
            testScore: 0,
            practiceScore: 0,
            examScore: 0,
            totalScore: 0,
            completedLessons: 0,
            totalTests: 0,
            correctTests: 0,
            testAccuracy: 0,
            rank: null
        });
    }

    // A-D) Umumiy ballar (vazifa + test + amaliy task + imtihon)
    const scores = await computeScores(userId);

    // Qo'shimcha statistika
    const completedLessons = await Progress.countDocuments({ user: userId, status: 'completed' });
    const totalTests = await TestResult.countDocuments({ student: userId });
    const correctTests = await TestResult.countDocuments({ student: userId, isCorrect: true });
    const testAccuracy = totalTests > 0 ? Math.round((correctTests / totalTests) * 100) : 0;

    // E) Reyting o'rni (barcha o'quvchilar orasida)
    const allStudents = await User.find({ role: 'student' }).select('_id');
    const allRatings = await Promise.all(
        allStudents.map(async (student) => (await computeScores(student._id)).totalScore)
    );
    allRatings.sort((a, b) => b - a);
    const rank = allRatings.findIndex((score) => score <= scores.totalScore) + 1;

    res.status(200).json({
        submissionScore: scores.submissionScore,
        testScore: scores.testScore,
        practiceScore: scores.practiceScore,
        examScore: scores.examScore,
        totalScore: scores.totalScore,
        completedLessons: completedLessons,
        totalTests: totalTests,
        correctTests: correctTests,
        testAccuracy: testAccuracy,
        rank: rank || allRatings.length
    });
});

// @desc    Barcha foydalanuvchilarni olish (faqat admin)
// @route   GET /api/users/admin/all
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select('-password')
        .sort('-createdAt')
        .lean();

    res.status(200).json({
        users,
        count: users.length
    });
});

// @desc    Admin foydalanuvchi parolini o'zgartirish
// @route   PUT /api/users/admin/:userId/password
// @access  Private (Admin)
const updateUserPasswordByAdmin = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        res.status(400);
        throw new Error('Yangi parol kamida 6 belgidan iborat bo\'lishi kerak.');
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi.');
    }

    user.password = newPassword.trim();
    await user.save();

    res.status(200).json({
        message: 'Parol muvaffaqiyatli o\'zgartirildi.',
        user: { _id: user._id, name: user.name, email: user.email }
    });
});

module.exports = { getUserProfile, updateUserProfile, getUserStatistics, getStudentsRatings, getNotifications, getMyScores, getAllUsers, updateUserPasswordByAdmin };