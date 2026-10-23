const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOADS_BASE, decodeOriginalName, safeSegment } = require('../utils/uploads');

const PRACTICE_DIR = path.join(UPLOADS_BASE, 'practice');

const ALLOWED_EXT = /^\.(jpe?g|png|gif|webp|svg|pdf|zip|rar|html?|css|js|json|txt|docx)$/;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            fs.mkdirSync(PRACTICE_DIR, { recursive: true });
            cb(null, PRACTICE_DIR);
        } catch (err) {
            cb(err, null);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = safeSegment(req.user && req.user.id, 'user');
        const taskId = safeSegment(req.body.taskId, 'task');
        cb(null, `${userId}-${taskId}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10 MB
    fileFilter: (req, file, cb) => {
        file.originalname = decodeOriginalName(file.originalname);
        if (ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
        const err = new Error('Faqat rasm, PDF, ZIP, RAR, HTML, CSS, JS, TXT, DOCX fayllariga ruxsat beriladi!');
        err.statusCode = 400;
        cb(err, false);
    },
});

// 'practiceFile' — ixtiyoriy bitta fayl
exports.uploadPracticeFile = upload.single('practiceFile');
