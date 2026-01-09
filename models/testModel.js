const mongoose = require('mongoose');

const testSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Test sarlavhasi kiritilishi shart'],
        trim: true
    },
    question: {
        type: String,
        required: [true, 'Savol matni kiritilishi shart'],
        trim: true
    },
    code: {
        type: String,
        default: '',
        trim: true
    },
    options: {
        type: [String],
        required: [true, 'Kamida 2 ta variant bo\'lishi kerak'],
        validate: {
            validator: function(v) {
                return v && v.length >= 2 && v.length <= 6;
            },
            message: 'Variantlar soni 2 dan 6 gacha bo\'lishi kerak'
        }
    },
    correctAnswer: {
        type: Number,
        required: [true, 'To\'g\'ri javob indeksi kiritilishi shart'],
        validate: {
            validator: function(v) {
                return v >= 0 && v < this.options.length;
            },
            message: 'To\'g\'ri javob indeksi variantlar sonidan kichik bo\'lishi kerak'
        }
    },
    explanation: {
        type: String,
        default: '',
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    category: {
        type: String,
        default: 'general',
        trim: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexlar
testSchema.index({ courseId: 1, order: 1 });
testSchema.index({ lessonId: 1 });
testSchema.index({ createdBy: 1 });
testSchema.index({ isActive: 1 });

const Test = mongoose.model('Test', testSchema);
module.exports = Test;
