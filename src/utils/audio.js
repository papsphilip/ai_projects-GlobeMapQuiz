/**
 * Globe Map Quiz - Audio System
 * Web Audio API based sound effects
 */

import { state } from '../core/state.js';

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.sounds = {};
        this.initialized = false;
    }

    /**
     * Initialize audio context (requires user interaction)
     */
    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = state.get('audio.volume') || 0.5;

            // Subscribe to volume changes
            state.subscribe('audio.volume', (volume) => {
                if (this.masterGain) {
                    this.masterGain.gain.value = volume;
                }
            });

            this.initialized = true;
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }

    /**
     * Resume audio context if suspended
     */
    resume() {
        if (this.context?.state === 'suspended') {
            this.context.resume();
        }
    }

    /**
     * Play a sound effect
     */
    play(type) {
        if (!this.initialized || !state.get('audio.enabled')) return;

        this.resume();

        switch (type) {
            case 'correct':
                this._playCorrect();
                break;
            case 'wrong':
                this._playWrong();
                break;
            case 'click':
                this._playClick();
                break;
            case 'select':
                this._playSelect();
                break;
            case 'success':
                this._playSuccess();
                break;
            case 'gameOver':
                this._playGameOver();
                break;
            case 'countdown':
                this._playCountdown();
                break;
        }
    }

    /**
     * Correct answer sound - ascending chime
     */
    _playCorrect() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        const now = this.context.currentTime;

        // Ascending notes
        osc.frequency.setValueAtTime(523.25, now);       // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    /**
     * Wrong answer sound - descending buzz
     */
    _playWrong() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        const now = this.context.currentTime;

        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * UI click sound
     */
    _playClick() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.value = 800;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Selection sound
     */
    _playSelect() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        const now = this.context.currentTime;

        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Victory/success fanfare
     */
    _playSuccess() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
        const now = this.context.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + i * 0.15;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    /**
     * Game over sound
     */
    _playGameOver() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        const now = this.context.currentTime;

        // Sad descending
        osc.frequency.setValueAtTime(392, now);        // G4
        osc.frequency.setValueAtTime(349.23, now + 0.2); // F4
        osc.frequency.setValueAtTime(329.63, now + 0.4); // E4
        osc.frequency.setValueAtTime(261.63, now + 0.6); // C4

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

        osc.start(now);
        osc.stop(now + 0.8);
    }

    /**
     * Countdown beep
     */
    _playCountdown() {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.value = 880;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Set master volume
     */
    setVolume(volume) {
        state.set('audio.volume', Math.max(0, Math.min(1, volume)));
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        const enabled = !state.get('audio.enabled');
        state.set('audio.enabled', enabled);
        return enabled;
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.context) {
            this.context.close();
        }
    }
}

// Singleton instance
export const audio = new AudioManager();
export default audio;
