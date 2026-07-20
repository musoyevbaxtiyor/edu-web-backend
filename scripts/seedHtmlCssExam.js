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
    { question: 'Matn abzatsi (paragraf) uchun qaysi teg ishlatiladi?', options: ['<p>', '<par>', '<text>', '<paragraph>'], correctAnswer: 0, explanation: '<p> — paragraf (abzats) tegi. Har bir <p> yangi qatordan boshlanadi.' },
    { question: 'Matnni yangi qatorga o\'tkazish (qator uzish) uchun qaysi teg?', options: ['<break>', '<br>', '<newline>', '<lb>'], correctAnswer: 1, explanation: '<br> — yopilmaydigan teg bo\'lib, matnni yangi qatorga o\'tkazadi.' },
    { question: 'Matnni qalin (bold) ko\'rsatish uchun qaysi teg?', options: ['<bold>', '<b>', '<big>', '<dark>'], correctAnswer: 1, explanation: '<b> yoki <strong> matnni qalin qiladi; <strong> semantik ahamiyatga ega.' },
    { question: 'To\'g\'ri HTML5 hujjati qaysi qator bilan boshlanadi?', options: ['<html>', '<!DOCTYPE html>', '<head>', '<doctype>'], correctAnswer: 1, explanation: '<!DOCTYPE html> — hujjat HTML5 ekanini bildiradi va birinchi bo\'lib yoziladi.' },
    { question: 'Tartibli (raqamlangan) ro\'yxat uchun qaysi teg?', options: ['<ul>', '<ol>', '<dl>', '<list>'], correctAnswer: 1, explanation: '<ol> — tartibli (1, 2, 3...) ro\'yxat; <ul> — belgili ro\'yxat.' },
    { question: 'CSS\'da orqa fon rangini o\'zgartirish uchun qaysi xususiyat?', code: 'body {\n  /* ??? : #f0f0f0; */\n}', options: ['color', 'bg-color', 'background-color', 'fill'], correctAnswer: 2, explanation: 'background-color — fon rangini, color esa matn rangini belgilaydi.' },
    { question: 'Brauzer yorlig\'ida ko\'rinadigan sahifa nomi qaysi tegga yoziladi?', options: ['<head>', '<title>', '<h1>', '<caption>'], correctAnswer: 1, explanation: '<title> — <head> ichida yoziladi va brauzer yorlig\'ida ko\'rinadi.' },
    { question: 'Rasm tegidagi alt atributi nima uchun kerak?', code: '<img src="rasm.jpg" alt="???">', options: ['Rasm o\'lchamini belgilaydi', 'Rasm yuklanmasa yoki skrinrider uchun muqobil matn', 'Rasmni markazlaydi', 'Rasmga havola qo\'shadi'], correctAnswer: 1, explanation: 'alt — rasm ko\'rinmaganda chiqadigan matn; accessibility uchun muhim.' },
    { question: 'CSS uslubini bevosita element ichiga (inline) qo\'llash uchun qaysi atribut?', options: ['class', 'id', 'style', 'css'], correctAnswer: 2, explanation: 'style="..." atributi bilan inline uslub beriladi, masalan style="color:red".' },
    { question: 'Shrift (matn) o\'lchamini o\'zgartirish uchun qaysi CSS xususiyati?', options: ['text-size', 'font-size', 'size', 'font-weight'], correctAnswer: 1, explanation: 'font-size — shrift o\'lchamini; font-weight esa qalinligini belgilaydi.' },
    { question: '<input> tegi asosan nima uchun ishlatiladi?', options: ['Rasm joylash', 'Foydalanuvchidan ma\'lumot kiritish maydoni', 'Havola yaratish', 'Ro\'yxat yaratish'], correctAnswer: 1, explanation: '<input> — forma ichida matn, parol, email kabi ma\'lumot kiritish maydonini yaratadi.' },
    { question: 'HTML jadval yaratish uchun qaysi teg ishlatiladi?', options: ['<grid>', '<table>', '<tab>', '<sheet>'], correctAnswer: 1, explanation: '<table> ichida <tr> (qator) va <td> (katak) teglari joylashadi.' },
    { question: 'HTML\'da izoh (comment) qanday yoziladi?', options: ['// izoh', '/* izoh */', '<!-- izoh -->', '# izoh'], correctAnswer: 2, explanation: '<!-- ... --> — HTML izohi; brauzerda ko\'rinmaydi, faqat kodda qoladi.' },
];

const MIDDLE = [
    { question: 'Quyidagi CSS\'da margin nimani bildiradi?', code: '.box {\n  margin: 20px;\n  padding: 10px;\n}', options: ['Element ichidagi bo\'shliq', 'Element chegarasi (border)', 'Elementning tashqi bo\'shlig\'i', 'Shrift o\'lchami'], correctAnswer: 2, explanation: 'margin — element tashqarisidagi bo\'shliq, padding — ichidagi bo\'shliq.' },
    { question: 'Flexbox\'da elementlarni ASOSIY o\'q bo\'ylab tekislash uchun qaysi xususiyat?', options: ['align-items', 'justify-content', 'flex-direction', 'align-content'], correctAnswer: 1, explanation: 'justify-content — asosiy o\'q bo\'ylab, align-items — ko\'ndalang o\'q bo\'ylab tekislaydi.' },
    { question: '"btn" nomli class ga uslub berish uchun to\'g\'ri CSS selektori?', options: ['.btn', '#btn', 'btn', '*btn'], correctAnswer: 0, explanation: 'Class — nuqta (.btn) bilan, id — panjara (#btn) bilan belgilanadi.' },
    { question: 'display: flex qaysi elementga qo\'yiladi?', code: '<div class="parent">\n  <div class="child"></div>\n</div>', options: ['child ga', 'parent ga', 'ikkalasiga', 'body ga'], correctAnswer: 1, explanation: 'display:flex ota (konteyner) elementga qo\'yiladi; bolalar flex-item bo\'ladi.' },
    { question: 'Quyidagilardan qaysi biri SEMANTIK teg?', options: ['<div>', '<span>', '<article>', '<b>'], correctAnswer: 2, explanation: '<article>, <nav>, <section>, <header> — semantik teglar; <div>/<span> — neytral.' },
    { question: 'Bu input qanday maydon yaratadi?', code: '<input type="email" required>', options: ['Parol maydoni', 'Email maydoni (validatsiya bilan)', 'Fayl yuklash', 'Sana tanlash'], correctAnswer: 1, explanation: 'type="email" brauzerda email formatini tekshiradi; required — majburiy maydon.' },
    { question: 'box-sizing: border-box nima qiladi?', options: ['Elementni yashiradi', 'padding va border kenglik (width) ichiga kiritiladi', 'Faqat border qo\'shadi', 'Marginni olib tashlaydi'], correctAnswer: 1, explanation: 'border-box\'da width ichiga padding va border kiradi — o\'lchamni boshqarish osonlashadi.' },
    { question: 'CSS\'da padding nimani bildiradi?', code: '.box {\n  padding: 16px;\n}', options: ['Element tashqarisidagi bo\'shliq', 'Kontent bilan border orasidagi ichki bo\'shliq', 'Chegara qalinligi', 'Shrift oralig\'i'], correctAnswer: 1, explanation: 'padding — element ichidagi (kontent va border orasidagi) bo\'shliq; margin — tashqi bo\'shliq.' },
    { question: 'flex-direction: column nima qiladi?', options: ['Elementlarni gorizontal joylashtiradi', 'Elementlarni vertikal (ustun bo\'ylab) joylashtiradi', 'Elementlarni yashiradi', 'Rangni o\'zgartiradi'], correctAnswer: 1, explanation: 'column — flex elementlarni yuqoridan pastga, row esa chapdan o\'ngga joylashtiradi.' },
    { question: '"header" nomli id ga uslub berish uchun to\'g\'ri selektor?', options: ['.header', '#header', 'header', '@header'], correctAnswer: 1, explanation: 'id — panjara (#header) bilan, class esa nuqta (.header) bilan tanlanadi.' },
    { question: 'display: none nima qiladi?', options: ['Elementni shaffof qiladi', 'Elementni butunlay yashiradi va joy egallamaydi', 'Elementni kichraytiradi', 'Elementni bloklaydi'], correctAnswer: 1, explanation: 'display:none — element umuman ko\'rinmaydi va sahifada joy egallamaydi.' },
    { question: 'visibility: hidden va display: none orasidagi farq nima?', options: ['Ikkalasi bir xil', 'display:none joy egallamaydi, visibility:hidden esa joyni saqlab qoladi', 'visibility:hidden elementni o\'chiradi', 'Hech qanday farqi yo\'q'], correctAnswer: 1, explanation: 'visibility:hidden — ko\'rinmaydi lekin joyi qoladi; display:none — joyi ham yo\'qoladi.' },
    { question: '<label> tegi nima uchun ishlatiladi?', code: '<label for="ism">Ism</label>\n<input id="ism">', options: ['Rasmga sarlavha berish', 'Forma maydoniga bog\'langan yorliq (matn)', 'Ro\'yxat elementi', 'Jadval sarlavhasi'], correctAnswer: 1, explanation: '<label for="..."> input bilan bog\'lanadi; yorliqqa bosilsa maydon faollashadi.' },
    { question: 'align-items: center flexbox\'da nima qiladi?', code: '.box {\n  display: flex;\n  align-items: center;\n}', options: ['Asosiy o\'q bo\'ylab markazlaydi', 'Ko\'ndalang o\'q bo\'ylab markazlaydi', 'Elementlarni yashiradi', 'Matnni qalin qiladi'], correctAnswer: 1, explanation: 'align-items — ko\'ndalang o\'q bo\'ylab; justify-content — asosiy o\'q bo\'ylab tekislaydi.' },
    { question: 'CSS\'dagi :hover psevdo-klassi qachon ishlaydi?', options: ['Element bosilganda', 'Sichqoncha element ustiga kelganda', 'Element yuklanganda', 'Element yashirilganda'], correctAnswer: 1, explanation: ':hover — kursor element ustida turganda uslub qo\'llaydi.' },
    { question: '<div> va <span> orasidagi asosiy farq nima?', options: ['div inline, span blok', 'div blok darajali, span esa qator ichi (inline)', 'Ikkalasi ham inline', 'Ikkalasi ham blok darajali'], correctAnswer: 1, explanation: '<div> — blok (butun qatorni egallaydi), <span> — inline (faqat kontenti qadar joy).' },
    { question: 'Flex yoki grid\'da gap xususiyati nima qiladi?', options: ['Elementlar orasidagi bo\'shliqni belgilaydi', 'Elementni kattalashtiradi', 'Chegara qo\'shadi', 'Rangni o\'zgartiradi'], correctAnswer: 0, explanation: 'gap — konteyner ichidagi elementlar orasidagi masofani belgilaydi.' },
    { question: 'Havolani yangi oynada (tab) ochish uchun qaysi atribut?', code: '<a href="..." ???>Sayt</a>', options: ['rel="new"', 'target="_blank"', 'open="new"', 'window="new"'], correctAnswer: 1, explanation: 'target="_blank" — havolani yangi brauzer oynasida/tabda ochadi.' },
    { question: 'border-radius xususiyati nima qiladi?', options: ['Chegara rangini o\'zgartiradi', 'Element burchaklarini yumaloqlaydi', 'Chegara qalinligini belgilaydi', 'Soya qo\'shadi'], correctAnswer: 1, explanation: 'border-radius — burchaklarni yumaloqlaydi; masalan 50% doira hosil qiladi.' },
    { question: 'id va class haqida qaysi fikr to\'g\'ri?', options: ['id ham, class ham cheksiz takrorlanadi', 'id sahifada yagona, class esa ko\'p elementga ishlatiladi', 'class yagona, id takrorlanadi', 'Ikkalasi ham yagona bo\'lishi shart'], correctAnswer: 1, explanation: 'id — sahifada bir marta (yagona), class esa istalgancha ko\'p elementga qo\'llanadi.' },
];

const PRO = [
    { question: 'CSS Grid\'da 3 ta teng kenglikdagi ustun yaratish uchun?', code: '.grid {\n  display: grid;\n  /* ??? */\n}', options: ['grid-columns: 3;', 'grid-template-columns: repeat(3, 1fr);', 'columns: 3;', 'grid: 3;'], correctAnswer: 1, explanation: 'grid-template-columns: repeat(3, 1fr) — 3 ta teng ustun hosil qiladi.' },
    { question: 'CSS\'da eng yuqori ustunlik (specificity) qaysi biriga tegishli?', options: ['Element selektor (div)', 'Class selektor (.box)', 'ID selektor (#box)', 'Inline style (style="...")'], correctAnswer: 3, explanation: 'Ustunlik tartibi: inline > ID > class > element. !important esa hammasidan yuqori.' },
    { question: 'position: absolute element nimaga nisbatan joylashadi?', code: '.child {\n  position: absolute;\n  top: 0;\n}', options: ['Har doim <body> ga', 'Eng yaqin position != static bo\'lgan ota elementga', 'Har doim ekranga', 'Keyingi elementga'], correctAnswer: 1, explanation: 'absolute — eng yaqin positioned (relative/absolute/fixed) ota elementga nisbatan joylashadi.' },
    { question: '@media (max-width: 600px) { ... } nima uchun ishlatiladi?', options: ['Rangni o\'zgartirish', 'Ekran 600px va undan kichik bo\'lganda uslub qo\'llash', 'Elementni butunlay yashirish', 'Animatsiya yaratish'], correctAnswer: 1, explanation: 'Media query — responsive dizayn uchun; ekran o\'lchamiga qarab uslub qo\'llaydi.' },
    { question: 'rem birligi nimaga nisbatan hisoblanadi?', options: ['Ota element font-size ga', 'Root (html) font-size ga', 'Ekran kengligiga', 'Har doim 16px'], correctAnswer: 1, explanation: 'rem — root (html) font-size ga nisbatan; em esa ota element font-size ga nisbatan.' },
    { question: 'z-index xususiyati qachon ishlaydi?', code: '.box {\n  z-index: 10;\n}', options: ['Har doim', 'Element position static bo\'lmaganda (relative/absolute/fixed)', 'Faqat flexbox\'da', 'Faqat grid\'da'], correctAnswer: 1, explanation: 'z-index faqat positioned (static\'dan tashqari) elementlarda ishlaydi.' },
    { question: 'Bu transition qatori nima qiladi?', code: '.btn {\n  transition: background 0.3s ease;\n}', options: ['Fonni yashiradi', 'background o\'zgarishini 0.3 soniyada silliq animatsiya qiladi', 'Tugmani kattalashtiradi', 'Hech narsa qilmaydi'], correctAnswer: 1, explanation: 'transition — xususiyat o\'zgarishini belgilangan vaqt ichida silliq animatsiya qiladi.' },
    { question: 'position: fixed element nimaga nisbatan joylashadi?', code: '.top {\n  position: fixed;\n  top: 0;\n}', options: ['Eng yaqin ota elementga', 'Brauzer oynasiga (viewport) — skrollda ham joyida qoladi', 'Hujjat oxiriga', 'Keyingi elementga'], correctAnswer: 1, explanation: 'fixed — viewport\'ga nisbatan; sahifa skroll qilinsa ham o\'z joyida turadi.' },
    { question: 'position: sticky nima qiladi?', options: ['Elementni doim yashiradi', 'Skroll paytida belgilangan chegaraga yetganda "yopishib" qoladi', 'Elementni aylantiradi', 'Fon rangini o\'zgartiradi'], correctAnswer: 1, explanation: 'sticky — oddiy oqimda turadi, lekin skrollda top/bottom qiymatiga yetganda yopishadi.' },
    { question: 'grid-template-areas nima uchun ishlatiladi?', options: ['Ranglarni belgilash', 'Grid maketni nomlangan sohalar bilan tuzish', 'Animatsiya yaratish', 'Media query yozish'], correctAnswer: 1, explanation: 'grid-template-areas — sohalarga nom berib, maketni vizual joylashtirish imkonini beradi.' },
    { question: 'CSS Grid\'da 1fr birligi nimani bildiradi?', code: '.g {\n  grid-template-columns: 1fr 2fr;\n}', options: ['1 piksel', 'Bo\'sh joyning bir ulushi (fraction)', '1 foiz', '1 em'], correctAnswer: 1, explanation: 'fr — mavjud bo\'sh joyni ulushlarga bo\'ladi; 1fr 2fr — 1:2 nisbatda taqsimlaydi.' },
    { question: '::before psevdo-elementi nima qiladi?', options: ['Element oldiga kontent qo\'shadi', 'Elementni o\'chiradi', 'Faqat bosilganda ishlaydi', 'Ota elementni tanlaydi'], correctAnswer: 0, explanation: '::before — content xususiyati bilan element kontentidan oldin qo\'shimcha element hosil qiladi.' },
    { question: 'li:nth-child(2n) selektori nimani tanlaydi?', options: ['Barcha elementlarni', 'Juft o\'rindagi elementlarni', 'Faqat 2-elementni', 'Toq o\'rindagi elementlarni'], correctAnswer: 1, explanation: '2n — 2, 4, 6... ya\'ni juft o\'rindagilarni; toq uchun 2n+1 ishlatiladi.' },
    { question: 'transform: translateX(50px) nima qiladi?', options: ['Elementni o\'ngga 50px suradi', 'Elementni kattalashtiradi', 'Elementni aylantiradi', 'Elementni shaffof qiladi'], correctAnswer: 0, explanation: 'translateX — elementni gorizontal (X) o\'q bo\'ylab suradi; musbat qiymat o\'ngga.' },
    { question: 'CSS\'da !important nima qiladi?', options: ['Elementni o\'chiradi', 'Qoidaga eng yuqori ustunlik beradi', 'Xatolikni ko\'rsatadi', 'Faylni ulaydi'], correctAnswer: 1, explanation: '!important — boshqa barcha qoidalardan ustun turadi; ehtiyot bilan ishlatiladi.' },
    { question: '@keyframes nima uchun ishlatiladi?', code: '@keyframes yur {\n  from { left: 0; }\n  to   { left: 100px; }\n}', options: ['Media query uchun', 'Animatsiya bosqichlarini belgilash uchun', 'Grid tuzish uchun', 'Shrift ulash uchun'], correctAnswer: 1, explanation: '@keyframes — animatsiyaning from/to yoki foizli bosqichlarini belgilaydi.' },
    { question: 'vh birligi nimani bildiradi?', options: ['Viewport balandligining 1%', 'Ota element balandligi', '1 piksel', 'Root shrift o\'lchami'], correctAnswer: 0, explanation: '1vh — brauzer oynasi balandligining 1%; 100vh — to\'liq balandlik.' },
    { question: 'opacity: 0.5 nima qiladi?', options: ['Elementni yarim shaffof qiladi', 'Elementni butunlay yashiradi', 'Rangni oqartiradi', 'Elementni kattalashtiradi'], correctAnswer: 0, explanation: 'opacity — 0 (ko\'rinmas) dan 1 (to\'liq ko\'rinadigan) gacha shaffoflikni belgilaydi.' },
    { question: 'Flexbox\'da flex: 1 nima qiladi?', code: '.item {\n  flex: 1;\n}', options: ['Elementni yashiradi', 'Element mavjud bo\'sh joyni egallab teng cho\'ziladi', 'Elementni 1px qiladi', 'Chegara qo\'shadi'], correctAnswer: 1, explanation: 'flex: 1 — o\'sish (grow) koeffitsiyentini 1 qiladi; bo\'sh joy elementlar orasida teng bo\'linadi.' },
    { question: 'Rasm uchun object-fit: cover nima qiladi?', code: 'img {\n  width: 200px;\n  height: 200px;\n  object-fit: cover;\n}', options: ['Rasmni cho\'zib buzadi', 'Nisbatni saqlab konteynerni to\'ldiradi, ortiqchasi kesiladi', 'Rasmni yashiradi', 'Rasmni kichraytiradi'], correctAnswer: 1, explanation: 'cover — rasm nisbatini saqlaydi va konteynerni to\'ldiradi; sig\'magan qismi kesiladi.' },
];

const EXAMS = [
    { title: 'HTML & CSS — Boshlang\'ich (Easy)', level: 'easy', description: 'HTML teglari va CSS asoslari bo\'yicha boshlang\'ich daraja imtihoni.', questions: EASY, durationMinutes: 20, passScore: 60 },
    { title: 'HTML & CSS — O\'rta (Middle)', level: 'middle', description: 'Box model, flexbox, semantik teglar va formalar bo\'yicha o\'rta daraja.', questions: MIDDLE, durationMinutes: 25, passScore: 60 },
    { title: 'HTML & CSS — Pro', level: 'pro', description: 'CSS Grid, specificity, positioning, media query va murakkab mavzular.', questions: PRO, durationMinutes: 30, passScore: 70 },
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
