const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Production (Render): UPLOAD_DIR persistent diskka ishora qiladi
const UPLOADS_BASE = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const PRACTICE_DIR = path.join(UPLOADS_BASE, 'practice');

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
        const ext = path.extname(file.originalname);
        const userId = req.user ? req.user.id : 'unknown';
        const taskId = req.body.taskId || 'task';
        cb(null, `${userId}-${taskId}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 10 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const ok = /\.(jpe?g|png|gif|webp|svg|pdf|zip|rar|html?|css|js|json|txt|docx)$/.test(ext);
        if (ok) return cb(null, true);
        cb(new Error('Faqat rasm, PDF, ZIP, RAR, HTML, CSS, JS, TXT, DOCX fayllariga ruxsat beriladi!'), false);
    },
});

// 'practiceFile' — ixtiyoriy bitta fayl
exports.uploadPracticeFile = upload.single('practiceFile');
