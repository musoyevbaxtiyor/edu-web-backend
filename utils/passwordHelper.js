const bcrypt = require('bcryptjs');

// Parolni xesh bilan solishtirish.
// bcrypt satr bo'lmagan qiymatda xato tashlaydi — bunday holda shunchaki false qaytaramiz
const comparePassword = async (plain, hash) => {
    if (typeof plain !== 'string' || typeof hash !== 'string' || !plain) return false;
    return bcrypt.compare(plain, hash);
};

module.exports = { comparePassword };
