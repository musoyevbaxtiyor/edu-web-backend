// Oddiy in-memory rate limiter (tashqi kutubxonasiz).
// Holat jarayon xotirasida saqlanadi — bitta server instansiyasi uchun yetarli.
const { normalizeEmail, MAX_EMAIL_LENGTH } = require('../utils/validation');

const MAX_KEYS = 50000; // xotira cheksiz o'smasligi uchun

/**
 * @param {object} opts
 * @param {number} opts.windowMs  — oyna davomiyligi (ms)
 * @param {number} opts.max       — oynadagi ruxsat etilgan muvaffaqiyatsiz urinishlar
 * @param {(req) => string|null} opts.keyGenerator — kalit (null bo'lsa cheklanmaydi)
 * @param {boolean} [opts.resetOnSuccess] — muvaffaqiyatli javobda hisobni nolga tushirish
 */
const createRateLimiter = ({ windowMs, max, keyGenerator, resetOnSuccess = false }) => {
    const hits = new Map(); // key -> { count, resetAt }

    // Eskirgan yozuvlarni vaqti-vaqti bilan tozalash
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    if (timer.unref) timer.unref();

    return (req, res, next) => {
        const key = keyGenerator(req);
        if (!key) return next();

        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            if (!entry && hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value);
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        if (entry.count >= max) {
            const retrySec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.set('Retry-After', String(retrySec));
            return res.status(429).json({
                message: `Juda ko'p urinish. Iltimos, ${Math.ceil(retrySec / 60)} daqiqadan so'ng qayta urinib ko'ring.`,
            });
        }

        // Urinishni oldindan hisoblaymiz (parallel so'rovlar chegarani aylanib o'tmasin),
        // muvaffaqiyatli javob bo'lsa — qaytarib olamiz
        entry.count += 1;
        res.on('finish', () => {
            if (res.statusCode >= 400) return;
            if (resetOnSuccess) {
                if (hits.get(key) === entry) hits.delete(key);
            } else {
                entry.count = Math.max(0, entry.count - 1);
            }
        });
        next();
    };
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa

// Har bir hisob (email) uchun: 15 daqiqada 10 ta noto'g'ri urinish
const loginAccountLimiter = createRateLimiter({
    windowMs: LOGIN_WINDOW_MS,
    max: 10,
    resetOnSuccess: true,
    keyGenerator: (req) => {
        // Kalit uzunligi cheklanadi — juda uzun "email"lar bilan xotirani to'ldirib bo'lmasin
        const email = normalizeEmail(req.body?.email).slice(0, MAX_EMAIL_LENGTH);
        return email ? `email:${email}` : null;
    },
});

// Har bir IP uchun: 15 daqiqada 50 ta noto'g'ri urinish.
// Faqat 'trust proxy' yoqilgan bo'lsa ishlaydi — aks holda Render proksisi ortida
// barcha so'rovlar bitta IP'dan kelgandek ko'rinadi va hamma bloklanib qoladi
const loginIpLimiter = createRateLimiter({
    windowMs: LOGIN_WINDOW_MS,
    max: 50,
    keyGenerator: (req) => (req.app.get('trust proxy') && req.ip ? `ip:${req.ip}` : null),
});

module.exports = {
    createRateLimiter,
    loginAccountLimiter,
    loginIpLimiter,
    // Veb login uchun: IP + hisob bo'yicha
    loginLimiter: [loginIpLimiter, loginAccountLimiter],
};
