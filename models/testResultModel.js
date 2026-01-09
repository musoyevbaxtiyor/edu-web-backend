const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    // Test yechgan student
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Qaysi test
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    // Tanlangan javob indeksi
    selectedAnswer: {
        type: Number,
        required: true
    },
    // To'g'ri javob berildimi
    isCorrect: {
        type: Boolean,
        required: true
    },
    // Ball (easy: 1, medium: 2, hard: 3)
    score: {
        type: Number,
        default: 0
    },
    // Qaysi darsdan (agar mavjud bo'lsa)
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        default: null
    },
    // Qaysi kursdan (agar mavjud bo'lsa)
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    }
}, {
    timestamps: true
});

// Har bir student bir testni faqat bir marta yechishi kerak (yoki ko'p marta yechsa ham, faqat oxirgisi saqlanadi)
testResultSchema.index({ student: 1, test: 1 }, { unique: true });

const TestResult = mongoose.model('TestResult', testResultSchema);

module.exports = TestResult;
