// Serverni ishga tushirish uchun asosiy fayl
require('dotenv').config(); // .env faylini yuklaymiz
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Database ulanish funksiyasi

// Routerlarni import qilish
const authRoutes = require('./routes/authRoutes'); // 2. Auth Routeni chaqirish

// Server sozlamalari
const PORT = process.env.PORT || 5000;
const app = express();

// 1. Database ulanish
connectDB(); // connectDB funksiyasi tayyor bo'lgach, uni chaqirasiz

// 2. Middleware'lar
app.use(express.json()); // BodyParser o'rniga JSON formatidagi ma'lumotlarni qabul qilish
app.use(express.urlencoded({ extended: true })); // Form ma'lumotlarini qabul qilish

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

// 4. Test Route (Tekshirish uchun oddiy route)
app.get('/', (req, res) => {
    res.send(`Server ${PORT} portida ishlamoqda. Backend tayyor.`);
});

// 5. Asosiy Route'larni ulash (Routes tayyor bo'lgach)
// const authRoutes = require('./routes/authRoutes');
// app.use('/api/auth', authRoutes);


// 6. Serverni ishga tushirish
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishga tushdi!`));