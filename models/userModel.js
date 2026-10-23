const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { escapeRegex } = require('../utils/validation');

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
    
    // Telegram bot: default yo'q — yangi userda maydon bo'lmaydi, sparse indeks faqat qiymat bor hujjatlar uchun
    telegramChatId: { type: String },
    telegramToken: { type: String },

    // Parol oxirgi marta o'zgartirilgan vaqt (undan oldingi tokenlar yaroqsiz).
    // Eski foydalanuvchilarda bu maydon yo'q — ularning tokenlari amal qilaveradi
    passwordChangedAt: { type: Date },
}, {
    timestamps: true
});

// Sparse unique index: null qiymatlar takrorlanishi mumkin, faqat null bo'lmaganda unique
userSchema.index({ telegramChatId: 1 }, { unique: true, sparse: true });
userSchema.index({ telegramToken: 1 }, { unique: true, sparse: true });

// Email bo'yicha foydalanuvchini topish (katta-kichik harfga befarq).
// Eski foydalanuvchilarda email aralash harflarda saqlangan bo'lishi mumkin,
// shuning uchun: 1) yozilganidek, 2) kichik harfda, 3) harfga befarq qidiramiz
userSchema.statics.findByEmail = async function (email) {
    if (typeof email !== 'string' || !email.trim()) return null;
    const trimmed = email.trim();
    const lower = trimmed.toLowerCase();

    let user = await this.findOne({ email: trimmed });
    if (!user && lower !== trimmed) user = await this.findOne({ email: lower });
    if (!user) user = await this.findOne({ email: new RegExp(`^${escapeRegex(lower)}$`, 'i') });
    return user;
};

// Parolni saqlashdan oldin xesh qilish (hashing) qismi o'zgarishsiz qoladi...
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    // Mavjud foydalanuvchi parolini o'zgartirsa — eski tokenlar bekor bo'ladi
    if (!this.isNew) this.passwordChangedAt = new Date();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;