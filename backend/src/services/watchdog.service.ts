
import { BotService } from '../bot/bot.service';

interface MonitorTarget {
    name: string;
    url: string;
}

export class WatchdogService {
    private targets: MonitorTarget[] = [];
    private failures: Map<string, number> = new Map();
    private isAlerted: Map<string, boolean> = new Map();
    private botService: BotService;
    private checkInterval: NodeJS.Timeout | null = null;

    // Config
    private readonly THRESHOLD = 3; // Failures before alert
    private readonly INTERVAL_MS = 60000; // Check every 60s

    constructor(botService: BotService) {
        this.botService = botService;
        this.parseTargets();
    }

    private parseTargets() {
        // Format: "Backend|https://api.moneo.app,Partnership|https://admin.moneo.app"
        const raw = process.env.WATCHDOG_TARGETS || '';
        if (!raw) return;

        this.targets = raw.split(',').map(pair => {
            const [name, url] = pair.split('|');
            return { name: name?.trim(), url: url?.trim() };
        }).filter(t => t.name && t.url);

        console.log(`[Watchdog] Configured targets: ${this.targets.map(t => t.name).join(', ')}`);
    }

    public start() {
        if (this.targets.length === 0) {
            console.warn('[Watchdog] No targets configured (WATCHDOG_TARGETS). Watchdog disabled.');
            return;
        }

        console.log('[Watchdog] Service started 🛡️');
        // Initial check immediately
        this.checkAll();

        this.checkInterval = setInterval(() => {
            this.checkAll();
        }, this.INTERVAL_MS);
    }

    private async checkAll() {
        for (const target of this.targets) {
            await this.checkTarget(target);
        }
    }

    private async checkTarget(target: MonitorTarget) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const res = await fetch(target.url, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                this.handleSuccess(target);
            } else {
                this.handleFailure(target, `Status: ${res.status}`);
            }
        } catch (e: any) {
            this.handleFailure(target, e.message);
        }
    }

    private handleSuccess(target: MonitorTarget) {
        // Reset failures
        this.failures.set(target.name, 0);

        // If it was down and we alerted, send recovery message
        if (this.isAlerted.get(target.name)) {
            this.isAlerted.set(target.name, false);
            const msg = `✅ <b>SERVICE RECOVERED:</b> ${target.name}\nService is back online.`;
            this.botService.sendAdminMessage(msg).catch(console.error);
            console.log(`[Watchdog] ${target.name} recovered.`);
        }
    }

    private handleFailure(target: MonitorTarget, reason: string) {
        const currentFailures = (this.failures.get(target.name) || 0) + 1;
        this.failures.set(target.name, currentFailures);

        console.warn(`[Watchdog] ${target.name} check failed (${currentFailures}/${this.THRESHOLD}): ${reason}`);

        if (currentFailures >= this.THRESHOLD && !this.isAlerted.get(target.name)) {
            this.isAlerted.set(target.name, true);
            const msg = `🚨 <b>SERVICE DOWN:</b> ${target.name}\n\nReason: ${reason}\nFailures: ${currentFailures}\n\nImmediate attention required!`;
            this.botService.sendAdminMessage(msg).catch(console.error);
        }
    }
}
