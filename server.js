require('dotenv').config(); // .env faylini yuklash
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db'); // DB ulanish

// Uploads papka: production'da UPLOAD_DIR ga persistent disk mount qiling (Render Disk)
const { UPLOADS_BASE } = require('./utils/uploads');
try {
    fs.mkdirSync(path.join(UPLOADS_BASE, 'submissions'), { recursive: true });
    fs.mkdirSync(path.join(UPLOADS_BASE, 'practice'), { recursive: true });
} catch (e) {
    console.warn('Uploads papka yaratishda xato:', e.message);
}
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const progressRoutes = require('./routes/progressRoutes');
const testRoutes = require('./routes/testRoutes');
const examRoutes = require('./routes/examRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const telegramRoutes = require('./routes/telegramRoutes');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const app = express();

// Render proksi ortida ishlaydi — req.ip haqiqiy mijoz IP'si bo'lishi uchun (login limiti IP bo'yicha)
app.set('trust proxy', 1);

// 1. DB ga ulanish
connectDB();

// 2. CORS sozlamalari
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4173',   // Vite preview
    'http://localhost:5173',   // Vite dev (React frontend)
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'https://edu-web-musoyev.netlify.app',
    'https://eduweb.uz',          // Asosiy domen
    'https://www.eduweb.uz'       // www subdomeni
];

// Qo'shimcha ruxsat etilgan manzillarni .env orqali berish mumkin (vergul bilan ajratilgan)
if (process.env.CLIENT_ORIGINS) {
    allowedOrigins.push(...process.env.CLIENT_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean));
}

const corsOptions = {
    origin: function(origin, callback) {
        // origin yo'q (server-server, curl) yoki ro'yxatda bo'lsa — ruxsat
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Rad etilganda xato tashlamaymiz — shunchaki CORS sarlavhasini qo'shmaymiz
            // (browser o'zi bloklaydi; 500 xato spam bo'lmaydi)
            callback(null, false);
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    // Frontend yuklab olingan fayl nomini o'qiy olishi uchun
    exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));

// 3. Middleware — fayllar UPLOADS_BASE dan (production'da persistent disk)
// Rasm va PDF'dan boshqa fayllar (html, svg, js, zip...) faqat yuklab olinadi —
// API domenida o'quvchi yuklagan HTML/SVG ishga tushib qolmasligi (XSS) uchun
const INLINE_UPLOAD_EXT = /\.(jpe?g|png|gif|webp|pdf)$/i;
app.use('/uploads', express.static(UPLOADS_BASE, {
    setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (!INLINE_UPLOAD_EXT.test(filePath)) res.setHeader('Content-Disposition', 'attachment');
    },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Routelarni ulash
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/enroll', enrollmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/telegram', telegramRoutes);

// 5. Telegram botni ishga tushirish
const TelegramBot = require('./bot/telegramBot');
const telegramBot = new TelegramBot();
telegramBot.start();

// 6. Test route
app.get('/', (req, res) => {
    res.send(`Server ${PORT} portida ishlamoqda. Backend tayyor.`);
});

// 7. Xatoliklarni boshqarish (barcha routelardan keyin bo'lishi shart)
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// 6. Serverni ishga tushirish
// 🔥 'const server =' qismini qo'shing.

const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server ${HOST}:${PORT} portda ishga tushdi!`);
});

// 🔥 KeepAliveTimeout va HeadersTimeoutni oshirish
const extendedTimeout = 120000; 

// 🔥 Endi 'server' e'lon qilingan va ishlaydi!
server.keepAliveTimeout = extendedTimeout;
server.headersTimeout = extendedTimeout;

// Render deploy/restartda SIGTERM yuboradi: botni to'xtatib, HTTP serverni yopamiz
const shutdown = (signal) => {
    console.log(`${signal} qabul qilindi — server to'xtatilmoqda...`);
    try { telegramBot.stop(signal); } catch (_) { /* bot ishlamayotgan bo'lishi mumkin */ }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
};
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));