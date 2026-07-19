const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Exam = require('../models/examModel');
const ExamResult = require('../models/examResultModel');

// Savoldan to'g'ri javob va izohni olib tashlash (talaba topshirayotganda ko'rmasligi uchun)
function stripAnswers(exam) {
    const obj = exam.toObject ? exam.toObject() : exam;
    return {
        ...obj,
        questions: (obj.questions || []).map((q) => ({
            _id: q._id,
            question: q.question,
            code: q.code,
            options: q.options,
        })),
    };
}

// @desc    Imtihonlar ro'yxati (metama'lumot, savolsiz)
// @route   GET /api/exams?level=&category=&mine=true
// @access  Private
const getExams = asyncHandler(async (req, res) => {
    const { level, category, mine } = req.query;
    const query = {};

    if (level) query.level = level;
    if (category) query.category = category;

    // Oddiy foydalanuvchilar faqat faol imtihonlarni ko'radi
    if (mine === 'true' && (req.user.role === 'teacher' || req.user.role === 'admin')) {
        if (req.user.role === 'teacher') query.createdBy = req.user._id;
    } else {
        query.isActive = true;
    }

    const exams = await Exam.find(query)
        .populate('createdBy', 'name')
        .sort({ level: 1, createdAt: -1 })
        .lean();

    // Har bir imtihon uchun faqat metama'lumot (savollar soni)
    const list = exams.map((e) => ({
        _id: e._id,
        title: e.title,
        description: e.description,
        category: e.category,
        level: e.level,
        questionCount: (e.questions || []).length,
        durationMinutes: e.durationMinutes,
        passScore: e.passScore,
        isActive: e.isActive,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
    }));

    res.status(200).json({ success: true, count: list.length, exams: list });
});

// @desc    Bitta imtihonni olish (topshirish yoki tahrirlash uchun)
// @route   GET /api/exams/:id
// @access  Private
const getExam = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400);
        throw new Error('Noto\'g\'ri imtihon ID formati.');
    }

    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name');
    if (!exam) {
        res.status(404);
        throw new Error('Imtihon topilmadi.');
    }

    const isOwner = exam.createdBy && exam.createdBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Egasi/admin — to'liq (tahrirlash uchun), boshqalar — javoblarsiz (topshirish uchun)
    if (isOwner || isAdmin) {
        return res.status(200).json({ success: true, exam });
    }
    res.status(200).json({ success: true, exam: stripAnswers(exam) });
});

// @desc    Yangi imtihon yaratish
// @route   POST /api/exams
// @access  Private (Teacher/Admin)
const createExam = asyncHandler(async (req, res) => {
    const { title, description, category, level, questions, durationMinutes, passScore, isActive } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
        res.status(400);
        throw new Error('Sarlavha va kamida 1 ta savol kiritilishi shart.');
    }

    // Har bir savolni tekshirish
    for (const [i, q] of questions.entries()) {
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
            res.status(400);
            throw new Error(`${i + 1}-savolda matn va kamida 2 ta variant bo'lishi kerak.`);
        }
        if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
            res.status(400);
            throw new Error(`${i + 1}-savolda to'g'ri javob indeksi noto'g'ri.`);
        }
    }

    const exam = await Exam.create({
        title,
        description: description || '',
        category: category || 'HTML/CSS',
        level: level || 'easy',
        questions,
        durationMinutes: durationMinutes || 15,
        passScore: passScore != null ? passScore : 60,
        isActive: isActive != null ? isActive : true,
        createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Imtihon yaratildi.', exam });
});

// @desc    Imtihonni yangilash
// @route   PUT /api/exams/:id
// @access  Private (Owner/Admin)
const updateExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Imtihon topilmadi.');
    }
    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Siz faqat o\'zingiz yaratgan imtihonni tahrirlashingiz mumkin.');
    }

    const fields = ['title', 'description', 'category', 'level', 'questions', 'durationMinutes', 'passScore', 'isActive'];
    for (const f of fields) {
        if (req.body[f] !== undefined) exam[f] = req.body[f];
    }
    await exam.save();

    res.status(200).json({ success: true, message: 'Imtihon yangilandi.', exam });
});

// @desc    Imtihonni o'chirish
// @route   DELETE /api/exams/:id
// @access  Private (Owner/Admin)
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Imtihon topilmadi.');
    }
    if (req.user.role !== 'admin' && exam.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Siz faqat o\'zingiz yaratgan imtihonni o\'chirishingiz mumkin.');
    }

    await ExamResult.deleteMany({ exam: exam._id });
    await exam.deleteOne();

    res.status(200).json({ success: true, message: 'Imtihon o\'chirildi.' });
});

// @desc    Imtihonni topshirish va baholash
// @route   POST /api/exams/:id/submit
// @access  Private
const submitExam = asyncHandler(async (req, res) => {
    const { answers } = req.body; // [idx, idx, ...]
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
        res.status(404);
        throw new Error('Imtihon topilmadi.');
    }

    const questions = exam.questions || [];
    const given = Array.isArray(answers) ? answers : [];

    let correctCount = 0;
    const review = questions.map((q, i) => {
        const your = given[i] != null ? given[i] : -1;
        const isCorrect = your === q.correctAnswer;
        if (isCorrect) correctCount += 1;
        return {
            questionIndex: i,
            yourAnswer: your,
            correctAnswer: q.correctAnswer,
            isCorrect,
            explanation: q.explanation || '',
        };
    });

    const totalQuestions = questions.length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = scorePercent >= (exam.passScore || 60);

    await ExamResult.create({
        student: req.user._id,
        exam: exam._id,
        answers: given,
        correctCount,
        totalQuestions,
        scorePercent,
        passed,
    });

    res.status(200).json({
        success: true,
        correctCount,
        totalQuestions,
        scorePercent,
        passed,
        passScore: exam.passScore,
        review,
    });
});

// @desc    Talabaning imtihon natijalari
// @route   GET /api/exams/my/results
// @access  Private
const getMyExamResults = asyncHandler(async (req, res) => {
    const results = await ExamResult.find({ student: req.user._id })
        .populate('exam', 'title level category')
        .sort({ createdAt: -1 })
        .lean();

    // Har bir imtihon uchun eng yaxshi natija
    const bestByExam = {};
    for (const r of results) {
        if (!r.exam) continue;
        const key = r.exam._id.toString();
        if (!bestByExam[key] || r.scorePercent > bestByExam[key].scorePercent) {
            bestByExam[key] = r;
        }
    }

    res.status(200).json({
        success: true,
        results,
        best: bestByExam,
    });
});

module.exports = {
    getExams,
    getExam,
    createExam,
    updateExam,
    deleteExam,
    submitExam,
    getMyExamResults,
};
