const multer = require('multer');
const path = require('path');

// 1. Faylni saqlash joyi va nomini aniqlash
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Fayllar 'uploads/submissions' papkasida saqlanadi
        cb(null, 'uploads/submissions'); 
    },
    filename: (req, file, cb) => {
        // Fayl nomini noyob qilib yaratish: user_id-lesson_id-timestamp.ext
        const ext = path.extname(file.originalname);
        const userId = req.user.id;
        const lessonId = req.body.lessonId || 'unknown'; // Lesson ID keladi deb taxmin qilamiz

        cb(null, `${userId}-${lessonId}-${Date.now()}${ext}`);
    }
});

// 2. Multer konfiguratsiyasi
const uploadTaskSolution = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 10 // 10 MB gacha fayl hajmi
    },
    // ...
    fileFilter: (req, file, cb) => {
        
        // 🔥 TO'G'RI KENGAYTMA TEKSHIRUVI
        const extName = /jpeg|jpg|png|pdf|zip|rar|docx|txt/.test(
            path.extname(file.originalname).toLowerCase()
        );

        // 🔥 TO'G'RI MIME TYPE TEKSHIRUVI (Ixtiyoriy, agar birinchisi ishlamasa)
        const mimeType = /image\/jpeg|image\/png|application\/pdf|application\/zip|application\/x-rar-compressed|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|text\/plain/.test(file.mimetype);


        if (extName || mimeType) { // Kengaytma yoki MIME turidan biri to'g'ri bo'lsa ham o'tkazish
            return cb(null, true);
        }
        
        // Agar xato bo'lsa, aniq sababni ko'rsatish
        console.error(`Fayl tekshiruvdan o'tmadi. Ext: ${extName}, Mime: ${mimeType}.`);
        cb(new Error("Faqat JPEG, PNG, PDF, ZIP, RAR, DOCX, TXT fayllariga ruxsat beriladi!"), false);
    }
// ...
});

// 'submissionFile' nomli bitta faylni yuklash uchun middleware eksporti
exports.uploadSubmissionFile = uploadTaskSolution.single('submissionFile');