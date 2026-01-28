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
BASE_URL=http://localhost:10000  # yoki production URL
```

## 3. Paketlarni O'rnatish

```bash
npm install
```

Bu quyidagi paketlarni o'rnatadi:
- `telegraf` - Telegram Bot API
- `axios` - HTTP so'rovlar uchun

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

## 5. Foydalanish

### O'quvchilar uchun:
1. Dashboard'ga kiring
2. "Telegram Bot" kartasida "Botga O'tish" tugmasini bosing
3. Telegram'da bot linki ochiladi
4. Botda `/start` buyrug'ini bosing yoki link orqali avtomatik ulanasiz
5. Bot orqali quyidagi ma'lumotlarni ko'rishingiz mumkin:
   - Statistika (kurslar, progress, ballar)
   - Tasdiqlangan darslar
   - Coins va ballar

### O'qituvchilar uchun:
1. Dashboard'ga kiring
2. "Telegram Bot" kartasida "Botga O'tish" tugmasini bosing
3. Telegram'da bot linki ochiladi
4. Botda `/start` buyrug'ini bosing
5. Bot orqali quyidagi ma'lumotlarni ko'rishingiz mumkin:
   - Yangi vazifalar
   - Barcha vazifalar ro'yxati

## 6. Bot Buyruqlari

- `/start` - Botni boshlash va ulash
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
- Dashboard'dan yangi token olishga harakat qiling
- Bot username to'g'ri sozlanganligini tekshiring
- Database'da `telegramChatId` saqlanganligini tekshiring

## 8. API Endpoints

- `GET /api/telegram/token` - Foydalanuvchi uchun token olish
- `POST /api/telegram/connect` - Telegram chat ID ni ulash
- `GET /api/telegram/student-data/:chatId` - O'quvchi ma'lumotlari
- `GET /api/telegram/teacher-notifications/:chatId` - O'qituvchi xabarlari

## 9. Xavfsizlik

- Har bir foydalanuvchi uchun unique token yaratiladi
- Token faqat bir marta ishlatiladi (ulash uchun)
- Chat ID database'da saqlanadi va faqat bot orqali yangilanadi
