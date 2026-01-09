const Test = require('../models/testModel');
const TestResult = require('../models/testResultModel');
const asyncHandler = require('express-async-handler');

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
    
    if (createdBy) {
        query.createdBy = createdBy;
    }
    
    const tests = await Test.find(query)
        .populate('createdBy', 'name email')
        .populate('courseId', 'title')
        .populate('lessonId', 'title')
        .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
        success: true,
        count: tests.length,
        tests
    });
});

// @desc    Bitta testni olish
// @route   GET /api/tests/:id
// @access  Private
const getTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id)
        .populate('createdBy', 'name email')
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
        test
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
            message: 'Siz bu testni yangilash huquqiga egasiz'
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
    
    // Yangilash
    test = await Test.findByIdAndUpdate(
        req.params.id,
        {
            title: title || test.title,
            question: question || test.question,
            code: code !== undefined ? code : test.code,
            options: finalOptions,
            correctAnswer: finalCorrectAnswer,
            explanation: explanation !== undefined ? explanation : test.explanation,
            difficulty: difficulty || test.difficulty,
            category: category || test.category,
            courseId: courseId !== undefined ? courseId : test.courseId,
            lessonId: lessonId !== undefined ? lessonId : test.lessonId,
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
            message: 'Siz bu testni o\'chirish huquqiga egasiz'
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
    const { answerIndex } = req.body;
    const userId = req.user._id;
    const test = await Test.findById(req.params.id);
    
    if (!test) {
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
    
    const isCorrect = answerIndex === test.correctAnswer;
    
    // Ball hisoblash (easy: 1, medium: 2, hard: 3)
    const scoreMap = { easy: 1, medium: 2, hard: 3 };
    const score = isCorrect ? scoreMap[test.difficulty] || 1 : 0;
    
    // Natijani saqlash yoki yangilash
    await TestResult.findOneAndUpdate(
        { student: userId, test: test._id },
        {
            student: userId,
            test: test._id,
            selectedAnswer: answerIndex,
            isCorrect: isCorrect,
            score: score,
            lesson: test.lessonId || null,
            course: test.courseId || null
        },
        { upsert: true, new: true }
    );
    
    res.status(200).json({
        success: true,
        isCorrect,
        correctAnswer: test.correctAnswer,
        explanation: test.explanation,
        score: score
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
