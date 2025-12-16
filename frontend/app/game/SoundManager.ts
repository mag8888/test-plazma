"use client";

class SoundManager {
    private static instance: SoundManager;

    private sounds: Map<string, HTMLAudioElement> = new Map();
    private volume: number = 0.5;
    private isMuted: boolean = false;
    private initialized: boolean = false;

    private constructor() {
        if (typeof window !== 'undefined') {
            const savedVol = localStorage.getItem('sfx_volume');
            const savedMute = localStorage.getItem('sfx_muted');
            if (savedVol) this.volume = parseFloat(savedVol);
            if (savedMute) this.isMuted = savedMute === 'true';

            this.preloadSounds();
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private preloadSounds() {
        // List of sound keys and their paths
        const soundMap: Record<string, string> = {
            'start': '/sounds/start.mp3',
            'turn': '/sounds/turn.mp3',
            'roll': '/sounds/roll.mp3',
            'payday': '/sounds/payday.mp3',
            'baby': '/sounds/baby.mp3',
            'fired': '/sounds/fired.mp3',
            'victory': '/sounds/victory.mp3',
            'stock': '/sounds/stock.mp3',
            'transfer': '/sounds/transfer.mp3',
            'fasttrack': '/sounds/fasttrack.mp3'
        };

        for (const [key, path] of Object.entries(soundMap)) {
            const audio = new Audio(path);
            audio.preload = 'auto'; // Attempt to preload
            this.sounds.set(key, audio);
        }
    }

    public play(key: string) {
        if (this.isMuted) return;

        const audio = this.sounds.get(key);
        if (audio) {
            audio.volume = this.volume;
            audio.currentTime = 0; // Reset to start
            audio.play().catch(e => {
                // Ignore autoplay errors (usually due to no user interaction yet)
                console.warn(`Sound '${key}' blocked:`, e);
            });
        } else {
            console.warn(`Sound '${key}' not found.`);
        }
    }

    public setVolume(val: number) {
        this.volume = Math.max(0, Math.min(1, val));
        localStorage.setItem('sfx_volume', this.volume.toString());
    }

    public getVolume(): number {
        return this.volume;
    }

    public setMute(muted: boolean) {
        this.isMuted = muted;
        localStorage.setItem('sfx_muted', muted.toString());
    }

    public getMute(): boolean {
        return this.isMuted;
    }
}

export const sfx = SoundManager.getInstance();
