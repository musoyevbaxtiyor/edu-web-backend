const Test = require('../models/testModel');
const TestResult = require('../models/testResultModel');
const asyncHandler = require('express-async-handler');

// Javob kalitini faqat o'qituvchi/admin ko'radi
const canSeeAnswers = (user) => user && (user.role === 'teacher' || user.role === 'admin');

// Talabaga yuboriladigan testdan to'g'ri javob va izohni olib tashlash
function stripAnswer(test) {
    const obj = test.toObject ? test.toObject() : { ...test };
    delete obj.correctAnswer;
    delete obj.explanation;
    return obj;
}

// @desc    Barcha testlarni olish
// @route   GET /api/tests
// @access  Private
const getTests = asyncHandler(async (req, res) => {
    const { courseId, lessonId, isActive, createdBy } = req.query;
    
    const query = {};
    
    if (courseId) {
        query.courseId = courseId;
    }
    
    if (lessonId) {
        query.lessonId = lessonId;
    }
    
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }
    // Talabalarga faqat faol testlar ko'rsatiladi
    if (!canSeeAnswers(req.user)) {
        query.isActive = true;
    }

    if (createdBy) {
        query.createdBy = createdBy;
    }

    const tests = await Test.find(query)
        // Muallif emaili faqat o'qituvchi/admin uchun
        .populate('createdBy', canSeeAnswers(req.user) ? 'name email' : 'name')
        .populate('courseId', 'title')
        .populate('lessonId', 'title')
        .sort({ order: 1, createdAt: -1 });

    if (canSeeAnswers(req.user)) {
        return res.status(200).json({
            success: true,
            count: tests.length,
            tests
        });
    }

    // Talaba: javobsiz + o'zining avvalgi natijasi (javob faqat /check orqali)
    const results = await TestResult.find({
        student: req.user._id,
        test: { $in: tests.map((t) => t._id) }
    }).select('test isCorrect score').lean();
    const resultByTest = new Map(results.map((r) => [r.test.toString(), r]));

    const list = tests.map((t) => {
        const obj = stripAnswer(t);
        const r = resultByTest.get(t._id.toString());
        obj.myResult = r ? { isCorrect: r.isCorrect, score: r.score || 0 } : null;
        return obj;
    });

    res.status(200).json({
        success: true,
        count: list.length,
        tests: list
    });
});

// @desc    Bitta testni olish
// @route   GET /api/tests/:id
// @access  Private
const getTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id)
        .populate('createdBy', canSeeAnswers(req.user) ? 'name email' : 'name')
        .populate('courseId', 'title')
        .populate('lessonId', 'title');
    
    if (!test) {
        return res.status(404).json({
            success: false,
            message: 'Test topilmadi'
        });
    }

    res.status(200).json({
        success: true,
        test: canSeeAnswers(req.user) ? test : stripAnswer(test)
    });
});

// @desc    Yangi test yaratish
// @route   POST /api/tests
// @access  Private (Teacher, Admin)
const createTest = asyncHandler(async (req, res) => {
    const {
        title,
        question,
        code,
        options,
        correctAnswer,
        explanation,
        difficulty,
        category,
        courseId,
        lessonId,
        order
    } = req.body;
    
    // Validatsiya
    if (!title || !question || !options || correctAnswer === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Iltimos, barcha majburiy maydonlarni to\'ldiring (title, question, options, correctAnswer)'
        });
    }
    
    if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Kamida 2 ta variant bo\'lishi kerak'
        });
    }
    
    if (correctAnswer < 0 || correctAnswer >= options.length) {
        return res.status(400).json({
            success: false,
            message: 'To\'g\'ri javob indeksi noto\'g\'ri'
        });
    }
    
    // Test yaratish
    const test = await Test.create({
        title,
        question,
        code: code || '',
        options,
        correctAnswer,
        explanation: explanation || '',
        difficulty: difficulty || 'medium',
        category: category || 'general',
        courseId: courseId || null,
        lessonId: lessonId || null,
        createdBy: req.user._id,
        order: order || 0
    });
    
    res.status(201).json({
        success: true,
        message: 'Test muvaffaqiyatli yaratildi',
        test
    });
});

// @desc    Testni yangilash
// @route   PUT /api/tests/:id
// @access  Private (Teacher, Admin - faqat o'z testini)
const updateTest = asyncHandler(async (req, res) => {
    let test = await Test.findById(req.params.id);
    
    if (!test) {
        return res.status(404).json({
            success: false,
            message: 'Test topilmadi'
        });
    }
    
    // Faqat o'qituvchi yoki admin o'z testini yangilay oladi
    if (test.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Siz bu testni yangilash huquqiga ega emassiz'
        });
    }
    
    const {
        title,
        question,
        code,
        options,
        correctAnswer,
        explanation,
        difficulty,
        category,
        courseId,
        lessonId,
        isActive,
        order
    } = req.body;
    
    // Validatsiya
    if (options && (!Array.isArray(options) || options.length < 2)) {
        return res.status(400).json({
            success: false,
            message: 'Kamida 2 ta variant bo\'lishi kerak'
        });
    }
    
    const finalOptions = options || test.options;
    const finalCorrectAnswer = correctAnswer !== undefined ? correctAnswer : test.correctAnswer;
    
    if (finalCorrectAnswer < 0 || finalCorrectAnswer >= finalOptions.length) {
        return res.status(400).json({
            success: false,
            message: 'To\'g\'ri javob indeksi noto\'g\'ri'
        });
    }
    
    // Yangilash (yuborilgan bo'sh qiymatlar maydonni tozalaydi)
    test = await Test.findByIdAndUpdate(
        req.params.id,
        {
            title: title || test.title,
            question: question || test.question,
            code: code !== undefined ? (code || '') : test.code,
            options: finalOptions,
            correctAnswer: finalCorrectAnswer,
            explanation: explanation !== undefined ? (explanation || '') : test.explanation,
            difficulty: difficulty || test.difficulty,
            category: category !== undefined ? (category || 'general') : test.category,
            courseId: courseId !== undefined ? (courseId || null) : test.courseId,
            lessonId: lessonId !== undefined ? (lessonId || null) : test.lessonId,
            isActive: isActive !== undefined ? isActive : test.isActive,
            order: order !== undefined ? order : test.order
        },
        {
            new: true,
            runValidators: true
        }
    );
    
    res.status(200).json({
        success: true,
        message: 'Test muvaffaqiyatli yangilandi',
        test
    });
});

// @desc    Testni o'chirish
// @route   DELETE /api/tests/:id
// @access  Private (Teacher, Admin - faqat o'z testini)
const deleteTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
        return res.status(404).json({
            success: false,
            message: 'Test topilmadi'
        });
    }
    
    // Faqat o'qituvchi yoki admin o'z testini o'chira oladi
    if (test.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Siz bu testni o\'chirish huquqiga ega emassiz'
        });
    }
    
    await test.deleteOne();
    
    res.status(200).json({
        success: true,
        message: 'Test muvaffaqiyatli o\'chirildi'
    });
});

// @desc    Test javobini tekshirish
// @route   POST /api/tests/:id/check
// @access  Private
const checkTestAnswer = asyncHandler(async (req, res) => {
    const { answerIndex } = req.body || {};
    const userId = req.user._id;
    const test = await Test.findById(req.params.id);

    // Talaba faol bo'lmagan testga javob bera olmaydi
    if (!test || (!test.isActive && !canSeeAnswers(req.user))) {
        return res.status(404).json({
            success: false,
            message: 'Test topilmadi'
        });
    }
    
    if (answerIndex === undefined || answerIndex === null) {
        return res.status(400).json({
            success: false,
            message: 'Javob indeksi kiritilishi shart'
        });
    }
    
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= test.options.length) {
        return res.status(400).json({
            success: false,
            message: 'Javob indeksi noto\'g\'ri'
        });
    }

    const isCorrect = answerIndex === test.correctAnswer;

    // Ball hisoblash (easy: 1, medium: 2, hard: 3)
    const scoreMap = { easy: 1, medium: 2, hard: 3 };
    const score = isCorrect ? scoreMap[test.difficulty] || 1 : 0;

    // Faqat birinchi urinish saqlanadi va ballga hisoblanadi.
    // Qayta urinish (javob ochilgandan keyin) natijani o'zgartirmaydi.
    let previous = await TestResult.findOne({ student: userId, test: test._id }).select('_id');
    if (!previous) {
        try {
            await TestResult.create({
                student: userId,
                test: test._id,
                selectedAnswer: answerIndex,
                isCorrect: isCorrect,
                score: score,
                lesson: test.lessonId || null,
                course: test.courseId || null
            });
        } catch (err) {
            // Parallel so'rov natijani allaqachon yozgan (unique index)
            if (err.code !== 11000) throw err;
            previous = true;
        }
    }
    const firstAttempt = !previous;

    res.status(200).json({
        success: true,
        isCorrect,
        correctAnswer: test.correctAnswer,
        explanation: test.explanation,
        // Shu urinish uchun berilgan ball (qayta urinishda 0)
        score: firstAttempt ? score : 0,
        firstAttempt
    });
});

module.exports = {
    getTests,
    getTest,
    createTest,
    updateTest,
    deleteTest,
    checkTestAnswer
};
