/**
 * telegramChatId va telegramToken indekslarini sparse qilish uchun skript.
 * Eski unique indeks (sparse siz) bir nechta null qiymatga ruxsat bermaydi.
 * Bu skriptni bir marta ishga tushiring: node scripts/fixTelegramIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB ga ulandik.');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        try {
            await collection.dropIndex('telegramChatId_1');
            console.log('telegramChatId_1 indeks o\'chirildi.');
        } catch (e) {
            if (e.code === 27) {
                console.log('telegramChatId_1 indeks mavjud emas, o\'tkazildi.');
            } else {
                throw e;
            }
        }

        try {
            await collection.dropIndex('telegramToken_1');
            console.log('telegramToken_1 indeks o\'chirildi.');
        } catch (e) {
            if (e.code === 27) {
                console.log('telegramToken_1 indeks mavjud emas, o\'tkazildi.');
            } else {
                throw e;
            }
        }

        // Yangi sparse unique indekslarni yaratish
        await collection.createIndex({ telegramChatId: 1 }, { unique: true, sparse: true });
        console.log('telegramChatId sparse unique indeks yaratildi.');
        await collection.createIndex({ telegramToken: 1 }, { unique: true, sparse: true });
        console.log('telegramToken sparse unique indeks yaratildi.');

        console.log('Tayyor! Endi serverni qayta ishga tushiring.');
    } catch (error) {
        console.error('Xato:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixIndexes();
