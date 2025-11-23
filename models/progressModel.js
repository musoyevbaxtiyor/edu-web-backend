// edu-web-backend/models/progressModel.js

const mongoose = require('mongoose');

const progressSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Kimning progressi
    },
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Lesson', // Qaysi dars
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course', // Qaysi kurs
    },
    status: {
        type: String,
        enum: ['unlocked', 'started', 'submitted', 'completed'],
        default: 'unlocked', // Keyingi dars default holatda ochiq bo'ladi
    },
    submission: {
        type: String, // Vazifa javobi (agar mavjud bo'lsa)
    },
    submittedAt: {
        type: Date,
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Kim tomonidan tasdiqlangan (Teacher/Admin)
    }
}, {
    timestamps: true,
});

// Bir foydalanuvchi bir dars uchun faqat bitta progress yozuviga ega bo'lishi kerak
progressSchema.index({ user: 1, lesson: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;