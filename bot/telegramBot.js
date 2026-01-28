const { Telegraf, session } = require('telegraf');
const User = require('../models/userModel');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';

class TelegramBot {
    constructor() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            console.warn('⚠️  TELEGRAM_BOT_TOKEN .env faylida topilmadi. Bot ishlamaydi.');
            return;
        }
        
        this.bot = new Telegraf(botToken);
        
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
    
    setupCommands() {
        // Start command
        this.bot.start(async (ctx) => {
            const startParam = ctx.message.text.split(' ')[1]; // /start TOKEN
            
            if (startParam) {
                // Token bilan ulash
                try {
                    const response = await axios.post(`${BASE_URL}/api/telegram/connect`, {
                        token: startParam,
                        chatId: ctx.chat.id.toString()
                    });
                    
                    if (response.data.success) {
                        await ctx.reply(
                            '✅ *Telegram muvaffaqiyatli ulandi!*\n\n' +
                            'Endi siz o\'z ma\'lumotlaringizni ko\'rishingiz mumkin.',
                            { parse_mode: 'Markdown' }
                        );
                        
                        // Foydalanuvchi roliga qarab menyu ko'rsatish
                        await this.showMainMenu(ctx);
                    }
                } catch (error) {
                    await ctx.reply(
                        '❌ Xato: ' + (error.response?.data?.message || 'Noto\'g\'ri token') +
                        '\n\nQaytadan /start buyrug\'ini bosing va login/parol kiriting.'
                    );
                    // Token noto'g'ri bo'lsa, login so'rash
                    await this.requestLogin(ctx);
                }
            } else {
                // Token bo'lmasa, login va parol so'ramiz
                await this.requestLogin(ctx);
            }
        });
        
        // Help command
        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '📚 *Yordam*\n\n' +
                '/start - Botni boshlash\n' +
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
        this.bot.action('show_stats', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showStudentStats(ctx);
        });
        
        this.bot.action('show_notifications', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showTeacherNotifications(ctx);
        });
        
        this.bot.action('show_menu', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showMainMenu(ctx);
        });
        
        this.bot.action('show_lessons', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showApprovedLessons(ctx);
        });
        
        this.bot.action('show_scores', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showScores(ctx);
        });
        
        this.bot.action('show_all_submissions', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showTeacherNotifications(ctx);
        });
        
        this.bot.action('show_completed_courses', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showCompletedCourses(ctx);
        });
        
        this.bot.action('show_in_progress_courses', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showInProgressCourses(ctx);
        });
        
        this.bot.action('show_all_courses', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showAllCourses(ctx);
        });
    }
    
    async requestLogin(ctx) {
        // Login va parol so'rash
        await ctx.reply(
            '🔐 *Tizimga kirish*\n\n' +
            'Botdan foydalanish uchun web saytdagi login va parolingizni kiriting.\n\n' +
            'Iltimos, email manzilingizni yuboring:',
            { parse_mode: 'Markdown' }
        );
        
        // Email kutilayotganini saqlash
        ctx.session = ctx.session || {};
        ctx.session.waitingForEmail = true;
    }
    
    async handleEmailInput(ctx, email) {
        ctx.session = ctx.session || {};
        ctx.session.email = email;
        ctx.session.waitingForEmail = false;
        ctx.session.waitingForPassword = true;
        
        await ctx.reply('🔑 Endi parolingizni yuboring:');
    }
    
    async handlePasswordInput(ctx, password) {
        const chatId = ctx.chat.id.toString();
        ctx.session = ctx.session || {};
        const email = ctx.session.email;
        
        if (!email) {
            await ctx.reply('❌ Xato yuz berdi. Qaytadan /start buyrug\'ini bosing.');
            return;
        }
        
        try {
            // Login va parol orqali ulash
            const response = await axios.post(`${BASE_URL}/api/telegram/connect-login`, {
                email: email,
                password: password,
                chatId: chatId
            });
            
            if (response.data.success) {
                await ctx.reply(
                    '✅ *Muvaffaqiyatli kirdingiz!*\n\n' +
                    `Xush kelibsiz, ${response.data.user.name}!\n\n` +
                    'Endi siz o\'z ma\'lumotlaringizni ko\'rishingiz mumkin.',
                    { parse_mode: 'Markdown' }
                );
                
                // Session'ni tozalash
                ctx.session = {};
                
                // Foydalanuvchi roliga qarab menyu ko'rsatish
                await this.showMainMenu(ctx);
            }
        } catch (error) {
            await ctx.reply(
                '❌ Xato: ' + (error.response?.data?.message || 'Email yoki parol noto\'g\'ri.\n\n' +
                'Qaytadan /start buyrug\'ini bosing va to\'g\'ri ma\'lumotlarni kiriting.')
            );
            ctx.session = {};
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
                `Ism: ${user.name}\n` +
                `Email: ${user.email}\n` +
                `Rol: O'quvchi\n\n` +
                'Quyidagi tugmalardan birini tanlang:',
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        } else if (user.role === 'teacher') {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔔 Yangi Vazifalar', callback_data: 'show_notifications' }],
                    [{ text: '📋 Barcha Vazifalar', callback_data: 'show_all_submissions' }],
                    [{ text: '🔙 Asosiy Menyu', callback_data: 'show_menu' }]
                ]
            };
            
            await ctx.reply(
                '👨‍🏫 *O\'qituvchi Paneli*\n\n' +
                `Ism: ${user.name}\n` +
                `Email: ${user.email}\n\n` +
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
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success) {
                await ctx.reply('❌ Ma\'lumotlarni yuklashda xato yuz berdi.');
                return;
            }
            
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
            message += `   🧪 Test: ${statistics.testScore}\n\n`;
            
            if (recentApprovedLessons.length > 0) {
                message += '✅ *Oxirgi Tasdiqlangan Darslar:*\n\n';
                recentApprovedLessons.slice(0, 3).forEach((lesson, index) => {
                    message += `${index + 1}. *${lesson.lessonTitle}*\n`;
                    message += `   📚 ${lesson.courseTitle}\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showCompletedCourses(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success || !data.completedCourses || data.completedCourses.length === 0) {
                await ctx.reply('✅ Hozirda tugallangan kurslar yo\'q.');
                return;
            }
            
            let message = '✅ *Tugallangan Kurslar*\n\n';
            
            data.completedCourses.forEach((course, index) => {
                message += `${index + 1}. *${course.title}*\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showInProgressCourses(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success || !data.inProgressCourses || data.inProgressCourses.length === 0) {
                await ctx.reply('📚 Hozirda davom etayotgan kurslar yo\'q.');
                return;
            }
            
            let message = '📚 *Davom Etayotgan Kurslar*\n\n';
            
            data.inProgressCourses.forEach((course, index) => {
                message += `${index + 1}. *${course.title}*\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showAllCourses(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success || !data.courses || data.courses.length === 0) {
                await ctx.reply('📚 Hozirda kurslar yo\'q.');
                return;
            }
            
            let message = '📋 *Barcha Kurslar*\n\n';
            
            data.courses.forEach((course, index) => {
                const status = course.isCompleted ? '✅' : '📚';
                message += `${status} ${index + 1}. *${course.title}*\n`;
                message += `   📈 Progress: ${course.progress}%\n`;
                message += `   📚 Darslar: ${course.completedLessons}/${course.totalLessons}\n`;
                if (course.description) {
                    message += `   📝 ${course.description.substring(0, 50)}${course.description.length > 50 ? '...' : ''}\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showApprovedLessons(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success) {
                await ctx.reply('❌ Ma\'lumotlarni yuklashda xato yuz berdi.');
                return;
            }
            
            const { recentApprovedLessons } = data;
            
            if (!recentApprovedLessons || recentApprovedLessons.length === 0) {
                await ctx.reply('📝 Hozirda tasdiqlangan darslar yo\'q.');
                return;
            }
            
            let message = '✅ *Tasdiqlangan Darslar*\n\n';
            
            recentApprovedLessons.forEach((lesson, index) => {
                message += `${index + 1}. *${lesson.lessonTitle}*\n`;
                message += `   📚 Kurs: ${lesson.courseTitle}\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showScores(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/student-data/${chatId}`);
            const data = response.data;
            
            if (!data.success) {
                await ctx.reply('❌ Ma\'lumotlarni yuklashda xato yuz berdi.');
                return;
            }
            
            const { user, statistics } = data;
            
            let message = '💰 *Coins va Ballar*\n\n';
            message += `💰 *Coins:* ${user.coins}\n\n`;
            message += `🎯 *Umumiy Ball:* ${statistics.totalScore}\n`;
            message += `📝 *Vazifa Ballari:* ${statistics.submissionScore}\n`;
            message += `🧪 *Test Ballari:* ${statistics.testScore}\n\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    async showTeacherNotifications(ctx) {
        const chatId = ctx.chat.id.toString();
        
        try {
            const response = await axios.get(`${BASE_URL}/api/telegram/teacher-notifications/${chatId}`);
            const data = response.data;
            
            if (!data.success) {
                await ctx.reply('❌ Ma\'lumotlarni yuklashda xato yuz berdi.');
                return;
            }
            
            const { count, submissions } = data;
            
            let message = '🔔 *Yangi Vazifalar*\n\n';
            message += `Jami: ${count} ta\n\n`;
            
            if (submissions.length === 0) {
                message += 'Hozirda tekshirilmagan vazifalar yo\'q.';
            } else {
                submissions.slice(0, 10).forEach((sub, index) => {
                    message += `${index + 1}. *${sub.studentName}*\n`;
                    message += `   Dars: ${sub.lessonTitle}\n`;
                    message += `   Kurs: ${sub.courseTitle}\n`;
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
            await ctx.reply('❌ Xato: ' + (error.response?.data?.message || 'Ma\'lumotlarni yuklashda xato'));
        }
    }
    
    start() {
        if (!this.bot) {
            console.warn('⚠️  Bot ishlamaydi - token topilmadi');
            return;
        }
        
        this.bot.launch().then(() => {
            console.log('🤖 Telegram bot ishga tushdi!');
        }).catch((error) => {
            console.error('❌ Telegram bot ishga tushmadi:', error.message);
        });
        
        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = TelegramBot;
