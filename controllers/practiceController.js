const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const PracticeTask = require('../models/practiceTaskModel');
const PracticeSubmission = require('../models/practiceSubmissionModel');

const CATEGORIES = PracticeTask.PRACTICE_CATEGORIES;
const LEVELS = PracticeTask.PRACTICE_LEVELS;

const isStaff = (user) => user.role === 'teacher' || user.role === 'admin';

/* ============================================================
   O'QUVCHI TOMONI
   ============================================================ */

// @desc    Umumiy progress: kategoriyalar + darajalar bo'yicha (joriy o'quvchi uchun)
// @route   GET /api/practice/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    const tasks = await PracticeTask.find({ isActive: true }).select('category level').lean();

    const approved = await PracticeSubmission.find({ student: studentId, status: 'approved' })
        .select('task').lean();
    const completed = new Set(approved.map((s) => s.task.toString()));

    // Tuzilma tayyorlash
    const byCat = {};
    for (const c of CATEGORIES) {
        byCat[c] = { category: c, total: 0, completed: 0, levels: {} };
        for (const l of LEVELS) byCat[c].levels[l] = { level: l, total: 0, completed: 0 };
    }

    for (const t of tasks) {
        const c = byCat[t.category];
        if (!c) continue;
        c.total += 1;
        const lv = c.levels[t.level];
        if (lv) lv.total += 1;
        if (completed.has(t._id.toString())) {
            c.completed += 1;
            if (lv) lv.completed += 1;
        }
    }

    const categories = CATEGORIES.map((c) => ({
        category: c,
        total: byCat[c].total,
        completed: byCat[c].completed,
        levels: LEVELS.map((l) => byCat[c].levels[l]),
    }));

    res.status(200).json({ success: true, categories });
});

// @desc    Bitta kategoriya+daraja bo'yicha tasklar ro'yxati (o'quvchi topshirig'i bilan)
// @route   GET /api/practice/tasks?category=&level=
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
    const { category, level } = req.query;
    if (!category || !CATEGORIES.includes(category)) {
        res.status(400);
        throw new Error("Noto'g'ri kategoriya.");
    }
    if (!level || !LEVELS.includes(level)) {
        res.status(400);
        throw new Error("Noto'g'ri daraja.");
    }

    const query = { category, level };
    if (!isStaff(req.user)) query.isActive = true;

    const tasks = await PracticeTask.find(query).sort({ order: 1, createdAt: 1 }).lean();

    // Joriy o'quvchining shu tasklar bo'yicha topshiriqlari
    const taskIds = tasks.map((t) => t._id);
    const subs = await PracticeSubmission.find({
        student: req.user._id,
        task: { $in: taskIds },
    }).lean();

    const subByTask = {};
    for (const s of subs) subByTask[s.task.toString()] = s;

    const out = tasks.map((t) => {
        const s = subByTask[t._id.toString()];
        return {
            ...t,
            mySubmission: s
                ? {
                      _id: s._id,
                      status: s.status,
                      grade: s.grade,
                      feedback: s.feedback,
                      submissionLink: s.submissionLink,
                      submissionFile: s.submissionFile,
                      submissionComment: s.submissionComment,
                      updatedAt: s.updatedAt,
                  }
                : null,
        };
    });

    res.status(200).json({ success: true, tasks: out });
});

// @desc    Taskni topshirish (havola va/yoki fayl) — o'qituvchiga kelib tushadi
// @route   POST /api/practice/submit
// @access  Private (Student)
const submitTask = asyncHandler(async (req, res) => {
    const { taskId, submissionLink, submissionComment } = req.body;

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
        res.status(400);
        throw new Error('Task IDsi kiritilishi shart.');
    }

    const task = await PracticeTask.findById(taskId);
    if (!task || !task.isActive) {
        res.status(404);
        throw new Error('Task topilmadi yoki faol emas.');
    }

    const link = (submissionLink || '').trim();
    const file = req.file ? `/uploads/practice/${req.file.filename}` : '';
    const comment = (submissionComment || '').trim();

    if (!link && !file) {
        res.status(400);
        throw new Error('Havola yoki fayl kiritilishi shart.');
    }

    let submission = await PracticeSubmission.findOne({ student: req.user._id, task: taskId });

    if (submission) {
        // Qayta topshirish — bahoni tozalab, holatni "submitted" ga qaytaramiz
        submission.status = 'submitted';
        submission.submissionLink = link;
        if (file) submission.submissionFile = file;
        submission.submissionComment = comment;
        submission.grade = undefined;
        submission.feedback = '';
        submission.reviewedBy = undefined;
        await submission.save();
        return res.status(200).json({ success: true, message: 'Task qayta topshirildi.', submission });
    }

    submission = await PracticeSubmission.create({
        student: req.user._id,
        task: taskId,
        submissionLink: link,
        submissionFile: file,
        submissionComment: comment,
        status: 'submitted',
    });

    res.status(201).json({ success: true, message: 'Task topshirildi. O\'qituvchi tekshiradi.', submission });
});

// @desc    O'quvchining barcha amaliy topshiriqlari
// @route   GET /api/practice/my/submissions
// @access  Private (Student)
const getMySubmissions = asyncHandler(async (req, res) => {
    const submissions = await PracticeSubmission.find({ student: req.user._id })
        .populate('task', 'title category level order')
        .sort('-updatedAt')
        .lean();

    res.status(200).json({ success: true, submissions, count: submissions.length });
});

/* ============================================================
   O'QITUVCHI / ADMIN TOMONI
   ============================================================ */

// @desc    O'qituvchi tasklari (boshqaruv uchun)
// @route   GET /api/practice/manage/tasks?category=&level=
// @access  Private (Teacher/Admin)
const getManageTasks = asyncHandler(async (req, res) => {
    const { category, level } = req.query;
    const query = {};
    if (req.user.role === 'teacher') query.createdBy = req.user._id; // admin — barchasi
    if (category && CATEGORIES.includes(category)) query.category = category;
    if (level && LEVELS.includes(level)) query.level = level;

    const tasks = await PracticeTask.find(query)
        .sort({ category: 1, level: 1, order: 1 })
        .lean();

    // Har taskka nechta topshiriq kelganini qo'shamiz
    const taskIds = tasks.map((t) => t._id);
    const counts = await PracticeSubmission.aggregate([
        { $match: { task: { $in: taskIds } } },
        { $group: { _id: '$task', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'in_review']] }, 1, 0] } } } },
    ]);
    const countMap = {};
    for (const c of counts) countMap[c._id.toString()] = { total: c.total, pending: c.pending };

    const out = tasks.map((t) => ({
        ...t,
        submissionCount: countMap[t._id.toString()]?.total || 0,
        pendingCount: countMap[t._id.toString()]?.pending || 0,
    }));

    res.status(200).json({ success: true, tasks: out, count: out.length });
});

// @desc    Yangi amaliy task yaratish
// @route   POST /api/practice/tasks
// @access  Private (Teacher/Admin)
const createTask = asyncHandler(async (req, res) => {
    const { title, description, category, level, order, resourceUrl, isActive } = req.body;

    if (!title || !title.trim()) {
        res.status(400);
        throw new Error('Task sarlavhasi kiritilishi shart.');
    }
    if (!category || !CATEGORIES.includes(category)) {
        res.status(400);
        throw new Error("Kategoriya noto'g'ri (html/css/figma/js).");
    }
    if (level && !LEVELS.includes(level)) {
        res.status(400);
        throw new Error("Daraja noto'g'ri (easy/middle/pro).");
    }

    // order berilmasa — shu kategoriya+darajadagi oxirgi + 1
    let ord = Number(order);
    if (!ord || Number.isNaN(ord)) {
        const last = await PracticeTask.findOne({ category, level: level || 'easy' }).sort({ order: -1 }).select('order');
        ord = (last?.order || 0) + 1;
    }

    const task = await PracticeTask.create({
        title: title.trim(),
        description: (description || '').trim(),
        resourceUrl: (resourceUrl || '').trim(),
        category,
        level: level || 'easy',
        order: ord,
        isActive: isActive != null ? isActive : true,
        createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Task yaratildi.', task });
});

// @desc    Taskni yangilash
// @route   PUT /api/practice/tasks/:id
// @access  Private (Owner/Admin)
const updateTask = asyncHandler(async (req, res) => {
    const task = await PracticeTask.findById(req.params.id);
    if (!task) {
        res.status(404);
        throw new Error('Task topilmadi.');
    }
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Siz faqat o'zingiz qo'shgan taskni tahrirlashingiz mumkin.");
    }

    const { title, description, category, level, order, resourceUrl, isActive } = req.body;
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = (description || '').trim();
    if (resourceUrl !== undefined) task.resourceUrl = (resourceUrl || '').trim();
    if (category !== undefined && CATEGORIES.includes(category)) task.category = category;
    if (level !== undefined && LEVELS.includes(level)) task.level = level;
    if (order !== undefined) task.order = Number(order) || 0;
    if (isActive !== undefined) task.isActive = isActive;

    await task.save();
    res.status(200).json({ success: true, message: 'Task yangilandi.', task });
});

// @desc    Taskni o'chirish (topshiriqlari bilan)
// @route   DELETE /api/practice/tasks/:id
// @access  Private (Owner/Admin)
const deleteTask = asyncHandler(async (req, res) => {
    const task = await PracticeTask.findById(req.params.id);
    if (!task) {
        res.status(404);
        throw new Error('Task topilmadi.');
    }
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Siz faqat o'zingiz qo'shgan taskni o'chirishingiz mumkin.");
    }

    await PracticeSubmission.deleteMany({ task: task._id });
    await task.deleteOne();

    res.status(200).json({ success: true, message: "Task o'chirildi." });
});

// @desc    O'qituvchiga kelib tushgan topshiriqlar (baholash uchun)
// @route   GET /api/practice/manage/submissions?status=pending|all
// @access  Private (Teacher/Admin)
const getManageSubmissions = asyncHandler(async (req, res) => {
    const { status } = req.query;

    // O'qituvchi faqat o'zi qo'shgan tasklar topshiriqlarini ko'radi (admin — barchasi)
    const taskFilter = {};
    if (req.user.role === 'teacher') taskFilter.createdBy = req.user._id;
    const tasks = await PracticeTask.find(taskFilter).select('_id').lean();
    const taskIds = tasks.map((t) => t._id);

    const query = { task: { $in: taskIds } };
    if (status === 'pending') query.status = { $in: ['submitted', 'in_review'] };

    const submissions = await PracticeSubmission.find(query)
        .populate('student', 'name email')
        .populate('task', 'title category level order')
        .sort('-createdAt')
        .lean();

    res.status(200).json({ success: true, submissions, count: submissions.length });
});

// @desc    Topshiriqni baholash (tasdiqlash/rad etish) — ball reytingga qo'shiladi
// @route   PUT /api/practice/submissions/:id/review
// @access  Private (Teacher/Admin)
const reviewSubmission = asyncHandler(async (req, res) => {
    const { status, grade, feedback } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error("Status 'approved' yoki 'rejected' bo'lishi kerak.");
    }

    const submission = await PracticeSubmission.findById(req.params.id).populate('task', 'createdBy');
    if (!submission) {
        res.status(404);
        throw new Error('Topshiriq topilmadi.');
    }

    // O'qituvchi faqat o'z tasklari topshiriqlarini baholaydi
    if (req.user.role === 'teacher' && submission.task && submission.task.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Bu topshiriqni baholash huquqingiz yo'q.");
    }

    submission.status = status;
    submission.feedback = (feedback || '').trim();
    submission.reviewedBy = req.user._id;

    if (status === 'approved') {
        const g = Math.max(0, Math.min(100, parseInt(grade, 10) || 0));
        submission.grade = g;
    } else {
        submission.grade = undefined;
    }

    await submission.save();

    res.status(200).json({
        success: true,
        message: status === 'approved'
            ? `Tasdiqlandi. Ball: ${submission.grade}/100 (reytingga qo'shildi).`
            : 'Rad etildi. O\'quvchi qayta topshirishi mumkin.',
        submission,
    });
});

module.exports = {
    getOverview,
    getTasks,
    submitTask,
    getMySubmissions,
    getManageTasks,
    createTask,
    updateTask,
    deleteTask,
    getManageSubmissions,
    reviewSubmission,
};
