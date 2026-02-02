const mongoose = require('mongoose');

/**
 * users jadvalidagi telegramChatId va telegramToken indekslarini sparse qiladi.
 * Eski unique (sparse siz) indeks bir nechta null qiymatga ruxsat bermaydi — ro'yxatdan o'tish 500 beradi.
 * Ishga tushganda bir marta indekslarni tuzatishga urinadi.
 */
async function ensureTelegramIndexesSparse() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const collection = db.collection('users');

    const indexes = await collection.indexes();

    for (const name of ['telegramChatId_1', 'telegramToken_1']) {
      if (indexes.some((idx) => idx.name === name)) {
        try {
          await collection.dropIndex(name);
          console.log(`📌 Indeks o'chirildi: ${name}`);
        } catch (e) {
          if (e.code !== 27) console.warn(`Indeks o'chirishda xato (${name}):`, e.message);
        }
      }
    }

    await collection.createIndex({ telegramChatId: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ telegramToken: 1 }, { unique: true, sparse: true });
    console.log('📌 Telegram sparse indekslar tekshirildi.');
  } catch (error) {
    console.warn('📌 Telegram indekslarni tuzatishda xato (ro\'yxatdan o\'tish buzilishi mumkin):', error.message);
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB ulangan: ${conn.connection.host}`);
    await ensureTelegramIndexesSparse();
  } catch (error) {
    console.error(`❌ MongoDB xatosi: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;