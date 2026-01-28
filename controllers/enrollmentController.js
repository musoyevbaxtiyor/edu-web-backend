const Enrollment = require('../models/EnrollmentModel'); // E va M ni katta qildik
const Course = require('../models/courseModel'); // Kurs ma'lumotlarini tekshirish uchun
const asyncHandler = require('express-async-handler'); // Asinxron xatolarni boshqarish uchun

// @desc    Kursga ro'yxatdan o'tish (Enroll)
// @route   POST /api/enroll
// @access  Private (Talaba roliga ega bo'lganlar uchun)
const enrollCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const studentId = req.user._id; // protect middleware orqali token'dan olinadi

    // 1. Kursning mavjudligini tekshirish
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi.');
    }
    
    // 2. Kurs avval nashr qilinganligini tekshirish (faqat talabalar uchun)
    if (!course.isPublished && req.user.role === 'student') {
        res.status(403);
        throw new Error('Bu kurs hozirda ro\'yxatdan o\'tish uchun mavjud emas.');
    }

    // 3. Foydalanuvchi allaqachon ro'yxatdan o'tganligini tekshirish (unique index tufayli, lekin aniq xabar berish uchun)
    const alreadyEnrolled = await Enrollment.findOne({ student: studentId, course: courseId });
    if (alreadyEnrolled) {
        res.status(400);
        throw new Error('Siz allaqachon bu kursga ro\'yxatdan o\'tgansiz.');
    }

    // 4. Ro'yxatdan o'tishni yaratish
    const enrollment = await Enrollment.create({
        student: studentId,
        course: courseId,
        paymentStatus: 'Completed', // Hozircha to'lovni avtomatik tasdiqlaymiz
    });

    res.status(201).json({
        message: 'Kursga muvaffaqiyatli ro\'yxatdan o\'tildi.',
        enrollment
    });
});


// @desc    Talabaning barcha ro'yxatga olingan kurslarini olish
// @route   GET /api/enroll/my-courses
// @access  Private (Faqat ro'yxatdan o'tgan foydalanuvchilar o'zi uchun)
const getMyEnrollments = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    // Enrollmentlarni olish va kurs ma'lumotlarini to'ldirish
    const enrollments = await Enrollment.find({ student: studentId })
        .populate({
            path: 'course',
            select: 'title description price teacher isPublished', // Kursning kerakli maydonlari
            populate: {
                path: 'teacher', // Kurs ichidagi o'qituvchi ma'lumotlarini ham olish
                select: 'name email role'
            }
        })
        .select('-student -__v'); // Talaba IDsi va versiya maydonini yashirish

    // Faqat kurs obyektlarini qaytarish va null kurslarni filtrlash (o'chirilgan kurslar)
    const enrolledCourses = enrollments
        .map(e => e.course)
        .filter(course => course !== null && course !== undefined); // O'chirilgan kurslarni olib tashlash

    res.status(200).json({ 
        count: enrolledCourses.length,
        courses: enrolledCourses
    });
});

module.exports = {
    enrollCourse,
    getMyEnrollments,
};