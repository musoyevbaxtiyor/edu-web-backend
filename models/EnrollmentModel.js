// edu-web-backend/models/EnrollmentModel.js

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
    
    // To'lov holati
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Completed', 
    },

    // Qo'shimcha holat (masalan, kursni tugatganligi)
    completionStatus: {
        type: String,
        enum: ['InProgress', 'Completed'],
        default: 'InProgress',
    }
}, { timestamps: true });

// Har bir talaba bitta kursga faqat bir marta ro'yxatdan o'tishi uchun indeks
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// MUHIM TO'G'RILASH: Model mavjudligini tekshirish
// Agar 'Enrollment' nomli model allaqachon mavjud bo'lsa, o'shani ishlatadi.
// Agar mavjud bo'lmasa, yangisini yaratadi. Bu OverwriteModelError ni oldini oladi.
const Enrollment = mongoose.models.Enrollment 
    ? mongoose.models.Enrollment 
    : mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;