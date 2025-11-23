// edu-web-backend/controllers/reviewController.js

const asyncHandler = require('express-async-handler');
const Progress = require('../models/progressModel');
const Lesson = require('../models/lessonModel');
// Progress modelida Kurs ham bor. Kursni olish uchun Course importi kerak emas.

// @desc    O'qituvchi uchun topshirilgan vazifalar ro'yxatini olish
// @route   GET /api/reviews/tasks
// @access  Private (Teacher/Admin)
const getSubmittedTasks = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Faqat topshirilgan ('submitted') vazifalarni olamiz
    const filter = { status: 'submitted' };

    // Barcha topshirilgan Progress yozuvlarini yuklash (Kurs egasini tekshirish uchun)
    const allSubmittedTasks = await Progress.find(filter)
        .populate({
            path: 'course',
            select: 'title teacher' // Kurs egasi (teacher) ID'sini yuklash
        })
        .populate({
            path: 'lesson',
            select: 'title'
        })
        .populate({
            path: 'user',
            select: 'name email'
        })
        .sort({ submittedAt: -1 });

    let finalTasks;
    
    if (userRole === 'teacher') {
        // O'qituvchi faqat o'zi egasi bo'lgan kurslarning vazifalarini filter qiladi
        finalTasks = allSubmittedTasks.filter(task => 
            // `task.course` mavjudligini va kursning o'qituvchisi hozirgi foydalanuvchiga to'g'ri kelishini tekshirish
            task.course && task.course.teacher && task.course.teacher.toString() === userId
        );
    } else { // admin
        // Admin barcha topshirilgan vazifalarni ko'radi
        finalTasks = allSubmittedTasks;
    }
    
    if (finalTasks.length === 0) {
        return res.status(200).json({
            count: 0,
            tasks: [],
            message: "Tekshiriladigan vazifalar mavjud emas."
        });
    }

    res.status(200).json({
        count: finalTasks.length,
        tasks: finalTasks
    });
});

// @desc    Topshirilgan vazifani baholash va tasdiqlash
// @route   PUT /api/reviews/tasks/:progressId/approve
// @access  Private (Teacher/Admin)
const approveTask = asyncHandler(async (req, res) => {
    const { progressId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Progress yozuvini topish
    const progress = await Progress.findById(progressId).populate({
        path: 'course',
        select: 'teacher' 
    });

    if (!progress) {
        res.status(404);
        throw new Error('Vazifa topshirilgan yozuv topilmadi.');
    }
    
    // Agar vazifa allaqachon tasdiqlangan bo'lsa
    if (progress.status === 'completed') {
        res.status(400);
        throw new Error('Bu vazifa allaqachon tasdiqlangan.');
    }

    // 2. Ruxsatni tekshirish (Admin yoki Kursning egasi)
    const courseTeacherId = progress.course.teacher.toString();
    const isOwner = courseTeacherId === userId;
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isOwner) {
        res.status(403);
        throw new Error('Siz faqat o\'zingizning kursingizdagi vazifalarni tasdiqlay olasiz.');
    }
    
    // 3. Vazifani tasdiqlash ('completed' holatiga o'tkazish)
    progress.status = 'completed';
    progress.completedAt = Date.now();
    await progress.save();
    
    // 4. MUHIM QADAM: Keyingi darsni ochish mantiqi
    
    // 4a. Kursning barcha darslarini tartib bo'yicha yuklash
    const allLessons = await Lesson.find({ course: progress.course._id })
        .sort({ order: 1 });
        
    // 4b. Tasdiqlangan darsning ro'yxatdagi o'rnini topish
    const currentLessonIndex = allLessons.findIndex(
        (lesson) => lesson._id.toString() === progress.lesson.toString()
    );
    
    // 4c. Keyingi darsni aniqlash
    const nextLesson = allLessons[currentLessonIndex + 1];
    
    if (nextLesson) {
        // 4d. Agar keyingi dars mavjud bo'lsa, unga progress yozuvini yaratish
        // Statusni 'unlocked' deb o'rnatamiz (yoki 'started' bo'lsa, o'zgartirmaymiz)
        await Progress.findOneAndUpdate(
            { user: progress.user, lesson: nextLesson._id },
            { 
                course: progress.course._id,
                status: 'unlocked' // Yangi holat: ochildi
            },
            { new: true, upsert: true } // Agar yozuv bo'lmasa, yangisini yaratadi
        );
        
        // Qo'shimcha xabar
        console.log(`Keyingi dars (ID: ${nextLesson._id}) talaba uchun ochildi.`);
    }

    res.status(200).json({
        message: 'Vazifa muvaffaqiyatli tasdiqlandi. Keyingi dars ochildi.',
        progress
    });
});

module.exports = {
    getSubmittedTasks,
    approveTask
};