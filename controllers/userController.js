const User = require('../models/userModel');
const Enrollment = require('../models/EnrollmentModel');
const Progress = require('../models/progressModel');
const Lesson = require('../models/lessonModel');
const asyncHandler = require('express-async-handler');

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
        return res.status(200).json({
            courses: 0,
            completed: 0,
            progress: 0,
            certificates: 0
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

        res.status(200).json({
            courses: totalCourses,
            completed: completedCourses,
            progress: averageProgress,
            certificates: certificates
        });

    } catch (error) {
        console.error('Statistika yuklashda xato:', error);
        res.status(500).json({
            message: 'Statistika yuklashda xato yuz berdi.',
            courses: 0,
            completed: 0,
            progress: 0,
            certificates: 0
        });
    }
});

// @desc    Barcha studentlar reytingini olish
// @route   GET /api/users/ratings
// @access  Private (Hamma ko'ra oladi)
const getStudentsRatings = asyncHandler(async (req, res) => {
    try {
        // 1. Barcha studentlarni olish
        const students = await User.find({ role: 'student' })
            .select('_id name email avatar')
            .sort({ name: 1 });

        // 2. Har bir student uchun ballarni hisoblash
        const ratings = await Promise.all(
            students.map(async (student) => {
                const studentId = student._id;

                // A) Submission'lardan olingan ballar (har bir approved submission uchun grade)
                const submissions = await Submission.find({
                    user: studentId,
                    status: 'approved'
                }).select('grade lesson');

                let submissionScore = 0;
                const lessonScores = new Map(); // Har bir dars uchun maksimal ballni saqlash

                submissions.forEach(sub => {
                    if (sub.grade !== undefined && sub.grade !== null) {
                        const lessonId = sub.lesson.toString();
                        const currentMax = lessonScores.get(lessonId) || 0;
                        if (sub.grade > currentMax) {
                            lessonScores.set(lessonId, sub.grade);
                        }
                    }
                });

                // Har bir darsdan maksimal ballni yig'ish
                submissionScore = Array.from(lessonScores.values()).reduce((sum, grade) => sum + grade, 0);

                // B) Test natijalaridan olingan ballar (har bir test uchun score)
                const testResults = await TestResult.find({
                    student: studentId,
                    isCorrect: true
                }).select('score lesson');

                let testScore = 0;
                testResults.forEach(result => {
                    if (result.score !== undefined && result.score !== null) {
                        testScore += result.score;
                    }
                });

                // C) Umumiy ball (submission + test ballari)
                const totalScore = submissionScore + testScore;

                // D) Qo'shimcha ma'lumotlar
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
                    submissionScore: submissionScore,
                    testScore: testScore,
                    totalScore: totalScore,
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

    } catch (error) {
        console.error('Reyting yuklashda xato:', error);
        res.status(500).json({
            success: false,
            message: 'Reyting yuklashda xato yuz berdi.',
            ratings: []
        });
    }
});

module.exports = { getUserProfile, updateUserProfile, getUserStatistics, getStudentsRatings };