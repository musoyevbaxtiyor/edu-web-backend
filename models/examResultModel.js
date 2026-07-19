const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    // Har bir savol uchun tanlangan variant indeksi (-1 = javob berilmagan)
    answers: {
        type: [Number],
        default: [],
    },
    correctCount: {
        type: Number,
        default: 0,
    },
    totalQuestions: {
        type: Number,
        default: 0,
    },
    scorePercent: {
        type: Number,
        default: 0,
    },
    passed: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

examResultSchema.index({ student: 1, exam: 1 });

const ExamResult = mongoose.model('ExamResult', examResultSchema);
module.exports = ExamResult;
