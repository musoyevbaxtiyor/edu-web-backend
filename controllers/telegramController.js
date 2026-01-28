const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Enrollment = require('../models/EnrollmentModel');
const Progress = require('../models/progressModel');
const Submission = require('../models/submissionModel');
const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
const TestResult = require('../models/testResultModel');
const crypto = require('crypto');

// @desc    Foydalanuvchi uchun Telegram token yaratish yoki olish
// @route   GET /api/telegram/token
// @access  Private
const getTelegramToken = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    let user = await User.findById(userId);
    
    if (!user) {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi');
    }
    
    // Agar token mavjud bo'lmasa, yangi token yaratamiz
    if (!user.telegramToken) {
        // Unique token yaratish (userId + random string)
        const randomString = crypto.randomBytes(32).toString('hex');
        user.telegramToken = `${userId.toString()}_${randomString}`;
        await user.save();
    }
    
    // Bot linkini yaratish
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot_username';
    const botLink = `https://t.me/${botUsername}?start=${user.telegramToken}`;
    
    res.status(200).json({
        success: true,
        token: user.telegramToken,
        botLink: botLink,
        isConnected: !!user.telegramChatId
    });
});

// @desc    Telegram chat ID ni yangilash (bot orqali chaqiriladi)
// @route   POST /api/telegram/connect
// @access  Public (bot orqali)
const connectTelegram = asyncHandler(async (req, res) => {
    const { token, chatId } = req.body;
    
    if (!token || !chatId) {
        res.status(400);
        throw new Error('Token va Chat ID talab qilinadi');
    }
    
    const user = await User.findOne({ telegramToken: token });
    
    if (!user) {
        res.status(404);
        throw new Error('Noto\'g\'ri token');
    }
    
    user.telegramChatId = chatId.toString();
    await user.save();
    
    res.status(200).json({
        success: true,
        message: 'Telegram muvaffaqiyatli ulandi'
    });
});

// @desc    O'quvchi ma'lumotlarini olish (bot uchun)
// @route   GET /api/telegram/student-data/:chatId
// @access  Private (bot orqali)
const getStudentData = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    
    const user = await User.findOne({ telegramChatId: chatId });
    
    if (!user) {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi');
    }
    
    if (user.role !== 'student') {
        res.status(403);
        throw new Error('Bu funksiya faqat o\'quvchilar uchun');
    }
    
    // Statistika ma'lumotlari
    const enrollments = await Enrollment.find({ student: user._id })
        .populate('course', 'title description');
    
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.completionStatus === 'Completed').length;
    
    // Progress hisoblash
    let totalProgress = 0;
    let coursesWithProgress = 0;
    
    for (const enrollment of enrollments) {
        const courseId = enrollment.course._id;
        const totalLessons = await Lesson.countDocuments({ course: courseId });
        
        if (totalLessons > 0) {
            const completedLessons = await Progress.countDocuments({
                user: user._id,
                course: courseId,
                status: 'completed'
            });
            const courseProgress = (completedLessons / totalLessons) * 100;
            totalProgress += courseProgress;
            coursesWithProgress++;
        }
    }
    
    const averageProgress = coursesWithProgress > 0 
        ? Math.round(totalProgress / coursesWithProgress) 
        : 0;
    
    // Ballar
    const submissions = await Submission.find({
        user: user._id,
        status: 'approved'
    }).select('grade lesson');
    
    let submissionScore = 0;
    const lessonScores = new Map();
    
    if (submissions && submissions.length > 0) {
        submissions.forEach(sub => {
            if (sub.grade !== undefined && sub.grade !== null && sub.lesson) {
                const lessonId = sub.lesson.toString();
                const currentMax = lessonScores.get(lessonId) || 0;
                if (sub.grade > currentMax) {
                    lessonScores.set(lessonId, sub.grade);
                }
            }
        });
        submissionScore = Array.from(lessonScores.values()).reduce((sum, grade) => sum + (grade || 0), 0);
    }
    
    // Test ballari
    const testResults = await TestResult.find({
        student: user._id,
        isCorrect: true
    }).select('score');
    
    let testScore = 0;
    if (testResults && testResults.length > 0) {
        testResults.forEach(result => {
            if (result.score !== undefined && result.score !== null) {
                testScore += result.score || 0;
            }
        });
    }
    
    const totalScore = submissionScore + testScore;
    
    // Tasdiqlangan darslar
    const approvedSubmissions = await Submission.find({
        user: user._id,
        status: 'approved'
    }).populate({
        path: 'lesson',
        select: 'title',
        populate: {
            path: 'course',
            select: 'title'
        }
    }).sort({ createdAt: -1 }).limit(10);
    
    res.status(200).json({
        success: true,
        user: {
            name: user.name,
            email: user.email,
            coins: user.coins || 0
        },
        statistics: {
            totalCourses,
            completedCourses,
            averageProgress,
            totalScore,
            submissionScore,
            testScore
        },
        recentApprovedLessons: approvedSubmissions.map(sub => ({
            lessonTitle: sub.lesson?.title || 'Noma\'lum',
            courseTitle: sub.lesson?.course?.title || 'Noma\'lum',
            grade: sub.grade,
            coins: sub.coins || 0,
            date: sub.updatedAt
        }))
    });
});

// @desc    O'qituvchi uchun yangi submission xabarlarini olish
// @route   GET /api/telegram/teacher-notifications/:chatId
// @access  Private (bot orqali)
const getTeacherNotifications = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    
    const user = await User.findOne({ telegramChatId: chatId });
    
    if (!user) {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi');
    }
    
    if (user.role !== 'teacher') {
        res.status(403);
        throw new Error('Bu funksiya faqat o\'qituvchilar uchun');
    }
    
    // O'qituvchining kurslarini olish
    const courses = await Course.find({ teacher: user._id }).select('_id');
    const courseIds = courses.map(c => c._id);
    
    // Bu kurslardagi darslarni olish
    const lessons = await Lesson.find({ course: { $in: courseIds } }).select('_id');
    const lessonIds = lessons.map(l => l._id);
    
    // Tekshirilmagan submissionlarni olish
    const pendingSubmissions = await Submission.find({
        lesson: { $in: lessonIds },
        status: { $in: ['submitted', 'in_review'] }
    })
    .populate({
        path: 'user',
        select: 'name'
    })
    .populate({
        path: 'lesson',
        select: 'title',
        populate: {
            path: 'course',
            select: 'title'
        }
    })
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.status(200).json({
        success: true,
        count: pendingSubmissions.length,
        submissions: pendingSubmissions.map(sub => ({
            id: sub._id,
            studentName: sub.user?.name || 'Noma\'lum',
            lessonTitle: sub.lesson?.title || 'Noma\'lum',
            courseTitle: sub.lesson?.course?.title || 'Noma\'lum',
            status: sub.status,
            createdAt: sub.createdAt,
            hasFile: !!sub.filePath
        }))
    });
});

module.exports = {
    getTelegramToken,
    connectTelegram,
    getStudentData,
    getTeacherNotifications
};
