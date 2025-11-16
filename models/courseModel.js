const mongoose = require('mongoose');

const courseSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, "Kurs nomini kiritish majburiy"],
        unique: true
    },
    description: {
        type: String,
        required: [true, "Kurs tavsifini kiritish majburiy"]
    },
    price: {
        type: Number,
        required: [true, "Kurs narxini kiritish majburiy"],
        default: 0
    },
    // Kim tomonidan yaratilganligi (O'qituvchi IDsi)
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // User modeliga ulanish
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;