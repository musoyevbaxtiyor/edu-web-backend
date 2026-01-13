require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB ulangan: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB xatosi: ${error.message}`);
        process.exit(1);
    }
};

async function addCoinsToUsers() {
    try {
        await connectDB();

        console.log('🔄 Barcha foydalanuvchilar uchun coins maydonini qo\'shish boshlandi...');

        // Barcha foydalanuvchilarni topish (coins maydoni yo'q yoki undefined bo'lganlar)
        const result = await User.updateMany(
            { 
                $or: [
                    { coins: { $exists: false } },
                    { coins: null }
                ]
            },
            { 
                $set: { coins: 0 }
            }
        );

        console.log(`✅ ${result.modifiedCount} ta foydalanuvchi yangilandi.`);
        console.log(`📊 Jami topilgan: ${result.matchedCount} ta`);
        
        // Barcha foydalanuvchilarni ko'rsatish (tekshirish uchun)
        const allUsers = await User.find({}).select('name email coins').limit(5);
        console.log('\n📋 Namuna foydalanuvchilar:');
        allUsers.forEach(user => {
            console.log(`  - ${user.name} (${user.email}): ${user.coins ?? 0} coins`);
        });

        console.log('\n✅ Migration muvaffaqiyatli yakunlandi!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration xatosi:', error);
        process.exit(1);
    }
}

addCoinsToUsers();
