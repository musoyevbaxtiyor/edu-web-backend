const mongoose = require('mongoose');

// O'quvchining amaliy taskka topshirig'i
const practiceSubmissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PracticeTask',
        required: true,
    },
    // Havola (GitHub / CodePen / Figma / jonli demo) — ixtiyoriy
    submissionLink: {
        type: String,
        default: '',
        trim: true,
    },
    // Yuklangan fayl manzili (/uploads/practice/...) — ixtiyoriy
    submissionFile: {
        type: String,
        default: '',
    },
    // O'quvchining qisqa izohi
    submissionComment: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: ['submitted', 'in_review', 'approved', 'rejected'],
        default: 'submitted',
    },
    // O'qituvchining bahosi (0-100). Reytingga shu ball qo'shiladi.
    grade: {
        type: Number,
        min: 0,
        max: 100,
    },
    feedback: {
        type: String,
        default: '',
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

// Har o'quvchida bitta taskka bitta topshiriq (upsert)
practiceSubmissionSchema.index({ student: 1, task: 1 }, { unique: true });
practiceSubmissionSchema.index({ status: 1 });

const PracticeSubmission = mongoose.model('PracticeSubmission', practiceSubmissionSchema);

module.exports = PracticeSubmission;
