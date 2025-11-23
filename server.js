// Serverni ishga tushirish uchun asosiy fayl
require('dotenv').config(); // .env faylini yuklaymiz
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Database ulanish funksiyasi
// const cors = require('cors'); // YANGI: CORS ni import qilish

// YANGI: CORS ni sozlash (Hamma manbalardan kirishga ruxsat berish)
// app.use(cors());

// Middleware (JSON ma'lumotlarini o'qish uchun)
// app.use(express.json());

// Routerlarni import qilish
const authRoutes = require('./routes/authRoutes'); // 2. Auth Routeni chaqirish
const userRoutes = require('./routes/userRoutes'); // YANGI: User Routelarini chaqirish
const courseRoutes = require('./routes/courseRoutes'); // YANGI: Kurs Routelarini chaqirish
const lessonRoutes = require('./routes/lessonRoutes'); // <<< IMPORT QILISH
const enrollmentRoutes = require('./routes/enrollmentRoutes'); // YANGI import

// Server sozlamalari
const PORT = process.env.PORT || 5000;
const app = express();

// 1. Database ulanish
connectDB(); // connectDB funksiyasi tayyor bo'lgach, uni chaqirasiz

// 2. Middleware'lar
app.use(express.json()); // BodyParser o'rniga JSON formatidagi ma'lumotlarni qabul qilish
app.use(express.urlencoded({ extended: true })); // Form ma'lumotlarini qabul qilish
app.use('/api/enroll', enrollmentRoutes); // YANGI route'ni ulash
app.use('/api/lessons', lessonRoutes); // <<< YANGI ROUTE
app.use('/api/reviews', require('./routes/reviewRoutes')); // <<< BU QATOR MAVJUDMI?
app.use('/api/lessons', require('./routes/lessonRoutes'));
// server.js
// ... (boshqa importlar)
// Submission (Vazifa topshiriqlari) marshrutini ulash
app.use('/api/submissions', require('./routes/submissionRoutes')); 
app.use('/api/progress', require('./routes/progressRoutes')); // <<< BU QATORNI QO'SHING
// ... (boshqa marshrutlar va middlewarelar)
// 3. CORS Sozlamasi: Frontendga ruxsat berish
// DIQQAT: Frontend qayerda ishlayotganini aniq ko'rsatish muhim!
// Masalan, siz VS Code'ning Live Server'ida ishlayotgan bo'lsangiz, u 127.0.0.1:5500 da ishlaydi.

const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:3000'], // Frontend manzillarini kiriting
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};
app.use(cors(corsOptions));

// 3. Routelarni o'rnatish
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // YANGI: User routelarini ulash
app.use('/api/courses', courseRoutes); // YANGI: Kurs routelarini ulash
app.use('/api/auth', require('./routes/authRoutes'));

// 4. Test Route (Tekshirish uchun oddiy route)
app.get('/', (req, res) => {
    res.send(`Server ${PORT} portida ishlamoqda. Backend tayyor.`);
});

// 5. Asosiy Route'larni ulash (Routes tayyor bo'lgach)
// const authRoutes = require('./routes/authRoutes');
// app.use('/api/auth', authRoutes);


// 6. Serverni ishga tushirish
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishga tushdi!`));