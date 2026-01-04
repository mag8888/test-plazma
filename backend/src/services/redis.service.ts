import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export class RedisService {
    private publisher: Redis;
    private subscriber: Redis;
    private isConnected: boolean = false;

    constructor() {
        // Try common Redis environment variables
        const redisUrl = process.env.REDIS_URL ||
            process.env.REDIS_PUBLIC_URL ||
            (process.env.REDISHOST ? `redis://${process.env.REDISHOST}:${process.env.REDISPORT || 6379}` : undefined) ||
            'redis://localhost:6379';

        if (process.env.NODE_ENV === 'production' && redisUrl.includes('localhost')) {
            console.warn('[Redis] ⚠️ WARNING: Connecting to localhost in PRODUCTION. Ensure REDIS_URL is set.');
        }

        console.log('[RedisService] Connecting to:', redisUrl);

        this.publisher = new Redis(redisUrl, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.subscriber = new Redis(redisUrl, {
            retryStrategy: (times) => {
                // If we failed 10+ times, just wait 10 seconds to avoid spamming
                if (times > 10) return 10000;
                return Math.min(times * 100, 3000);
            }
        });

        this.publisher.on('connect', () => {
            console.log('[Redis] Publisher connected');
            this.isConnected = true;
        });

        this.subscriber.on('connect', () => {
            console.log('[Redis] Subscriber connected');
        });

        this.publisher.on('error', (err) => {
            console.error('[Redis] Publisher Error (Non-Fatal):', err.message);
        });
        this.subscriber.on('error', (err) => {
            console.error('[Redis] Subscriber Error (Non-Fatal):', err.message);
        });
    }

    /**
     * Publish an event to a specific channel
     */
    async publish(channel: string, message: any): Promise<number> {
        if (!this.isConnected) {
            // Optional: Buffer functionality or check connection
            // For now, we trust auto-reconnect or fail gracefully
        }
        return this.publisher.publish(channel, JSON.stringify(message));
    }

    /**
     * Subscribe to a channel with a callback
     */
    async subscribe(channel: string, callback: (message: any) => void) {
        await this.subscriber.subscribe(channel);

        this.subscriber.on('message', (chn, msg) => {
            if (chn === channel) {
                try {
                    const parsed = JSON.parse(msg);
                    callback(parsed);
                } catch (e) {
                    console.error('[Redis] Parse error:', e);
                }
            }
        });
    }

    async quit() {
        await this.publisher.quit();
        await this.subscriber.quit();
    }
}
