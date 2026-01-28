const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // YENGI QO'SHILGAN MAYDONLAR:
    phone: { type: String, required: true, unique: true }, // Telefon raqami
    age: { type: Number, required: true, min: 14 },        // Yosh (minimum 14 yosh)
    
    role: { type: String, default: 'student', enum: ['student', 'admin', 'teacher'] },
    
    // Coins (tanga) - vazifa baholanishi uchun
    coins: { type: Number, default: 0, min: 0 },
    
    // Telegram bot integratsiyasi
    telegramChatId: { type: String, default: null, unique: true, sparse: true },
    telegramToken: { type: String, default: null, unique: true, sparse: true }, // Har bir foydalanuvchi uchun unique token
}, {
    timestamps: true
});

// Parolni saqlashdan oldin xesh qilish (hashing) qismi o'zgarishsiz qoladi...
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;