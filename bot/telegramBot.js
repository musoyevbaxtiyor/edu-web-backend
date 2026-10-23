const { Telegraf, session } = require('telegraf');
const User = require('../models/userModel');
// Bot API bilan bitta jarayonda ishlaydi — HTTP o'rniga servis funksiyalarini to'g'ridan-to'g'ri chaqiramiz
const {
    linkChatByToken,
    linkChatByLogin,
    getStudentDataByChat,
    getTeacherNotificationsByChat
} = require('../controllers/telegramController');

// Markdown (eski rejim) uchun foydalanuvchi matnini ekranlash (ism, email, kurs nomi xabarni buzmasin)
const md = (value) => String(value ?? '').replace(/([_*`[])/g, '\\$1');
// Qalin (*...*) ichida ekranlash ishlamaydi — faqat '*' belgisini almashtiramiz
const bold = (value) => `*${String(value ?? '').replace(/\*/g, '∗')}*`;

// Login urinishlarini cheklash (parol tanlashdan himoya)
const LOGIN_MAX_FAILURES = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;

// Ishga tushmasa qayta urinish oralig'i
const RELAUNCH_MIN_MS = 5 * 1000;
const RELAUNCH_MAX_MS = 5 * 60 * 1000;

class TelegramBot {
    constructor() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (!botToken) {
            console.warn('⚠️  TELEGRAM_BOT_TOKEN .env faylida topilmadi. Bot ishlamaydi.');
            return;
        }

        this.bot = new Telegraf(botToken);
        this.stopped = false;
        this.launchAttempt = 0;
        this.loginFailures = new Map();

        // Bitta handlerdagi xato butun botni (polling) to'xtatib qo'ymasin
        this.bot.catch(async (error, ctx) => {
            console.error(`❌ Telegram bot xatosi (${ctx?.updateType || 'update'}):`, error?.message || error);
            try {
                await ctx.reply('❌ Kutilmagan xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.');
            } catch (_) {
                // Javob yuborib bo'lmadi (masalan, foydalanuvchi botni bloklagan)
            }
        });

        // Session middleware qo'shish (login/parol saqlash uchun)
        this.bot.use(session());

        this.setupCommands();

        // Text message handler (login/parol kiritish uchun) - setupCommands dan keyin
        this.bot.on('text', async (ctx) => {
            // Agar start command bo'lmasa va session mavjud bo'lsa
            if (!ctx.message.text.startsWith('/')) {
                const session = ctx.session || {};

                if (session.waitingForEmail) {
                    // Email kutilmoqda
                    await this.handleEmailInput(ctx, ctx.message.text);
                } else if (session.waitingForPassword) {
                    // Parol kutilmoqda
                    await this.handlePasswordInput(ctx, ctx.message.text);
                }
            }
        });
    }

    // Xato matni: kutilgan (statusCode li) xatolar foydalanuvchiga, qolganlari faqat logga
    errorText(error, fallback = 'Ma\'lumotlarni yuklashda xato') {
        if (error?.statusCode) return error.message;
        console.error('❌ Telegram bot:', error?.message || error);
        return fallback;
    }

    setupCommands() {
        // Start command
        this.bot.start(async (ctx) => {
            const startParam = ctx.message.text.trim().split(/\s+/)[1]; // /start TOKEN
            const chatId = ctx.chat.id.toString();

            if (startParam) {
                // Token bilan ulash
                try {
                    await linkChatByToken(startParam, chatId);

                    await ctx.reply(
                        '✅ *Telegram muvaffaqiyatli ulandi!*\n\n' +
                        'Endi siz o\'z ma\'lumotlaringizni ko\'rishingiz mumkin.',
                        { parse_mode: 'Markdown' }
                    );

                    // Foydalanuvchi roliga qarab menyu ko'rsatish
                    await this.showMainMenu(ctx);
                    return;
                } catch (error) {
                    // Token bir martalik: chat allaqachon ulangan bo'lsa, menyuni ko'rsatamiz
                    if (await User.exists({ telegramChatId: chatId })) {
                        await ctx.reply('ℹ️ Bu havola eskirgan, lekin Telegram hisobingiz allaqachon ulangan.');
                        await this.showMainMenu(ctx);
                        return;
                    }
                    await ctx.reply(
                        '❌ Xato: ' + this.errorText(error, 'Noto\'g\'ri token') +
                        '\n\nSaytdagi Profil sahifasidan yangi havola oling yoki login/parol orqali kiring.'
                    );
                }
            } else if (await User.exists({ telegramChatId: chatId })) {
                // Allaqachon ulangan — parolni qayta so'ramaymiz
                await ctx.reply('ℹ️ Telegram hisobingiz allaqachon ulangan. Boshqa hisobga o\'tish uchun /login buyrug\'ini yuboring.');
                await this.showMainMenu(ctx);
                return;
            }

            // Token bo'lmasa yoki noto'g'ri bo'lsa, login va parol so'raymiz
            await this.requestLogin(ctx);
        });

        // Login command (boshqa hisobga ulanish uchun)
        this.bot.command('login', async (ctx) => {
            await this.requestLogin(ctx);
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '📚 *Yordam*\n\n' +
                '/start - Botni boshlash\n' +
                '/login - Login va parol orqali ulanish\n' +
                '/menu - Asosiy menyu\n' +
                '/stats - Statistika (O\'quvchilar uchun)\n' +
                '/notifications - Xabarlar (O\'qituvchilar uchun)\n' +
                '/help - Yordam',
                { parse_mode: 'Markdown' }
            );
        });

        // Menu command
        this.bot.command('menu', async (ctx) => {
            await this.showMainMenu(ctx);
        });

        // Stats command (o'quvchilar uchun)
        this.bot.command('stats', async (ctx) => {
            await this.showStudentStats(ctx);
        });

        // Notifications command (o'qituvchilar uchun)
        this.bot.command('notifications', async (ctx) => {
            await this.showTeacherNotifications(ctx);
        });

        // Inline keyboard handlers
        const actions = {
            show_stats: (ctx) => this.showStudentStats(ctx),
            show_notifications: (ctx) => this.showTeacherNotifications(ctx),
            show_menu: (ctx) => this.showMainMenu(ctx),
            show_lessons: (ctx) => this.showApprovedLessons(ctx),
            show_scores: (ctx) => this.showScores(ctx),
            show_all_submissions: (ctx) => this.showTeacherNotifications(ctx),
            show_completed_courses: (ctx) => this.showCompletedCourses(ctx),
            show_in_progress_courses: (ctx) => this.showInProgressCourses(ctx),
            show_all_courses: (ctx) => this.showAllCourses(ctx)
        };

        Object.entries(actions).forEach(([name, handler]) => {
            this.bot.action(name, async (ctx) => {
                // Eski tugma bosilsa "query is too old" xatosi chiqadi — e'tiborsiz qoldiramiz
                await ctx.answerCbQuery().catch(() => {});
                await handler(ctx);
            });
        });
    }

    async requestLogin(ctx) {
        // Login va parol so'rash
        await ctx.reply(
            '🔐 *Tizimga kirish*\n\n' +
            'Botdan foydalanish uchun web saytdagi login va parolingizni kiriting.\n' +
            'Qulayroq usul: saytdagi Profil sahifasida "Telegram ulash" tugmasini bosing.\n\n' +
            'Iltimos, email manzilingizni yuboring:',
            { parse_mode: 'Markdown' }
        );

        // Email kutilayotganini saqlash
        ctx.session = { waitingForEmail: true };
    }

    async handleEmailInput(ctx, email) {
        ctx.session = ctx.session || {};
        ctx.session.email = email.trim();
        ctx.session.waitingForEmail = false;
        ctx.session.waitingForPassword = true;

        await ctx.reply('🔑 Endi parolingizni yuboring (xabar o\'qilgach chatdan o\'chiriladi):');
    }

    // Noto'g'ri urinishlar soni chegaradan oshganmi
    isLoginBlocked(keys) {
        const now = Date.now();
        return keys.some((key) => {
            const entry = this.loginFailures.get(key);
            if (!entry) return false;
            if (entry.until <= now) {
                this.loginFailures.delete(key);
                return false;
            }
            return entry.count >= LOGIN_MAX_FAILURES;
        });
    }

    recordLoginFailure(keys) {
        const now = Date.now();
        // Eskirgan yozuvlarni vaqti-vaqti bilan tozalash
        if (this.loginFailures.size > 5000) {
            for (const [key, entry] of this.loginFailures) {
                if (entry.until <= now) this.loginFailures.delete(key);
            }
        }
        keys.forEach((key) => {
            const entry = this.loginFailures.get(key);
            if (!entry || entry.until <= now) {
                this.loginFailures.set(key, { count: 1, until: now + LOGIN_BLOCK_MS });
            } else {
                entry.count++;
            }
        });
    }

    async handlePasswordInput(ctx, password) {
        const chatId = ctx.chat.id.toString();
        const email = ctx.session?.email;
        // Parol xotirada ham qolmasin
        ctx.session = {};

        // Parolli xabarni chatdan o'chiramiz (tarixda ochiq qolmasin)
        try {
            await ctx.deleteMessage(ctx.message.message_id);
        } catch (_) {
            // O'chirib bo'lmadi (masalan, 48 soatdan eski yoki huquq yo'q)
        }

        if (!email) {
            await ctx.reply('❌ Xato yuz berdi. Qaytadan /login buyrug\'ini yuboring.');
            return;
        }

        const limitKeys = [`chat:${chatId}`, `email:${email.toLowerCase()}`];
        if (this.isLoginBlocked(limitKeys)) {
            await ctx.reply('⏳ Juda ko\'p noto\'g\'ri urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.');
            return;
        }

        try {
            // Login va parol orqali ulash
            const user = await linkChatByLogin(email, password, chatId);
            limitKeys.forEach((key) => this.loginFailures.delete(key));

            await ctx.reply(
                '✅ *Muvaffaqiyatli kirdingiz!*\n\n' +
                `Xush kelibsiz, ${md(user.name)}!\n\n` +
                'Endi siz o\'z ma\'lumotlaringizni ko\'rishingiz mumkin.',
                { parse_mode: 'Markdown' }
            );

            // Foydalanuvchi roliga qarab menyu ko'rsatish
            await this.showMainMenu(ctx);
        } catch (error) {
            if (error?.statusCode === 401) this.recordLoginFailure(limitKeys);
            await ctx.reply(
                '❌ Xato: ' + this.errorText(error, 'Email yoki parol noto\'g\'ri') +
                '\n\nQaytadan /login buyrug\'ini yuboring va to\'g\'ri ma\'lumotlarni kiriting.'
            );
        }
    }

    async showMainMenu(ctx) {
        const chatId = ctx.chat.id.toString();
        const user = await User.findOne({ telegramChatId: chatId });

        if (!user) {
            await ctx.reply('❌ Siz hali botga ulanmagansiz. /start buyrug\'ini bosing va login/parol kiriting.');
            return;
        }

        if (user.role === 'student') {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 To\'liq Statistika', callback_data: 'show_stats' }],
                    [{ text: '✅ Tugallangan Kurslar', callback_data: 'show_completed_courses' }],
                    [{ text: '📚 Davom Etayotgan Kurslar', callback_data: 'show_in_progress_courses' }],
                    [{ text: '📝 Tasdiqlangan Darslar', callback_data: 'show_lessons' }],
                    [{ text: '💰 Coins va Ballar', callback_data: 'show_scores' }],
                    [{ text: '📋 Barcha Kurslar', callback_data: 'show_all_courses' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(
                '👤 *Asosiy Menyu*\n\n' +
                `Ism: ${md(user.name)}\n` +
                `Email: ${md(user.email)}\n` +
                `Rol: O'quvchi\n\n` +
                'Quyidagi tugmalardan birini tanlang:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        } else if (user.role === 'teacher' || user.role === 'admin') {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔔 Yangi Vazifalar', callback_data: 'show_notifications' }],
                    [{ text: '📋 Barcha Vazifalar', callback_data: 'show_all_submissions' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(
                (user.role === 'admin' ? '🛡 *Admin Paneli*\n\n' : '👨‍🏫 *O\'qituvchi Paneli*\n\n') +
                `Ism: ${md(user.name)}\n` +
                `Email: ${md(user.email)}\n\n` +
                'Quyidagi tugmalardan birini tanlang:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        }
    }

    async showStudentStats(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const data = await getStudentDataByChat(chatId);
            const { user, statistics, recentApprovedLessons } = data;

            let message = '📊 *To\'liq Statistika*\n\n';
            message += `👤 *Foydalanuvchi:*\n`;
            message += `💰 Coins: *${user.coins}*\n\n`;
            message += `📚 *Kurslar:*\n`;
            message += `   Jami: ${statistics.totalCourses}\n`;
            message += `   ✅ Tugallangan: ${statistics.completedCourses}\n`;
            message += `   📈 O'rtacha Progress: ${statistics.averageProgress}%\n\n`;
            message += `🎯 *Ballar:*\n`;
            message += `   Umumiy: *${statistics.totalScore}*\n`;
            message += `   📝 Vazifa: ${statistics.submissionScore}\n`;
            message += `   🧪 Test: ${statistics.testScore}\n`;
            message += `   🛠 Amaliy: ${statistics.practiceScore}\n`;
            message += `   🎓 Imtihon: ${statistics.examScore}\n\n`;

            if (recentApprovedLessons.length > 0) {
                message += '✅ *Oxirgi Tasdiqlangan Darslar:*\n\n';
                recentApprovedLessons.slice(0, 3).forEach((lesson, index) => {
                    message += `${index + 1}. ${bold(lesson.lessonTitle)}\n`;
                    message += `   📚 ${md(lesson.courseTitle)}\n`;
                    message += `   ⭐ ${lesson.grade}/100 | 💰 +${lesson.coins}\n`;
                    message += `   📅 ${new Date(lesson.date).toLocaleDateString('uz-UZ')}\n\n`;
                });
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '✅ Tugallangan Kurslar', callback_data: 'show_completed_courses' }],
                    [{ text: '📚 Davom Etayotgan', callback_data: 'show_in_progress_courses' }],
                    [{ text: '📋 Barcha Kurslar', callback_data: 'show_all_courses' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showCompletedCourses(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const data = await getStudentDataByChat(chatId);

            if (!data.completedCourses || data.completedCourses.length === 0) {
                await ctx.reply('✅ Hozirda tugallangan kurslar yo\'q.');
                return;
            }

            let message = '✅ *Tugallangan Kurslar*\n\n';

            data.completedCourses.forEach((course, index) => {
                message += `${index + 1}. ${bold(course.title)}\n`;
                message += `   📈 Progress: ${course.progress}%\n`;
                message += `   📚 Darslar: ${course.completedLessons}/${course.totalLessons}\n`;
                message += `   📅 Ro'yxatdan o'tish: ${new Date(course.enrolledAt).toLocaleDateString('uz-UZ')}\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 Statistika', callback_data: 'show_stats' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showInProgressCourses(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const data = await getStudentDataByChat(chatId);

            if (!data.inProgressCourses || data.inProgressCourses.length === 0) {
                await ctx.reply('📚 Hozirda davom etayotgan kurslar yo\'q.');
                return;
            }

            let message = '📚 *Davom Etayotgan Kurslar*\n\n';

            data.inProgressCourses.forEach((course, index) => {
                message += `${index + 1}. ${bold(course.title)}\n`;
                message += `   📈 Progress: ${course.progress}%\n`;
                message += `   📚 Darslar: ${course.completedLessons}/${course.totalLessons}\n`;
                message += `   📅 Ro'yxatdan o'tish: ${new Date(course.enrolledAt).toLocaleDateString('uz-UZ')}\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 Statistika', callback_data: 'show_stats' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showAllCourses(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const data = await getStudentDataByChat(chatId);

            if (!data.courses || data.courses.length === 0) {
                await ctx.reply('📚 Hozirda kurslar yo\'q.');
                return;
            }

            let message = '📋 *Barcha Kurslar*\n\n';

            data.courses.forEach((course, index) => {
                const status = course.isCompleted ? '✅' : '📚';
                message += `${status} ${index + 1}. ${bold(course.title)}\n`;
                message += `   📈 Progress: ${course.progress}%\n`;
                message += `   📚 Darslar: ${course.completedLessons}/${course.totalLessons}\n`;
                if (course.description) {
                    message += `   📝 ${md(course.description.substring(0, 50))}${course.description.length > 50 ? '...' : ''}\n`;
                }
                message += `   📅 ${new Date(course.enrolledAt).toLocaleDateString('uz-UZ')}\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '✅ Tugallangan', callback_data: 'show_completed_courses' }],
                    [{ text: '📚 Davom Etayotgan', callback_data: 'show_in_progress_courses' }],
                    [{ text: '📊 Statistika', callback_data: 'show_stats' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showApprovedLessons(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const { recentApprovedLessons } = await getStudentDataByChat(chatId);

            if (!recentApprovedLessons || recentApprovedLessons.length === 0) {
                await ctx.reply('📝 Hozirda tasdiqlangan darslar yo\'q.');
                return;
            }

            let message = '✅ *Tasdiqlangan Darslar*\n\n';

            recentApprovedLessons.forEach((lesson, index) => {
                message += `${index + 1}. ${bold(lesson.lessonTitle)}\n`;
                message += `   📚 Kurs: ${md(lesson.courseTitle)}\n`;
                message += `   ⭐ Ball: ${lesson.grade}/100\n`;
                message += `   💰 Coins: +${lesson.coins}\n`;
                message += `   📅 Sana: ${new Date(lesson.date).toLocaleDateString('uz-UZ')}\n\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 Statistika', callback_data: 'show_stats' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showScores(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const { user, statistics } = await getStudentDataByChat(chatId);

            let message = '💰 *Coins va Ballar*\n\n';
            message += `💰 *Coins:* ${user.coins}\n\n`;
            message += `🎯 *Umumiy Ball:* ${statistics.totalScore}\n`;
            message += `📝 *Vazifa Ballari:* ${statistics.submissionScore}\n`;
            message += `🧪 *Test Ballari:* ${statistics.testScore}\n`;
            message += `🛠 *Amaliy Ballar:* ${statistics.practiceScore}\n`;
            message += `🎓 *Imtihon Ballari:* ${statistics.examScore}\n\n`;
            message += `📚 *Kurslar:*\n`;
            message += `   Jami: ${statistics.totalCourses}\n`;
            message += `   ✅ Tugallangan: ${statistics.completedCourses}\n`;
            message += `   📈 Progress: ${statistics.averageProgress}%\n`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 To\'liq Statistika', callback_data: 'show_stats' }],
                    [{ text: '✅ Tugallangan Kurslar', callback_data: 'show_completed_courses' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    async showTeacherNotifications(ctx) {
        const chatId = ctx.chat.id.toString();

        try {
            const { count, submissions } = await getTeacherNotificationsByChat(chatId);

            let message = '🔔 *Yangi Vazifalar*\n\n';
            message += `Jami: ${count} ta\n\n`;

            if (submissions.length === 0) {
                message += 'Hozirda tekshirilmagan vazifalar yo\'q.';
            } else {
                submissions.slice(0, 10).forEach((sub, index) => {
                    message += `${index + 1}. ${bold(sub.studentName)}\n`;
                    message += `   Dars: ${md(sub.lessonTitle)}\n`;
                    message += `   Kurs: ${md(sub.courseTitle)}\n`;
                    message += `   Holat: ${sub.status === 'submitted' ? 'Yuborilgan' : 'Ko\'rib chiqilmoqda'}\n`;
                    message += `   Sana: ${new Date(sub.createdAt).toLocaleDateString('uz-UZ')}\n`;
                    if (sub.hasFile) {
                        message += `   📎 Fayl mavjud\n`;
                    }
                    message += '\n';
                });
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            await ctx.reply('❌ Xato: ' + this.errorText(error));
        }
    }

    // Polling ni ishga tushirish; xato bo'lsa (tarmoq, 409 Conflict) keyinroq qayta urinadi
    launch() {
        if (this.stopped) return;
        const startedAt = Date.now();

        this.bot.launch({}, () => {
            console.log('🤖 Telegram bot ishga tushdi!');
        }).then(() => {
            console.log('🛑 Telegram bot to\'xtatildi');
        }).catch((error) => {
            if (this.stopped) return;
            console.error('❌ Telegram bot ishga tushmadi:', error.message);

            // Token noto'g'ri — qayta urinish foydasiz
            if (error.response?.error_code === 401) return;

            // Uzoq ishlagan bo'lsa, kutish vaqtini boshidan boshlaymiz
            if (Date.now() - startedAt > 60 * 1000) this.launchAttempt = 0;
            const delay = Math.min(RELAUNCH_MIN_MS * 2 ** this.launchAttempt, RELAUNCH_MAX_MS);
            this.launchAttempt++;
            console.log(`🔁 Telegram bot ${Math.round(delay / 1000)} soniyadan so'ng qayta ishga tushiriladi`);

            this.retryTimer = setTimeout(() => this.launch(), delay);
            this.retryTimer.unref?.();
        });
    }

    stop(reason) {
        this.stopped = true;
        clearTimeout(this.retryTimer);
        try {
            this.bot.stop(reason);
        } catch (_) {
            // Bot hali ishga tushmagan
        }
    }

    start() {
        if (!this.bot) {
            console.warn('⚠️  Bot ishlamaydi - token topilmadi');
            return;
        }

        this.launch();

        // Graceful stop
        process.once('SIGINT', () => this.stop('SIGINT'));
        process.once('SIGTERM', () => this.stop('SIGTERM'));
    }
}

module.exports = TelegramBot;
