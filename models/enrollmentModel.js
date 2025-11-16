const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    // Ro'yxatdan o'tgan Talaba (User) IDsi
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // 'User' modeliga bog'lanadi
        required: true,
    },
    
    // Ro'yxatdan o'tilgan Kurs IDsi
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course', // 'Course' modeliga bog'lanadi
        required: true,
    },
    
    // Ro'yxatdan o'tish sanasi
    enrolledAt: {
        type: Date,
        default: Date.now,
    },
    
    // To'lov holati (kelajakda to'lov tizimi qo'shilganda foydali)
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Completed', // Hozircha barcha ro'yxatdan o'tishlar "Completed" deb hisoblanadi
    },

    // Qo'shimcha holat (masalan, kursni tugatganligi)
    completionStatus: {
        type: String,
        enum: ['InProgress', 'Completed'],
        default: 'InProgress',
    }
}, { timestamps: true });

// Har bir talaba bitta kursga faqat bir marta ro'yxatdan o'tishi uchun indeks qo'shamiz
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;