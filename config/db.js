const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // process.env.MONGO_URI .env faylidan olinadi
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB ulangan: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB xatosi: ${error.message}`);
    process.exit(1); // Xato bo'lsa, ilovani yopish
  }
};

module.exports = connectDB;