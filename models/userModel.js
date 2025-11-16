const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student', enum: ['student', 'admin', 'teacher'] },
}, {
    timestamps: true
});

// Ma'lumotlar bazasiga saqlashdan oldin bajariladigan funksiya (middleware)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next(); // Agar parol o'zgarmagan bo'lsa, xeshlashni o'tkazib yuborish
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;