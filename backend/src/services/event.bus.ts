import { RedisService } from './redis.service';

export enum EventType {
    SEND_MESSAGE = 'send_message',
    BROADCAST = 'broadcast',
    PLAYER_JOINED = 'player_joined',
    PLAYER_KICKED = 'player_kicked',
    GAME_CREATED = 'game_created'
}

class EventBus {
    private redis: RedisService;
    private static instance: EventBus;

    private constructor() {
        this.redis = new RedisService();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public async emit(type: EventType, payload: any) {
        // console.log(`[EventBus] Emitting ${type}`, payload);
        await this.redis.publish(type, payload);
    }

    public async on(type: EventType, callback: (payload: any) => void) {
        await this.redis.subscribe(type, callback);
    }
}

export const eventBus = EventBus.getInstance();
