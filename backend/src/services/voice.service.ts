import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

export class VoiceService {
    private apiKey: string;
    private apiSecret: string;
    private wsUrl: string;

    constructor() {
        this.apiKey = process.env.LIVEKIT_API_KEY || '';
        this.apiSecret = process.env.LIVEKIT_API_SECRET || '';
        this.wsUrl = process.env.LIVEKIT_URL || '';

        if (!this.apiKey || !this.apiSecret || !this.wsUrl) {
            console.warn("⚠️ LiveKit credentials not found. Voice chat will not work.");
        }
    }

    async generateToken(roomId: string, userId: string, username: string): Promise<string> {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error("LiveKit not configured");
        }

        const at = new AccessToken(this.apiKey, this.apiSecret, {
            identity: userId,
            name: username,
        });

        at.addGrant({
            roomJoin: true,
            room: roomId,
            canPublish: true,
            canSubscribe: true,
        });

        return await at.toJwt();
    }
}
