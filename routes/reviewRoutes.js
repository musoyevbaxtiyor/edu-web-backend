// edu-web-backend/routes/reviewRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getSubmittedTasks, 
    approveTask 
} = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// O'qituvchi/Admin uchun topshirilgan vazifalar ro'yxati
router.get('/tasks', 
    protect, 
    restrictTo('teacher', 'admin'), 
    getSubmittedTasks
);

// Vazifani tasdiqlash
router.put('/tasks/:progressId/approve',
    protect,
    restrictTo('teacher', 'admin'),
    approveTask
);

module.exports = router;