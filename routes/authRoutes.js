const express = require('express');
const { registerUser, loginUser,getMe } = require('../controllers/authController'); // loginUser'ni import qiling
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // <-- Shu qatorni qo'shing/tekshiring
// POST /api/auth/register
router.post('/register', registerUser);

// YENGI ROUTE: POST /api/auth/login
router.post('/login', loginUser);
// !!! ROLNI OLISH UCHUN KERAKLI MARSHRUT !!!
router.get('/me', protect, getMe);

module.exports = router;