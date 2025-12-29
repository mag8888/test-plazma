import { eventBus, EventType } from './event.bus';

export class BotProxy {
    public bot: any;

    constructor() {
        // Mock the 'bot' object structure used in index.ts
        this.bot = {
            sendMessage: async (chatId: number | string, text: string, options?: any) => {
                // console.log(`[BotProxy] Queuing message to ${chatId}`);
                await eventBus.emit(EventType.SEND_MESSAGE, { chatId, text, options });
            }
        };
    }

    // Stub for sending mass messages if needed, matching BotService methods
    async sendAdminMessage(text: string) {
        // We could emit a specific admin event, or just loop send_message
        // For now, let's assume usage of generic broadcast or individual sends
        // If index.ts uses sendAdminMessage directly, we need to implement it.
    }
}
