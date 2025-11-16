const express = require('express');
const { registerUser } = require('../controllers/authController');
const router = express.Router();

// Endpoint: POST /api/auth/register
router.post('/register', registerUser);

module.exports = router;