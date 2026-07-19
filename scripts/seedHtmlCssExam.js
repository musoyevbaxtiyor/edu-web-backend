// HTML/CSS imtihonlarini (easy / middle / pro) bazaga qo'shuvchi skript.
// Ishga tushirish:  npm run seed:exams   (yoki  node scripts/seedHtmlCssExam.js)
require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../models/examModel');
const User = require('../models/userModel');

const EASY = [
    { question: 'HTML nimaning qisqartmasi?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Mark Language', 'Home Tool Markup Language'], correctAnswer: 0, explanation: 'HTML — HyperText Markup Language, ya\'ni gipermatnli belgilash tili.' },
    { question: 'Sahifadagi eng katta sarlavha uchun qaysi teg ishlatiladi?', options: ['<heading>', '<h1>', '<head>', '<title>'], correctAnswer: 1, explanation: '<h1> eng katta sarlavha, <h6> esa eng kichigi.' },
    { question: 'Havola (link) yaratish uchun qaysi teg ishlatiladi?', options: ['<link>', '<a>', '<href>', '<url>'], correctAnswer: 1, explanation: '<a href="..."> havola yaratadi. <link> esa tashqi fayllarni ulaydi.' },
    { question: 'Sahifaga rasm joylash uchun qaysi teg ishlatiladi?', options: ['<picture>', '<image>', '<img>', '<src>'], correctAnswer: 2, explanation: '<img src="..." alt="..."> teg rasm joylaydi.' },
    { question: 'CSS\'da matn rangini o\'zgartirish uchun qaysi xususiyat?', code: 'p {\n  /* ??? : red; */\n}', options: ['font-color', 'text-color', 'color', 'foreground'], correctAnswer: 2, explanation: 'color — matn rangini, background-color esa fon rangini belgilaydi.' },
    { question: 'Tashqi CSS faylni HTML sahifaga qanday ulaymiz?', options: ['<style src="style.css">', '<css href="style.css">', '<link rel="stylesheet" href="style.css">', '<script src="style.css">'], correctAnswer: 2, explanation: '<link rel="stylesheet" href="style.css"> — tashqi CSS faylni ulaydi.' },
    { question: 'Tartibsiz (belgili) ro\'yxat uchun qaysi teg?', options: ['<ol>', '<ul>', '<li>', '<list>'], correctAnswer: 1, explanation: '<ul> — tartibsiz, <ol> — tartibli ro\'yxat. Ichida <li> elementlari bo\'ladi.' },
];

const MIDDLE = [
    { question: 'Quyidagi CSS\'da margin nimani bildiradi?', code: '.box {\n  margin: 20px;\n  padding: 10px;\n}', options: ['Element ichidagi bo\'shliq', 'Element chegarasi (border)', 'Elementning tashqi bo\'shlig\'i', 'Shrift o\'lchami'], correctAnswer: 2, explanation: 'margin — element tashqarisidagi bo\'shliq, padding — ichidagi bo\'shliq.' },
    { question: 'Flexbox\'da elementlarni ASOSIY o\'q bo\'ylab tekislash uchun qaysi xususiyat?', options: ['align-items', 'justify-content', 'flex-direction', 'align-content'], correctAnswer: 1, explanation: 'justify-content — asosiy o\'q bo\'ylab, align-items — ko\'ndalang o\'q bo\'ylab tekislaydi.' },
    { question: '"btn" nomli class ga uslub berish uchun to\'g\'ri CSS selektori?', options: ['.btn', '#btn', 'btn', '*btn'], correctAnswer: 0, explanation: 'Class — nuqta (.btn) bilan, id — panjara (#btn) bilan belgilanadi.' },
    { question: 'display: flex qaysi elementga qo\'yiladi?', code: '<div class="parent">\n  <div class="child"></div>\n</div>', options: ['child ga', 'parent ga', 'ikkalasiga', 'body ga'], correctAnswer: 1, explanation: 'display:flex ota (konteyner) elementga qo\'yiladi; bolalar flex-item bo\'ladi.' },
    { question: 'Quyidagilardan qaysi biri SEMANTIK teg?', options: ['<div>', '<span>', '<article>', '<b>'], correctAnswer: 2, explanation: '<article>, <nav>, <section>, <header> — semantik teglar; <div>/<span> — neytral.' },
    { question: 'Bu input qanday maydon yaratadi?', code: '<input type="email" required>', options: ['Parol maydoni', 'Email maydoni (validatsiya bilan)', 'Fayl yuklash', 'Sana tanlash'], correctAnswer: 1, explanation: 'type="email" brauzerda email formatini tekshiradi; required — majburiy maydon.' },
    { question: 'box-sizing: border-box nima qiladi?', options: ['Elementni yashiradi', 'padding va border kenglik (width) ichiga kiritiladi', 'Faqat border qo\'shadi', 'Marginni olib tashlaydi'], correctAnswer: 1, explanation: 'border-box\'da width ichiga padding va border kiradi — o\'lchamni boshqarish osonlashadi.' },
];

const PRO = [
    { question: 'CSS Grid\'da 3 ta teng kenglikdagi ustun yaratish uchun?', code: '.grid {\n  display: grid;\n  /* ??? */\n}', options: ['grid-columns: 3;', 'grid-template-columns: repeat(3, 1fr);', 'columns: 3;', 'grid: 3;'], correctAnswer: 1, explanation: 'grid-template-columns: repeat(3, 1fr) — 3 ta teng ustun hosil qiladi.' },
    { question: 'CSS\'da eng yuqori ustunlik (specificity) qaysi biriga tegishli?', options: ['Element selektor (div)', 'Class selektor (.box)', 'ID selektor (#box)', 'Inline style (style="...")'], correctAnswer: 3, explanation: 'Ustunlik tartibi: inline > ID > class > element. !important esa hammasidan yuqori.' },
    { question: 'position: absolute element nimaga nisbatan joylashadi?', code: '.child {\n  position: absolute;\n  top: 0;\n}', options: ['Har doim <body> ga', 'Eng yaqin position != static bo\'lgan ota elementga', 'Har doim ekranga', 'Keyingi elementga'], correctAnswer: 1, explanation: 'absolute — eng yaqin positioned (relative/absolute/fixed) ota elementga nisbatan joylashadi.' },
    { question: '@media (max-width: 600px) { ... } nima uchun ishlatiladi?', options: ['Rangni o\'zgartirish', 'Ekran 600px va undan kichik bo\'lganda uslub qo\'llash', 'Elementni butunlay yashirish', 'Animatsiya yaratish'], correctAnswer: 1, explanation: 'Media query — responsive dizayn uchun; ekran o\'lchamiga qarab uslub qo\'llaydi.' },
    { question: 'rem birligi nimaga nisbatan hisoblanadi?', options: ['Ota element font-size ga', 'Root (html) font-size ga', 'Ekran kengligiga', 'Har doim 16px'], correctAnswer: 1, explanation: 'rem — root (html) font-size ga nisbatan; em esa ota element font-size ga nisbatan.' },
    { question: 'z-index xususiyati qachon ishlaydi?', code: '.box {\n  z-index: 10;\n}', options: ['Har doim', 'Element position static bo\'lmaganda (relative/absolute/fixed)', 'Faqat flexbox\'da', 'Faqat grid\'da'], correctAnswer: 1, explanation: 'z-index faqat positioned (static\'dan tashqari) elementlarda ishlaydi.' },
    { question: 'Bu transition qatori nima qiladi?', code: '.btn {\n  transition: background 0.3s ease;\n}', options: ['Fonni yashiradi', 'background o\'zgarishini 0.3 soniyada silliq animatsiya qiladi', 'Tugmani kattalashtiradi', 'Hech narsa qilmaydi'], correctAnswer: 1, explanation: 'transition — xususiyat o\'zgarishini belgilangan vaqt ichida silliq animatsiya qiladi.' },
];

const EXAMS = [
    { title: 'HTML & CSS — Boshlang\'ich (Easy)', level: 'easy', description: 'HTML teglari va CSS asoslari bo\'yicha boshlang\'ich daraja imtihoni.', questions: EASY, durationMinutes: 10, passScore: 60 },
    { title: 'HTML & CSS — O\'rta (Middle)', level: 'middle', description: 'Box model, flexbox, semantik teglar va formalar bo\'yicha o\'rta daraja.', questions: MIDDLE, durationMinutes: 15, passScore: 60 },
    { title: 'HTML & CSS — Pro', level: 'pro', description: 'CSS Grid, specificity, positioning, media query va murakkab mavzular.', questions: PRO, durationMinutes: 20, passScore: 70 },
];

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB ulandi');

    // createdBy uchun admin -> teacher -> istalgan foydalanuvchi
    const owner =
        (await User.findOne({ role: 'admin' })) ||
        (await User.findOne({ role: 'teacher' })) ||
        (await User.findOne());

    if (!owner) {
        console.error('❌ Foydalanuvchi topilmadi — avval kamida bitta admin/teacher yarating.');
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log(`👤 Muallif: ${owner.name} (${owner.role})`);

    for (const e of EXAMS) {
        const doc = await Exam.findOneAndUpdate(
            { title: e.title },
            {
                title: e.title,
                description: e.description,
                category: 'HTML/CSS',
                level: e.level,
                questions: e.questions,
                durationMinutes: e.durationMinutes,
                passScore: e.passScore,
                isActive: true,
                createdBy: owner._id,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        console.log(`📝 ${doc.level.toUpperCase().padEnd(7)} "${doc.title}" — ${doc.questions.length} savol (id: ${doc._id})`);
    }

    console.log('🎉 HTML/CSS imtihonlari muvaffaqiyatli qo\'shildi!');
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(async (err) => {
    console.error('❌ Xato:', err.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
