const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    // Vazifani topshirgan foydalanuvchi
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, "Topshiriq egasi bo'lishi shart."]
    },
    // Qaysi darsga topshirilgani
    lesson: {
        type: mongoose.Schema.ObjectId,
        ref: 'Lesson',
        required: [true, "Dars IDsi bo'lishi shart."]
    },
    // Topshiriq matni (link yoki qisqa izoh)
    submissionText: {
        type: String,
        required: [true, "Topshiriq matni yoki havolasi bo'lishi shart."]
    },
    // Topshiriq statusi (Tekshirish/Tasdiqlash mantiqi uchun)
    status: {
        type: String,
        enum: ['submitted', 'in_review', 'approved', 'rejected'],
        default: 'submitted'
    },
    // O'qituvchining bahosi
    grade: {
        type: Number,
        min: 0,
        max: 100
    },
    // O'qituvchining fikri
    feedback: String,
    
}, {
    timestamps: true 
});

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;