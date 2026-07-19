const mongoose = require('mongoose');

// Imtihon ichidagi bitta savol
const examQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Savol matni kiritilishi shart'],
        trim: true,
    },
    code: {
        type: String,
        default: '',
        trim: true,
    },
    options: {
        type: [String],
        required: [true, 'Kamida 2 ta variant kerak'],
        validate: {
            validator: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 6,
            message: 'Variantlar soni 2 dan 6 gacha bo\'lishi kerak',
        },
    },
    correctAnswer: {
        type: Number,
        required: [true, 'To\'g\'ri javob indeksi kiritilishi shart'],
        min: 0,
    },
    explanation: {
        type: String,
        default: '',
        trim: true,
    },
}, { _id: true });

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Imtihon sarlavhasi kiritilishi shart'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    category: {
        type: String,
        default: 'HTML/CSS',
        trim: true,
    },
    // Daraja: oson / o'rta / pro
    level: {
        type: String,
        enum: ['easy', 'middle', 'pro'],
        default: 'easy',
    },
    questions: {
        type: [examQuestionSchema],
        validate: {
            validator: (v) => Array.isArray(v) && v.length >= 1,
            message: 'Imtihonda kamida 1 ta savol bo\'lishi kerak',
        },
    },
    // Imtihon davomiyligi (daqiqa)
    durationMinutes: {
        type: Number,
        default: 15,
        min: 1,
    },
    // O'tish uchun kerakli foiz
    passScore: {
        type: Number,
        default: 60,
        min: 0,
        max: 100,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

examSchema.index({ level: 1, isActive: 1 });
examSchema.index({ createdBy: 1 });

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;
