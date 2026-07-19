// Global xatoliklarni JSON formatida qaytaruvchi middleware.
// Controllerlardagi `res.status(4xx); throw new Error(...)` naqshi shu yerda
// to'g'ri status va { message } bilan javobga aylanadi.

// Topilmagan marshrutlar uchun (404)
const notFound = (req, res, next) => {
    res.status(404);
    next(new Error(`Topilmadi - ${req.originalUrl}`));
};

// Asosiy xatolik ishlovchisi
const errorHandler = (err, req, res, next) => {
    // Agar controller res.status() bilan status bermagan bo'lsa, 500 ni ishlatamiz
    let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    let message = err.message || 'Serverda kutilmagan xatolik yuz berdi.';

    // Mongoose: noto'g'ri ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Resurs topilmadi (noto\'g\'ri ID).';
    }

    // Mongoose: unique (duplicate key) xatosi
    if (err.code === 11000) {
        statusCode = 400;
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'Maydon';
        message = `${field} allaqachon mavjud.`;
    }

    // Mongoose: validatsiya xatolari
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    // Multer: fayl hajmi xatosi
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'Fayl hajmi juda katta (maksimal 10 MB).';
    }

    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};

module.exports = { notFound, errorHandler };
