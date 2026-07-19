require('dotenv').config(); // .env faylini yuklash
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db'); // DB ulanish

// Uploads papka: production'da UPLOAD_DIR ga persistent disk mount qiling (Render Disk)
const UPLOADS_BASE = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
try {
    fs.mkdirSync(path.join(UPLOADS_BASE, 'submissions'), { recursive: true });
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
const telegramRoutes = require('./routes/telegramRoutes');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const app = express();

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
};

app.use(cors(corsOptions));

// 3. Middleware — fayllar UPLOADS_BASE dan (production'da persistent disk)
app.use('/uploads', express.static(UPLOADS_BASE));
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