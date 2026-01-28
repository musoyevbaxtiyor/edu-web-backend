// edu-web-backend/controllers/lessonController.js

const asyncHandler = require('express-async-handler');
// const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
// const Progress = require('../models/progressModel'); 
const Enrollment = require('../models/EnrollmentModel'); // MUHIM: Enrollmentni tekshirish uchun qo'shdik

// @desc    Kurs uchun yangi dars yaratish
// @route   POST /api/lessons
// @access  Private (Admin/Teacher)


// @desc    Kursning barcha darslarini olish (RBAC + Enrollment Check bilan)
// @route   GET /api/lessons/:courseId
// @access  Private (Talaba ro'yxatdan o'tgan bo'lishi kerak / Admin/Teacher)

// edu-web-backend/controllers/lessonController.js (getLessonsByCourse funksiyasi)

const getLessonsByCourse = asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const userRole = req.user.role;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi');
    }
    
    // Kirishni cheklash (RBAC + Enrollment)
    const isTeacher = course.teacher.toString() === userId;
    const isAdmin = userRole === 'admin';
    let isEnrolled = false;

    if (userRole === 'student') {
        // KAMCHILIK TO'G'RILANDI: Progress modelida student maydoni bo'lishi kerak
        const enrollment = await Enrollment.findOne({ student: userId, course: courseId }); // <--- user: o'rniga student:
        isEnrolled = !!enrollment;
    }
    
    if (!isAdmin && !isTeacher && !isEnrolled) {
        res.status(403);
        throw new Error('Siz ushbu kurs materiallarini ko\'rishga ruxsatga ega emassiz. Iltimos, kursga yoziling.');
    }
// -------------------------------------------
/*
    const lessons = await Lesson.find({ course: courseId }).sort({ order: 1 });
    
    let lessonData = lessons;
    
    // Agar foydalanuvchi talaba bo'lsa, har bir dars uchun progressni yuklash
    if (userRole === 'student') {
        // Talabaning bu kursdagi barcha progress yozuvlarini yuklash
        // Eslatma: Progress modelida ham foydalanuvchi maydoni 'user' deb nomlangan deb hisoblaymiz.
        const progressRecords = await Progress.find({ user: userId, course: courseId }); 
        
        // Progress yozuvlarini dars ID si bo'yicha tez qidirish uchun Map qilish
        const progressMap = new Map();
        progressRecords.forEach(p => progressMap.set(p.lesson.toString(), p.status));

        // Darslarga status qo'shish va keyingi darsni qulflash mantiqini qo'shish
        lessonData = lessons.map((lesson, index) => {
            const lessonId = lesson._id.toString();
            let status = progressMap.get(lessonId) || 'locked';

            // 1. Birinchi darsni avtomatik ochish mantiqi
            if (index === 0 && status === 'locked') {
                status = 'unlocked';
                
                // MUHIM: Statusni DB ga saqlash
                // Bu joyda `findOneAndUpdate` bilan birinchi dars uchun 'unlocked' progress yozuvini yaratish yoki yangilash mantiqini qo'shish foydali.
                // Lekin hozircha faqat frontendda statusni o'zgartirib qaytaramiz (agar hali yaratilmagan bo'lsa, darsga kirganda 'started' bo'ladi).

            }
            
            return {
                ...lesson.toObject(),
                status: status, // Talabaning holati
            };
        });
    }

    res.status(200).json({
        count: lessonData.length,
        lessons: lessonData,
    });

    */

    const lessons = await Lesson.find({ course: courseId }).sort('order').lean();
    if (!lessons || lessons.length === 0) {
        return res.status(200).json({ lessons: [] });
    }
    
    // O'qituvchi/Admin uchun
    if (userRole === 'teacher' || userRole === 'admin') {
        const teacherLessons = lessons.map(lesson => ({
            ...lesson,
            progressStatus: 'completed',
            isLocked: false // O'qituvchi uchun har doim ochiq
        }));
        // ENDI TO'G'RI OBYEKT QAYTARAMIZ, Frontend kutganidek
        return res.status(200).json({ lessons: teacherLessons, count: teacherLessons.length });
    }
    
    // Talaba Mantiqi: getLessonContent dan ko'chirilgan blok
    const userProgress = await Progress.find({ user: userId, course: courseId }).select('lesson status'); 
    const progressMap = new Map();
    userProgress.forEach(p => progressMap.set(p.lesson.toString(), p.status));

    const enrichedLessons = [];
    let previousLessonCompleted = true; // 🔥 Boshlang'ich shart: Birinchi darsni ochish uchun TRUE

    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const lessonIdStr = lesson._id.toString();
        
        const currentStatus = progressMap.get(lessonIdStr);
        lesson.progressStatus = currentStatus || 'locked'; 
        
        let isCurrentLessonLocked = true;

        // 1. Birinchi dars har doim ochiq
        if (i === 0) {
            isCurrentLessonLocked = false;
        } 
        // 2. Oldingi dars tugatilgan bo'lsa, bu darsni ochamiz
        else if (previousLessonCompleted) {
            isCurrentLessonLocked = false;
        }
        
        // 3. Agar dars allaqachon boshlangan bo'lsa (progress yozuvi bor), qulflamaymiz
        if (currentStatus !== undefined) {
             isCurrentLessonLocked = false;
        }
        
        lesson.isLocked = isCurrentLessonLocked; // <<< isLocked shu yerda yaratiladi!

        // Keyingi iteratsiya uchun holatni yangilash
        previousLessonCompleted = (lesson.progressStatus === 'completed' || lesson.progressStatus === 'approved');

        // Kontentni olib tashlash (Qulflash mantiqi)
        if (lesson.isLocked) {
             delete lesson.videoUrl;
             delete lesson.documentationUrl;
             delete lesson.taskDescription;
             delete lesson.taskFileUrl;
        }

        enrichedLessons.push(lesson);
    }
    
    // Endi faqat bu javob qaytariladi
    res.status(200).json({ lessons: enrichedLessons, count: enrichedLessons.length });

});


// @desc    Yagona dars kontentini olish (Talaba Progressini yuklash uchun)
// @route   GET /api/lessons/:lessonId/content
// @access  Private
// ... (boshqa importlar)
const Lesson = require('../models/lessonModel');
const Progress = require('../models/progressModel');
const Submission = require('../models/submissionModel'); 

const getLessonContent = asyncHandler(async (req, res) => {
    const userId = req.user.id; 
    const courseId = req.params.courseId; 
    const userRole = req.user.role; 

    // 1. Darslarni tartib bo'yicha olish
    const lessons = await Lesson.find({ course: courseId }).sort('order').lean();
    if (!lessons || lessons.length === 0) {
        return res.status(200).json({ lessons: [] });
    }

    // O'qituvchi/Admin uchun maxsus holat
    if (userRole === 'teacher' || userRole === 'admin') {
        const teacherLessons = lessons.map(lesson => ({
            ...lesson,
            progressStatus: 'completed',
            isLocked: false 
        }));
        return res.status(200).json({ lessons: teacherLessons });
    }
    
    // Talaba Mantiqi Boshlanishi
    
    // 2. Talabaning progressini Map ga yig'ish
    const userProgress = await Progress.find({ user: userId, course: courseId }).select('lesson status'); 
    const progressMap = new Map();
    userProgress.forEach(p => progressMap.set(p.lesson.toString(), p.status));

    const enrichedLessons = [];
    let previousLessonCompleted = true; // Qulflash nazorati: Birinchi dars ochilishi uchun TRUE

    // 3. Har bir dars uchun qulflash mantiqini qo'llash
    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const lessonIdStr = lesson._id.toString();
        
        const currentStatus = progressMap.get(lessonIdStr);
        lesson.progressStatus = currentStatus || 'locked'; 
        
        let isCurrentLessonLocked = true; // Dastlab hamma darsni qulflaymiz

        // 1. Birinchi dars har doim ochiq bo'lishi kerak
        if (i === 0) {
            isCurrentLessonLocked = false;
        } 
        // 2. Agar oldingi dars tugatilgan bo'lsa, bu darsni ochamiz
        else if (previousLessonCompleted) {
            isCurrentLessonLocked = false;
        }
        
        // 3. Agar dars allaqachon boshlangan/topshirilgan bo'lsa (progress yozuvi mavjud bo'lsa) uni qulflamaymiz
        if (currentStatus !== undefined) {
             isCurrentLessonLocked = false;
        }
        
        lesson.isLocked = isCurrentLessonLocked;

        // Keyingi iteratsiya uchun statusni yangilash
        // 'completed' yoki 'approved' bo'lsa, keyingisini ochamiz.
        previousLessonCompleted = (lesson.progressStatus === 'completed' || lesson.progressStatus === 'approved');

        // Agar dars qulflangan bo'lsa, kontentni olib tashlash
        if (lesson.isLocked) {
             delete lesson.videoUrl;
             delete lesson.documentationUrl;
             delete lesson.taskDescription;
             delete lesson.taskFileUrl;
        }

        enrichedLessons.push(lesson);
    }
    
    res.status(200).json({ lessons: enrichedLessons });
});



// @desc    YANGI: Talaba vazifani topshirishi (Submission)
// @route   POST /api/lessons/:lessonId/submit
// @access  Private (Student)
const submitTask = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { submission } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'student') {
        res.status(403);
        throw new Error('Faqat talabalar vazifalarni topshirishlari mumkin.');
    }
    
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.contentType !== 'task') {
        res.status(400);
        throw new Error('Vazifa topilmadi yoki bu dars vazifa emas.');
    }
    
    if (!submission || submission.trim() === '') {
        res.status(400);
        throw new Error('Topshirish uchun yechim matni kerak.');
    }
    
    // Progressni topish va yangilash (yoki yaratish)
    const progress = await Progress.findOneAndUpdate(
        { user: userId, lesson: lessonId },
        { 
            status: 'submitted', 
            submission: submission,
            submittedAt: Date.now() 
        },
        { new: true, upsert: true } // Agar topilmasa yangisini yaratadi
    );

    res.status(200).json({
        message: 'Vazifa muvaffaqiyatli topshirildi. O\'qituvchi tekshirishini kuting.',
        progress,
    });
});


// @desc    Darsni yangilash
// @route   PUT /api/lessons/:id
// @access  Private (Admin/Teacher)
const updateLesson = asyncHandler(async (req, res) => {
    // ... (sizning kodingiz) ...
    const { id } = req.params;
    const updateData = req.body;
    
    let lesson = await Lesson.findById(id).populate({
        path: 'course',
        select: 'teacher'
    });

    if (!lesson) {
        res.status(404);
        throw new Error('Dars topilmadi.');
    }

    const courseTeacherId = lesson.course.teacher.toString();
    const isOwner = courseTeacherId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
        res.status(403);
        throw new Error('Siz faqat o\'zingizning kursingizdagi darslarni tahrirlay olasiz.');
    }
    
    const updatedLesson = await Lesson.findByIdAndUpdate(id, {
        title: updateData.title || lesson.title,
        order: updateData.order || lesson.order,
        contentType: updateData.contentType || lesson.contentType,
        contentUrl: updateData.contentUrl, 
        taskDescription: updateData.taskDescription
    }, { new: true });

    res.status(200).json({
        message: 'Dars muvaffaqiyatli yangilandi.',
        lesson: updatedLesson,
    });
});

// @desc    Darsni o'chirish
// @route   DELETE /api/lessons/:id
// @access  Private (Admin/Teacher)
const deleteLesson = asyncHandler(async (req, res) => {
    // ... (sizning kodingiz) ...
    const { id } = req.params;

    let lesson = await Lesson.findById(id).populate({
        path: 'course',
        select: 'teacher' 
    });

    if (!lesson) {
        res.status(404);
        throw new Error('Dars topilmadi.');
    }
    
    const courseTeacherId = lesson.course.teacher.toString();
    const isOwner = courseTeacherId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
        res.status(403);
        throw new Error('Siz faqat o\'zingizning kursingizdagi darslarni o\'chira olasiz.');
    }

    await Submission.deleteMany({ lesson: id });
    await Progress.deleteMany({ lesson: id });
    await lesson.deleteOne();

    res.status(200).json({
        message: 'Dars, unga yuborilgan vazifalar va progress yozuvlari muvaffaqiyatli o\'chirildi.'
    });
});

// Dars yaratish
const createLesson = asyncHandler(async (req, res) => {
    const { 
        title, 
        course, 
        order,
        videoUrl, 
        documentationUrl, 
        taskFileUrl, 
        taskDescription 
    } = req.body;

    const userId = req.user.id; // Kirgan foydalanuvchi ID si
    const userRole = req.user.role; // Kirgan foydalanuvchi roli

    // 1. Maydonlar to'liqligini tekshirish
    if (!title || !course || !videoUrl || !documentationUrl || !taskFileUrl || !taskDescription) {
        res.status(400);
        throw new Error('Iltimos, dars nomini va barcha to\'rtta kontent maydonini to\'ldiring.');
    }

    // 2. Kurs mavjudligini tekshirish
    const existingCourse = await Course.findById(course);
    if (!existingCourse) {
        res.status(404);
        throw new Error('Berilgan ID bo\'yicha kurs topilmadi.');
    }

    // 3. Ruxsatni tekshirish (Faqat Admin yoki Kursning egasi bo'lgan O'qituvchi yaratishi mumkin)
    const isOwner = existingCourse.teacher.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
        res.status(403);
        throw new Error('Siz faqat o\'zingiz yaratgan kurslarga dars qo\'sha olasiz.');
    }
    
    // 4. Tartib raqamini avtomatik aniqlash (agar Frontenddan kelmasa)
    const lessonsCount = await Lesson.countDocuments({ course: course });
    const finalOrder = order || lessonsCount + 1;

    // 5. Darsni yaratish va ma'lumotlar bazasiga saqlash
    const lesson = await Lesson.create({
        title,
        course,
        order: finalOrder,
        videoUrl,
        documentationUrl,
        taskFileUrl,
        taskDescription,
        // contentType maydoni endi kerak emas, chunki hamma kontent mavjud deb qabul qildik
    });

    res.status(201).json({ 
        message: 'Dars muvaffaqiyatli yaratildi',
        lesson 
    });
});


module.exports = {
    createLesson,
    getLessonsByCourse,
    // getLessonContent,       // MUHIM
    submitTask,             // YANGI: Vazifani topshirish
    updateLesson,
    deleteLesson
};