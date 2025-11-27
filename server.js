require('dotenv').config(); // .env faylini yuklash
const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db'); // DB ulanish
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const progressRoutes = require('./routes/progressRoutes');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const app = express();

// 1. DB ga ulanish
connectDB();

// 2. CORS sozlamalari
const allowedOrigins = [
    'http://localhost:3000',
    'https://edu-web-musoyev.netlify.app'
];

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bu manzil CORS siyosati tomonidan bloklangan.'), false);
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));

// 3. Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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

// 5. Test route
app.get('/', (req, res) => {
    res.send(`Server ${PORT} portida ishlamoqda. Backend tayyor.`);
});

// 6. Serverni ishga tushirish
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server ${HOST}:${PORT} portda ishga tushdi!`);
});
