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
            'start': '/sounds/start.wav',
            'turn': '/sounds/turn.wav',
            'roll': '/sounds/roll.wav',
            'payday': '/sounds/payday.wav',
            'baby': '/sounds/baby.mp3',
            'fired': '/sounds/fired.wav',
            'victory': '/sounds/victory.wav',
            'stock': '/sounds/stock.wav',
            'transfer': '/sounds/transfer.wav',
            'fasttrack': '/sounds/fasttrack.wav',
            'cash': '/sounds/cash.mp3'
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
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Start Autoplay Policy error or format error
                    if (e.name === 'NotSupportedError') {
                        console.warn(`[SoundManager] Format not supported for '${key}' (${audio.src})`);
                    } else if (e.name === 'NotAllowedError') {
                        // Expected if no user interaction yet
                    } else {
                        console.warn(`[SoundManager] Play failed for '${key}':`, e);
                    }
                });
            }
        } else {
            // console.warn(`Sound '${key}' not found.`);
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
