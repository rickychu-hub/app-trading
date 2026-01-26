import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
    private bot: TelegramBot | null = null;
    private chatId: string | null = null;
    private isConfigured: boolean = false;

    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (token && chatId) {
            try {
                this.bot = new TelegramBot(token, { polling: false });
                this.chatId = chatId;
                this.isConfigured = true;
                console.log('✅ Telegram Service initialized successfully');
            } catch (error) {
                console.error('❌ Error initializing Telegram bot:', error);
                this.isConfigured = false;
            }
        } else {
            console.log('⚠️  Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
            this.isConfigured = false;
        }
    }

    /**
     * Send a notification message to Telegram
     * @param message The message to send
     * @param silent Whether to send silently (no notification sound)
     */
    async notify(message: string, silent: boolean = false): Promise<void> {
        if (!this.isConfigured || !this.bot || !this.chatId) {
            console.log('📱 [Telegram Disabled] Would send:', message);
            return;
        }

        try {
            await this.bot.sendMessage(this.chatId, message, {
                parse_mode: 'HTML',
                disable_notification: silent
            });
            console.log('📱 Telegram notification sent:', message.substring(0, 50) + '...');
        } catch (error: any) {
            console.error('❌ Error sending Telegram notification:', error.message);
        }
    }

    /**
     * Send a formatted trade notification
     */
    async notifyTrade(type: 'BUY' | 'SELL', ticker: string, price: number, details: string): Promise<void> {
        const emoji = type === 'BUY' ? '🚀' : '💰';
        const message = `${emoji} <b>${type} Executed</b>\n\n` +
            `<b>Asset:</b> ${ticker}\n` +
            `<b>Price:</b> $${price.toFixed(2)}\n` +
            `${details}`;

        await this.notify(message);
    }

    /**
     * Send a critical alert
     */
    async notifyAlert(title: string, description: string): Promise<void> {
        const message = `⚠️ <b>${title}</b>\n\n${description}`;
        await this.notify(message);
    }

    /**
     * Send bot startup notification
     */
    async notifyStartup(strategy: string): Promise<void> {
        const message = `🤖 <b>Bot Iniciado</b>\n\n` +
            `<b>Estrategia:</b> ${strategy}\n` +
            `<b>Hora:</b> ${new Date().toLocaleString('es-ES')}\n` +
            `<b>Estado:</b> Operativo ✅`;

        await this.notify(message);
    }
}

// Export singleton instance
export const telegramService = new TelegramService();
