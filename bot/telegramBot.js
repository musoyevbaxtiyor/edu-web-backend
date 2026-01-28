const { Telegraf } = require('telegraf');
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
        this.setupCommands();
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
                        '❌ Xato: ' + (error.response?.data?.message || 'Noto\'g\'ri token')
                    );
                }
            } else {
                await ctx.reply(
                    '👋 *Xush kelibsiz!*\n\n' +
                    'Botdan foydalanish uchun web saytdan o\'z shaxsiy link orqali kirishingiz kerak.\n\n' +
                    'Dashboard > Telegram Bot bo\'limiga o\'ting va "Botga O\'tish" tugmasini bosing.',
                    { parse_mode: 'Markdown' }
                );
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
            await this.showStudentStats(ctx);
        });
        
        this.bot.action('show_scores', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showStudentStats(ctx);
        });
        
        this.bot.action('show_all_submissions', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showTeacherNotifications(ctx);
        });
    }
    
    async showMainMenu(ctx) {
        const chatId = ctx.chat.id.toString();
        const user = await User.findOne({ telegramChatId: chatId });
        
        if (!user) {
            await ctx.reply('❌ Siz hali botga ulanmagansiz. Web saytdan link orqali kiring.');
            return;
        }
        
            if (user.role === 'student') {
            const keyboard = {
                inline_keyboard: [
                    [{ text: '📊 Statistika', callback_data: 'show_stats' }],
                    [{ text: '📚 Tasdiqlangan Darslar', callback_data: 'show_lessons' }],
                    [{ text: '💰 Coins va Ballar', callback_data: 'show_scores' }],
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
            
            let message = '📊 *Statistika*\n\n';
            message += `💰 Coins: ${user.coins}\n`;
            message += `📚 Jami Kurslar: ${statistics.totalCourses}\n`;
            message += `✅ Tugallangan: ${statistics.completedCourses}\n`;
            message += `📈 Progress: ${statistics.averageProgress}%\n`;
            message += `🎯 Umumiy Ball: ${statistics.totalScore}\n`;
            message += `📝 Vazifa Ballari: ${statistics.submissionScore}\n`;
            message += `🧪 Test Ballari: ${statistics.testScore}\n\n`;
            
            if (recentApprovedLessons.length > 0) {
                message += '✅ *Tasdiqlangan Darslar:*\n\n';
                recentApprovedLessons.slice(0, 5).forEach((lesson, index) => {
                    message += `${index + 1}. ${lesson.lessonTitle}\n`;
                    message += `   Kurs: ${lesson.courseTitle}\n`;
                    message += `   Ball: ${lesson.grade}/100\n`;
                    message += `   Coins: +${lesson.coins}\n`;
                    message += `   Sana: ${new Date(lesson.date).toLocaleDateString('uz-UZ')}\n\n`;
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
