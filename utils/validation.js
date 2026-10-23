// Umumiy validatsiya yordamchilari

// Frontend (Register.jsx) bilan bir xil email formati
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parolning minimal uzunligi (frontend va admin parol tiklash bilan bir xil)
const MIN_PASSWORD_LENGTH = 6;

// Emailning maksimal uzunligi (RFC 5321)
const MAX_EMAIL_LENGTH = 254;

// Emailni solishtirish uchun bir xil ko'rinishga keltirish
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const isValidEmail = (email) => typeof email === 'string'
    && email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);

// Matnni RegExp ichida xavfsiz ishlatish uchun maxsus belgilarni ekranlash
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
    EMAIL_REGEX,
    MIN_PASSWORD_LENGTH,
    MAX_EMAIL_LENGTH,
    normalizeEmail,
    isValidEmail,
    escapeRegex,
};
