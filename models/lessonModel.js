// edu-web-backend/models/lessonModel.js

const mongoose = require('mongoose');

const lessonSchema = mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course', // Qaysi kursga tegishli ekanligi
    },
    title: {
        type: String,
        required: [true, 'Dars nomi talab qilinadi'],
        trim: true,
    },
    order: {
        type: Number,
        required: [true, 'Dars tartib raqami talab qilinadi'],
        min: 1,
    },

    // =========================================================
    // YANGI TUZILISH: Hamma darslar barcha kontent turlarini o'z ichiga oladi
    // =========================================================
    
    videoUrl: {
        type: String,
        required: [true, 'Video qo\'llanma linki talab qilinadi'],
    },
    documentationUrl: {
        type: String,
        required: [true, 'Dars dokumentatsiyasi linki talab qilinadi'],
    },
    taskFileUrl: {
        type: String,
        required: [true, 'Vazifa fayli linki talab qilinadi'], // Vazifa faylining manzili
    },
    taskDescription: {
        type: String, // Vazifaning qisqa tavsifi (majburiy)
        required: [true, 'Vazifa tavsifi talab qilinadi'],
    }
    
    // Eslatma: Eski contentType va contentUrl maydonlari olib tashlandi,
    // chunki ular endi foydalanuvchi talablariga mos kelmaydi.
    
}, {
    timestamps: true,
});

// Bir kurs ichida dars tartib raqami (order) unikal bo'lishi kerak
lessonSchema.index({ course: 1, order: 1 }, { unique: true });

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;