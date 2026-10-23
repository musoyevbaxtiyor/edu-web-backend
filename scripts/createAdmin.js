// Admin foydalanuvchi yaratuvchi (yoki mavjud foydalanuvchini admin qiluvchi) skript.
// Ishga tushirish:  npm run create:admin   (yoki  node scripts/createAdmin.js)
// Parol terminalda yashirin kiritiladi va faqat bcrypt xeshi bazaga yoziladi.
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const { normalizeEmail, isValidEmail, MIN_PASSWORD_LENGTH } = require('../utils/validation');

// Bazaga ulangandan keyin yaratiladi — aks holda kiritilgan qatorlar ulanish paytida yo'qolishi mumkin
let rl;

function createPrompt() {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Parol kiritilayotganda belgilarni ekranga chiqarmaslik uchun
    rl.muted = false;
    rl._writeToOutput = function (str) {
        if (!rl.muted) rl.output.write(str);
        else if (str.includes('\n') || str.includes('\r')) rl.output.write('\n');
    };
}

const ask = (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

const askHidden = async (question) => {
    rl.output.write(question);
    rl.muted = true;
    const answer = await ask('');
    rl.muted = false;
    return answer;
};

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB ulandi: ${mongoose.connection.host}/${mongoose.connection.name}\n`);
    createPrompt();

    const email = normalizeEmail(await ask('Email: '));
    if (!isValidEmail(email)) throw new Error('Noto\'g\'ri email formati.');

    const existing = await User.findByEmail(email);
    if (existing) {
        if (existing.role === 'admin') {
            console.log(`ℹ️  ${existing.email} allaqachon admin.`);
            return;
        }
        const yes = await ask(`${existing.name} (${existing.role}) mavjud. Admin qilinsinmi? (ha/yo'q): `);
        if (!/^(ha|h|yes|y)$/i.test(yes)) {
            console.log('Bekor qilindi.');
            return;
        }
        existing.role = 'admin';
        await existing.save();
        console.log(`🎉 ${existing.email} endi admin.`);
        return;
    }

    const name = await ask('Ism: ');
    const phone = await ask('Telefon: ');
    const age = parseInt(await ask('Yosh: '), 10);
    if (!name || !phone) throw new Error('Ism va telefon majburiy.');
    if (isNaN(age) || age < 14 || age > 120) throw new Error('Yosh 14 dan 120 gacha bo\'lishi kerak.');
    if (await User.findOne({ phone })) throw new Error('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan.');

    const password = await askHidden(`Parol (kamida ${MIN_PASSWORD_LENGTH} belgi): `);
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.`);
    const confirm = await askHidden('Parolni takrorlang: ');
    if (password !== confirm) throw new Error('Parollar mos kelmadi.');

    const user = await User.create({ name, email, phone, age, password, role: 'admin' });
    console.log(`\n🎉 Admin yaratildi: ${user.name} <${user.email}> (id: ${user._id})`);
}

run()
    .catch((err) => {
        console.error(`\n❌ Xato: ${err.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (rl) rl.close();
        try { await mongoose.disconnect(); } catch {}
    });
