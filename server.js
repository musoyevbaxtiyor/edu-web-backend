// Serverni ishga tushirish uchun asosiy fayl
require('dotenv').config(); // .env faylini yuklaymiz
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Database ulanish funksiyasi
const submissionRouter = require('./routes/submissionRoutes'); // Import
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
const path = require('path'); // Path modulini import qiling
// Server sozlamalari
const PORT = process.env.PORT || 5000;
const app = express();

// 1. Database ulanish
connectDB(); // connectDB funksiyasi tayyor bo'lgach, uni chaqirasiz

// 2. Middleware'lar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json()); // BodyParser o'rniga JSON formatidagi ma'lumotlarni qabul qilish
app.use(express.urlencoded({ extended: true })); // Form ma'lumotlarini qabul qilish
app.use('/api/enroll', enrollmentRoutes); // YANGI route'ni ulash
app.use('/api/lessons', lessonRoutes); // <<< YANGI ROUTE
app.use('/api/reviews', require('./routes/reviewRoutes')); // <<< BU QATOR MAVJUDMI?
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/submissions', submissionRouter); // 🔥 BU QATOR MAVJUDLIGINI TEKSHIRING
// server.js
// ... (boshqa importlar)
// Submission (Vazifa topshiriqlari) marshrutini ulash
app.use('/api/submissions', require('./routes/submissionRoutes')); 
app.use('/api/progress', require('./routes/progressRoutes')); // <<< BU QATORNI QO'SHING
// ... (boshqa marshrutlar va middlewarelar)
// 3. CORS Sozlamasi: Frontendga ruxsat berish
// DIQQAT: Frontend qayerda ishlayotganini aniq ko'rsatish muhim!
// Masalan, siz VS Code'ning Live Server'ida ishlayotgan bo'lsangiz, u 127.0.0.1:5500 da ishlaydi.

// 🔥 CORS Sozlamalari 🔥
const allowedOrigins = [
    'http://localhost:3000', // Test uchun lokal adres
    // 🔥 Netlify tomonidan berilgan to'liq va yakuniy Frontend manzilingizni kiriting!
    'https://edu-web-musoyev.netlify.app/' 
];

const corsOptions = {
    origin: function (origin, callback) {
        // Agar so'rov yuboruvchi origin allowedOrigins ro'yxatida bo'lsa yoki origin mavjud bo'lmasa (masalan, Postman so'rovi)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bu manzil CORS siyosati tomonidan bloklangan.'), false);
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Agar siz frontend/backend o'rtasida cookie/sessiya yubormoqchi bo'lsangiz
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