const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadPracticeFile } = require('../middleware/practiceMiddleware');
const {
    getOverview,
    getTasks,
    submitTask,
    getMySubmissions,
    getManageTasks,
    createTask,
    updateTask,
    deleteTask,
    getManageSubmissions,
    reviewSubmission,
} = require('../controllers/practiceController');

/* ---------- O'quvchi ---------- */
router.get('/overview', protect, getOverview);
router.get('/tasks', protect, getTasks);
router.get('/my/submissions', protect, getMySubmissions);
router.post('/submit', protect, restrictTo('student'), uploadPracticeFile, submitTask);

/* ---------- O'qituvchi / Admin (boshqaruv) — /tasks/:id dan OLDIN ---------- */
router.get('/manage/tasks', protect, restrictTo('teacher', 'admin'), getManageTasks);
router.get('/manage/submissions', protect, restrictTo('teacher', 'admin'), getManageSubmissions);
router.put('/submissions/:id/review', protect, restrictTo('teacher', 'admin'), reviewSubmission);

router.post('/tasks', protect, restrictTo('teacher', 'admin'), createTask);
router.put('/tasks/:id', protect, restrictTo('teacher', 'admin'), updateTask);
router.delete('/tasks/:id', protect, restrictTo('teacher', 'admin'), deleteTask);

module.exports = router;
