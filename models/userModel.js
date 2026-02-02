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
    
    // Telegram bot integratsiyasi (sparse: faqat qiymat bor bo'lganda unique tekshiriladi, null lar takrorlanishi mumkin)
    telegramChatId: { type: String, default: null },
    telegramToken: { type: String, default: null },
}, {
    timestamps: true
});

// Sparse unique index: null qiymatlar takrorlanishi mumkin, faqat null bo'lmaganda unique
userSchema.index({ telegramChatId: 1 }, { unique: true, sparse: true });
userSchema.index({ telegramToken: 1 }, { unique: true, sparse: true });

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