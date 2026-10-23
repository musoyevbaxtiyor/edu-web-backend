# Telegram Bot O'rnatish va Sozlash

## 1. Telegram Bot Yaratish

1. Telegram'da [@BotFather](https://t.me/botfather) ga o'ting
2. `/newbot` buyrug'ini yuboring
3. Bot uchun nom va username tanlang
4. BotFather sizga bot token beradi (masalan: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 2. Environment Variables Sozlash

`.env` faylga quyidagi o'zgaruvchilarni qo'shing:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username_here
# Ixtiyoriy: tashqi bot uchun HTTP marshrutlarning maxfiy kaliti (X-Bot-Secret).
# Berilmasa, bu marshrutlar yopiq bo'ladi (serverdagi bot ularsiz ishlaydi).
TELEGRAM_INTERNAL_SECRET=uzun_tasodifiy_satr
```

Bot server bilan bitta jarayonda ishlaydi va ma'lumotlarni to'g'ridan-to'g'ri bazadan oladi,
shuning uchun `BASE_URL` bot uchun endi kerak emas.

## 3. Paketlarni O'rnatish

```bash
npm install
```

Bu quyidagi paketlarni o'rnatadi:
- `telegraf` - Telegram Bot API

## 4. Serverni Ishga Tushirish

```bash
npm start
# yoki
npm run dev
```

Bot avtomatik ishga tushadi va quyidagi xabarni ko'rasiz:
```
🤖 Telegram bot ishga tushdi!
```

Agar bot ulana olmasa (tarmoq xatosi yoki deploy paytida `409 Conflict` — ikkita nusxa bir vaqtda ishlasa),
server to'xtamaydi: bot 5 soniyadan 5 daqiqagacha oraliqda qayta ishga tushirishga urinadi.
Bitta xabardagi xato ham botni to'xtatmaydi — u faqat logga yoziladi.

## 5. Foydalanish

### O'quvchilar uchun:
1. Saytda Profil sahifasini oching
2. "Telegram ulash" tugmasini, so'ng "Telegram botini ochish" tugmasini bosing
3. Telegram'da bot ochiladi — `Start` tugmasini bosing va hisob avtomatik ulanadi
4. Yoki botga `/login` yuborib, email va parol bilan kiring
5. Bot orqali quyidagi ma'lumotlarni ko'rishingiz mumkin:
   - Statistika (kurslar, progress, ballar)
   - Tasdiqlangan darslar
   - Coins va ballar

### O'qituvchilar va adminlar uchun:
1. Profil sahifasidagi "Telegram ulash" orqali yoki `/login` bilan ulaning
2. Bot orqali quyidagi ma'lumotlarni ko'rishingiz mumkin:
   - Yangi (tekshirilmagan) vazifalar — o'qituvchi o'z kurslaridagini, admin barcha kurslardagini ko'radi
   - Barcha vazifalar ro'yxati

## 6. Bot Buyruqlari

- `/start` - Botni boshlash va ulash
- `/login` - Login va parol orqali ulanish (boshqa hisobga o'tish)
- `/help` - Yordam
- `/menu` - Asosiy menyu
- `/stats` - Statistika (O'quvchilar uchun)
- `/notifications` - Xabarlar (O'qituvchilar uchun)

## 7. Muammolarni Hal Qilish

### Bot ishlamayapti:
- `.env` faylda `TELEGRAM_BOT_TOKEN` to'g'ri sozlanganligini tekshiring
- Serverni qayta ishga tushiring
- Console'da xatolarni tekshiring

### Foydalanuvchi ulanmayapti:
- Profil sahifasidan yangi havola oling (havola bir martalik)
- Bot username to'g'ri sozlanganligini tekshiring
- Database'da `telegramChatId` saqlanganligini tekshiring

## 8. API Endpoints

- `GET /api/telegram/token` - Foydalanuvchi uchun token olish (JWT talab qilinadi)

Quyidagilar faqat bot uchun va `X-Bot-Secret` sarlavhasida `TELEGRAM_INTERNAL_SECRET` qiymatini talab qiladi.
`TELEGRAM_INTERNAL_SECRET` berilmasa, ular har doim 403 qaytaradi.
Serverdagi bot ularni chaqirmaydi — bir xil logikani to'g'ridan-to'g'ri ishlatadi:

- `POST /api/telegram/connect` - Token orqali chat ID ni ulash
- `POST /api/telegram/connect-login` - Email/parol orqali ulash
- `GET /api/telegram/student-data/:chatId` - O'quvchi ma'lumotlari
- `GET /api/telegram/teacher-notifications/:chatId` - O'qituvchi/admin xabarlari

## 9. Xavfsizlik

- Har bir foydalanuvchi uchun unique token yaratiladi (32 belgi, Telegram deep-link chegarasi 64 belgidan qisqa)
- Token faqat bir marta ishlatiladi: ulangandan keyin o'chiriladi, Profil sahifasi yangisini yaratadi
- Eski uzun tokenlar Profil sahifasida "Telegram ulash" bosilganda avtomatik yangilanadi
  (yangilanguncha eski token `/start <token>` qilib qo'lda yuborilsa ham ishlaydi)
- Chat ID database'da saqlanadi va faqat bot orqali yangilanadi; bitta chat boshqa hisobga ulansa, eski hisobdan uziladi
- Bot marshrutlari `X-Bot-Secret` sarlavhasisiz ishlamaydi
- Login orqali kirishda parolli xabar chatdan darhol o'chiriladi; 5 marta noto'g'ri urinishdan keyin 15 daqiqa kutish kerak
- Ballar saytdagi reyting bilan bir xil hisoblanadi (vazifa + test + amaliy + imtihon)
