const path = require('path');
const fs = require('fs');

// Production (Render): UPLOAD_DIR ni persistent diskka qo'ying, masalan /opt/render/project/data/uploads
// path.resolve — nisbiy UPLOAD_DIR berilsa ham res.sendFile uchun absolyut yo'l bo'ladi
const UPLOADS_BASE = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));

// Multer fayl nomini latin1 deb o'qiydi — UTF-8 (kirill/o'zbekcha) nomlarni tiklaymiz
const decodeOriginalName = (name) => {
    if (!name) return '';
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
};

// Fayl nomiga kiradigan qiymatlarni tozalash (path traversal oldini olish)
const safeSegment = (value, fallback) => {
    const clean = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
    return clean || fallback;
};

// Saqlangan URL (/uploads/<papka>/<fayl>) -> diskdagi absolyut yo'l; fayl bo'lmasa null
const resolveUpload = (folder, storedUrl) => {
    if (!storedUrl) return null;
    const filePath = path.join(UPLOADS_BASE, folder, path.basename(storedUrl));
    return fs.existsSync(filePath) ? filePath : null;
};

// Faylni yuklab berish — UTF-8 nomlar uchun RFC 5987 Content-Disposition
const sendUpload = (res, filePath, downloadName) => {
    const name = downloadName || path.basename(filePath);
    const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
};

module.exports = { UPLOADS_BASE, decodeOriginalName, safeSegment, resolveUpload, sendUpload };
