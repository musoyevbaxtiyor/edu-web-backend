const mongoose = require('mongoose');

// Amaliy tasklar bo'limi uchun kategoriyalar va darajalar
const PRACTICE_CATEGORIES = ['html', 'css', 'figma', 'js'];
const PRACTICE_LEVELS = ['easy', 'middle', 'pro'];

// Amaliy vazifa (kurs darslaridan ALOHIDA — qo'shimcha tayyorlanish uchun)
const practiceTaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Task sarlavhasi kiritilishi shart'],
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    // Namuna / manba havolasi (ixtiyoriy — masalan Figma dizayn yoki topshiriq matni)
    resourceUrl: {
        type: String,
        default: '',
        trim: true,
    },
    category: {
        type: String,
        enum: PRACTICE_CATEGORIES,
        required: [true, 'Kategoriya kiritilishi shart'],
    },
    level: {
        type: String,
        enum: PRACTICE_LEVELS,
        default: 'easy',
    },
    // Daraja ichidagi tartib raqami (1, 2, 3, ...)
    order: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

practiceTaskSchema.index({ category: 1, level: 1, order: 1 });
practiceTaskSchema.index({ createdBy: 1 });

const PracticeTask = mongoose.model('PracticeTask', practiceTaskSchema);

module.exports = PracticeTask;
module.exports.PRACTICE_CATEGORIES = PRACTICE_CATEGORIES;
module.exports.PRACTICE_LEVELS = PRACTICE_LEVELS;
