const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOADS_BASE, decodeOriginalName, safeSegment } = require('../utils/uploads');

const SUBMISSIONS_DIR = path.join(UPLOADS_BASE, 'submissions');

// Ruxsat etilgan kengaytmalar (frontenddagi accept bilan bir xil)
const ALLOWED_EXT = /^\.(jpe?g|png|pdf|zip|rar|docx|txt)$/;

// 1. Faylni saqlash joyi va nomini aniqlash
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
            cb(null, SUBMISSIONS_DIR);
        } catch (err) {
            cb(err, null);
        }
    },
    filename: (req, file, cb) => {
        // Fayl nomini noyob qilib yaratish: user_id-lesson_id-timestamp.ext
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = safeSegment(req.user && req.user.id, 'user');
        const lessonId = safeSegment(req.body.lessonId, 'lesson');

        cb(null, `${userId}-${lessonId}-${Date.now()}${ext}`);
    }
});

// 2. Multer konfiguratsiyasi
const uploadTaskSolution = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 10 // 10 MB gacha fayl hajmi
    },
    fileFilter: (req, file, cb) => {
        // Asl nomni UTF-8 ga tiklaymiz (yuklab olishda shu nom ishlatiladi)
        file.originalname = decodeOriginalName(file.originalname);

        // MIME turi brauzerga qarab farq qiladi (Windows'da ZIP — application/x-zip-compressed),
        // shuning uchun faqat kengaytmani tekshiramiz
        if (ALLOWED_EXT.test(path.extname(file.originalname).toLowerCase())) {
            return cb(null, true);
        }

        const err = new Error("Faqat JPEG, PNG, PDF, ZIP, RAR, DOCX, TXT fayllariga ruxsat beriladi!");
        err.statusCode = 400;
        cb(err, false);
    }
});

// 'submissionFile' nomli bitta faylni yuklash uchun middleware eksporti
exports.uploadSubmissionFile = uploadTaskSolution.single('submissionFile');
