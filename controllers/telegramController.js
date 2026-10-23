const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Enrollment = require('../models/EnrollmentModel');
const Progress = require('../models/progressModel');
const Submission = require('../models/submissionModel');
const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
// Reyting ballari — saytdagi reyting bilan bir xil formula
const { computeScores } = require('./userController');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/* ============================================================
   Yordamchi funksiyalar
   ============================================================ */

// Telegram deep-link start parametri: ko'pi bilan 64 belgi, faqat [A-Za-z0-9_-]
const DEEP_LINK_TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;
// Ulashda qabul qilinadigan token (eski 89 belgili `userId_hex` tokenlar ham mos keladi)
const ANY_TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;
// Telegram chat ID — butun son (guruhlarda manfiy)
const CHAT_ID_RE = /^-?\d{1,20}$/;

// Yangi token: 24 bayt -> 32 belgili base64url (deep-link uchun mos)
const generateTelegramToken = () => crypto.randomBytes(24).toString('base64url');

// Status kodli xato (errorMiddleware err.statusCode ni o'qiydi)
const httpError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

// Chat ID ni tekshirib, satrga aylantirish (obyekt/operator kiritilishining oldini oladi)
const normalizeChatId = (chatId) => {
    const value = typeof chatId === 'number' && Number.isSafeInteger(chatId) ? String(chatId) : chatId;
    if (typeof value !== 'string' || !CHAT_ID_RE.test(value)) {
        throw httpError(400, 'Noto\'g\'ri Chat ID');
    }
    return value;
};

// Chat ID ni foydalanuvchiga yozish. Shu chat boshqa hisobga ulangan bo'lsa,
// avval o'sha hisobdan uziladi (aks holda unique indeks E11000 beradi).
// updateOne — eski hujjatlarda (phone/age yo'q) save() validatsiyasi yiqilmasligi uchun
const attachChat = async (userId, chatId, extraUpdate = {}) => {
    await User.updateMany(
        { telegramChatId: chatId, _id: { $ne: userId } },
        { $unset: { telegramChatId: '' } }
    );
    await User.updateOne({ _id: userId }, { $set: { telegramChatId: chatId }, ...extraUpdate });
};

// Email bo'yicha qidirish: avval aniq moslik, so'ng katta-kichik harfsiz (faqat bitta mos kelsa)
const findUserByEmail = async (email) => {
    const exact = await User.findOne({ email });
    if (exact) return exact;
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = await User.find({ email: new RegExp(`^${escaped}$`, 'i') }).limit(2);
    return matches.length === 1 ? matches[0] : null;
};

/* ============================================================
   Bot uchun servis funksiyalar (bot ularni to'g'ridan-to'g'ri chaqiradi)
   ============================================================ */

// Token orqali ulash (/start <token>). Token bir martalik — ulangach o'chiriladi
const linkChatByToken = async (token, chatId) => {
    if (typeof token !== 'string' || !ANY_TOKEN_RE.test(token)) {
        throw httpError(400, 'Noto\'g\'ri token');
    }
    const chat = normalizeChatId(chatId);

    const user = await User.findOne({ telegramToken: token });
    if (!user) {
        throw httpError(404, 'Noto\'g\'ri yoki eskirgan token');
    }

    await attachChat(user._id, chat, { $unset: { telegramToken: '' } });
    return user;
};

// Email va parol orqali ulash (bot login oqimi)
const linkChatByLogin = async (email, password, chatId) => {
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        throw httpError(400, 'Email, parol va Chat ID talab qilinadi');
    }
    const chat = normalizeChatId(chatId);
    const cleanEmail = email.trim();
    if (cleanEmail.length > 254) {
        throw httpError(401, 'Email yoki parol noto\'g\'ri');
    }

    const user = await findUserByEmail(cleanEmail);
    // Noma'lum email va noto'g'ri parol uchun bir xil javob (email borligi oshkor bo'lmasin)
    const isPasswordValid = user && user.password
        ? await bcrypt.compare(password, user.password)
        : false;
    if (!isPasswordValid) {
        throw httpError(401, 'Email yoki parol noto\'g\'ri');
    }

    await attachChat(user._id, chat);
    return user;
};

// O'quvchi ma'lumotlari (statistika, kurslar, ballar)
const getStudentDataByChat = async (chatId) => {
    const chat = normalizeChatId(chatId);
    const user = await User.findOne({ telegramChatId: chat });

    if (!user) {
        throw httpError(404, 'Foydalanuvchi topilmadi');
    }

    if (user.role !== 'student') {
        throw httpError(403, 'Bu funksiya faqat o\'quvchilar uchun');
    }

    // O'chirilgan kurslar (course = null) hisobga olinmaydi
    const enrollments = (await Enrollment.find({ student: user._id })
        .populate('course', 'title description'))
        .filter(e => e.course);

    const totalCourses = enrollments.length;
    let completedCourses = 0;

    // Har bir kurs bo'yicha progress (bir marta hisoblanadi)
    let totalProgress = 0;
    let coursesWithProgress = 0;
    const coursesList = [];

    for (const enrollment of enrollments) {
        const courseId = enrollment.course._id;
        // Faqat mavjud darslar hisobga olinadi (o'chirilgan darslar foizni oshirmasin)
        const lessonIds = await Lesson.find({ course: courseId }).distinct('_id');
        const totalLessons = lessonIds.length;
        const completedLessons = totalLessons > 0
            ? await Progress.countDocuments({ user: user._id, lesson: { $in: lessonIds }, status: 'completed' })
            : 0;
        // completionStatus hech qayerda o'rnatilmaydi — kurs barcha darslari tugaganda tugatilgan hisoblanadi
        const isCompleted = enrollment.completionStatus === 'Completed' ||
            (totalLessons > 0 && completedLessons >= totalLessons);
        if (isCompleted) completedCourses++;

        if (totalLessons > 0) {
            totalProgress += (completedLessons / totalLessons) * 100;
            coursesWithProgress++;
        }

        coursesList.push({
            courseId: courseId,
            title: enrollment.course.title,
            description: enrollment.course.description,
            progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            completedLessons: completedLessons,
            totalLessons: totalLessons,
            isCompleted,
            enrolledAt: enrollment.enrolledAt
        });
    }

    const averageProgress = coursesWithProgress > 0
        ? Math.round(totalProgress / coursesWithProgress)
        : 0;

    // Ballar — saytdagi reyting bilan bir xil
    const scores = await computeScores(user._id);

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

    return {
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
            ...scores
        },
        courses: coursesList,
        completedCourses: coursesList.filter(c => c.isCompleted),
        inProgressCourses: coursesList.filter(c => !c.isCompleted),
        recentApprovedLessons: approvedSubmissions.map(sub => ({
            lessonTitle: sub.lesson?.title || 'Noma\'lum',
            courseTitle: sub.lesson?.course?.title || 'Noma\'lum',
            grade: sub.grade,
            coins: sub.coins || 0,
            date: sub.updatedAt
        }))
    };
};

// O'qituvchi/admin uchun tekshirilmagan vazifalar
const getTeacherNotificationsByChat = async (chatId) => {
    const chat = normalizeChatId(chatId);
    const user = await User.findOne({ telegramChatId: chat });

    if (!user) {
        throw httpError(404, 'Foydalanuvchi topilmadi');
    }

    if (user.role !== 'teacher' && user.role !== 'admin') {
        throw httpError(403, 'Bu funksiya faqat o\'qituvchilar uchun');
    }

    const filter = { status: { $in: ['submitted', 'in_review'] } };

    // Admin barcha kurslarni ko'radi, o'qituvchi — faqat o'z kurslarini
    if (user.role !== 'admin') {
        const courseIds = await Course.find({ teacher: user._id }).distinct('_id');
        const lessonIds = await Lesson.find({ course: { $in: courseIds } }).distinct('_id');
        filter.lesson = { $in: lessonIds };
    }

    const [count, pendingSubmissions] = await Promise.all([
        Submission.countDocuments(filter),
        Submission.find(filter)
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
            .limit(20)
    ]);

    return {
        success: true,
        count,
        submissions: pendingSubmissions.map(sub => ({
            id: sub._id,
            studentName: sub.user?.name || 'Noma\'lum',
            lessonTitle: sub.lesson?.title || 'Noma\'lum',
            courseTitle: sub.lesson?.course?.title || 'Noma\'lum',
            status: sub.status,
            createdAt: sub.createdAt,
            hasFile: !!sub.submissionUrl
        }))
    };
};

/* ============================================================
   Bot marshrutlari uchun maxfiy kalit (X-Bot-Secret)
   ============================================================ */

// Faqat TELEGRAM_INTERNAL_SECRET. Bot tokenidan hosil qilinmaydi: token gitda oshkor bo'lgan.
// Kalit berilmasa, marshrutlar yopiq (serverdagi bot ularni ishlatmaydi)
const getInternalSecret = () => process.env.TELEGRAM_INTERNAL_SECRET || null;

// Faqat maxfiy kalitni bilgan (bot) chaqira oladi
const requireBotSecret = (req, res, next) => {
    const secret = getInternalSecret();
    const given = req.get('x-bot-secret');

    let ok = false;
    if (secret && typeof given === 'string' && given) {
        // Teng uzunlikda solishtirish uchun ikkalasini ham xeshlaymiz
        const a = crypto.createHash('sha256').update(given).digest();
        const b = crypto.createHash('sha256').update(secret).digest();
        ok = crypto.timingSafeEqual(a, b);
    }

    if (!ok) {
        res.status(403);
        return next(new Error('Ruxsat yo\'q'));
    }
    next();
};

/* ============================================================
   HTTP controllerlar
   ============================================================ */

// @desc    Foydalanuvchi uchun Telegram token yaratish yoki olish
// @route   GET /api/telegram/token
// @access  Private
const getTelegramToken = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('telegramToken telegramChatId');

    if (!user) {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi');
    }

    // Token yo'q yoki eski formatda (89 belgi — Telegram 64 dan uzun start parametrini o'tkazmaydi)
    let token = user.telegramToken;
    if (!token || !DEEP_LINK_TOKEN_RE.test(token)) {
        token = generateTelegramToken();
        await User.updateOne({ _id: user._id }, { $set: { telegramToken: token } });
    }

    // Bot linkini yaratish
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot_username';
    const botLink = `https://t.me/${botUsername}?start=${token}`;

    res.status(200).json({
        success: true,
        token: token,
        botLink: botLink,
        isConnected: !!user.telegramChatId
    });
});

// @desc    Telegram chat ID ni yangilash - Token orqali
// @route   POST /api/telegram/connect
// @access  Bot (X-Bot-Secret)
const connectTelegram = asyncHandler(async (req, res) => {
    const { token, chatId } = req.body || {};

    if (!token || !chatId) {
        res.status(400);
        throw new Error('Token va Chat ID talab qilinadi');
    }

    await linkChatByToken(token, chatId);

    res.status(200).json({
        success: true,
        message: 'Telegram muvaffaqiyatli ulandi'
    });
});

// @desc    Login va parol orqali Telegram botga ulash
// @route   POST /api/telegram/connect-login
// @access  Bot (X-Bot-Secret)
const connectTelegramWithLogin = asyncHandler(async (req, res) => {
    const { email, password, chatId } = req.body || {};

    if (!email || !password || !chatId) {
        res.status(400);
        throw new Error('Email, parol va Chat ID talab qilinadi');
    }

    const user = await linkChatByLogin(email, password, chatId);

    res.status(200).json({
        success: true,
        message: 'Telegram muvaffaqiyatli ulandi',
        user: {
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});

// @desc    O'quvchi ma'lumotlarini olish (bot uchun)
// @route   GET /api/telegram/student-data/:chatId
// @access  Bot (X-Bot-Secret)
const getStudentData = asyncHandler(async (req, res) => {
    res.status(200).json(await getStudentDataByChat(req.params.chatId));
});

// @desc    O'qituvchi uchun yangi submission xabarlarini olish
// @route   GET /api/telegram/teacher-notifications/:chatId
// @access  Bot (X-Bot-Secret)
const getTeacherNotifications = asyncHandler(async (req, res) => {
    res.status(200).json(await getTeacherNotificationsByChat(req.params.chatId));
});

module.exports = {
    getTelegramToken,
    connectTelegram,
    connectTelegramWithLogin,
    getStudentData,
    getTeacherNotifications,
    requireBotSecret,
    // Bot uchun servislar
    linkChatByToken,
    linkChatByLogin,
    getStudentDataByChat,
    getTeacherNotificationsByChat
};
