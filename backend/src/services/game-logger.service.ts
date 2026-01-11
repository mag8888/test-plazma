import * as fs from 'fs';
import * as path from 'path';

export class GameLogger {
    private static instance: GameLogger;
    private logDir: string;

    private constructor() {
        // Ensure logs directory exists
        this.logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(this.logDir)) {
            try {
                fs.mkdirSync(this.logDir, { recursive: true });
            } catch (e) {
                console.error('[GameLogger] Failed to create logs directory:', e);
            }
        }
    }

    public static getInstance(): GameLogger {
        if (!GameLogger.instance) {
            GameLogger.instance = new GameLogger();
        }
        return GameLogger.instance;
    }

    public logEvent(roomId: string, eventType: string, payload: any, stateSnapshot?: any) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const filename = `game_${roomId}_${date}.jsonl`;
            const filePath = path.join(this.logDir, filename);

            const logEntry = {
                timestamp: new Date().toISOString(),
                roomId,
                eventType,
                payload,
                // Optional: slim down state snapshot if needed to save space
                // For now, logging key state info like active player, phase, etc.
                gameState: stateSnapshot ? {
                    phase: stateSnapshot.phase,
                    currentPlayer: stateSnapshot.players?.[stateSnapshot.currentPlayerIndex]?.name,
                    turn: stateSnapshot.currentTurnTime
                } : undefined
            };

            const line = JSON.stringify(logEntry) + '\n';

            // Append asynchronously to avoid blocking game loop
            fs.appendFile(filePath, line, (err) => {
                if (err) console.error(`[GameLogger] Write error for ${roomId}:`, err);
            });

        } catch (e) {
            console.error('[GameLogger] Error logging event:', e);
        }
    }
}
