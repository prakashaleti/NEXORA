/**
 * beat.js
 * Global 120 BPM synchronised beat engine and Hype mode dispatcher.
 * Integrates with GSAP ticker or requestAnimationFrame fallback.
 */

class BeatEngine {
    constructor(bpm = 120) {
        this.bpm = bpm;
        this.beatInterval = 60 / bpm; // 0.5s per beat
        this.lastBeatTime = 0;
        this.beatIndex = 0;
        this.isHype = false;
        this.hypeTimer = null;
        this.beatListeners = [];
        this.hypeListeners = [];
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    init() {
        if (this.reducedMotion) return;

        const tick = (currentTime) => {
            const timeInSeconds = currentTime * 0.001;
            if (timeInSeconds - this.lastBeatTime >= this.beatInterval) {
                this.lastBeatTime = timeInSeconds;
                this.beatIndex = (this.beatIndex + 1) % 16;
                this.dispatchBeat(this.beatIndex);
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    onBeat(callback) {
        this.beatListeners.push(callback);
    }

    onHype(callback) {
        this.hypeListeners.push(callback);
    }

    dispatchBeat(index) {
        const payload = {
            beatIndex: index,
            isStrongBeat: index % 2 === 0,
            isBarStart: index % 4 === 0,
            isHype: this.isHype,
            intensity: this.isHype ? 2.2 : 1.0,
        };
        for (let i = 0; i < this.beatListeners.length; i++) {
            try {
                this.beatListeners[i](payload);
            } catch (err) {
                console.error("Error in beat listener:", err);
            }
        }
    }

    triggerHype(duration = 3000) {
        if (this.hypeTimer) clearTimeout(this.hypeTimer);
        this.isHype = true;
        document.body.classList.add('is-hype-mode');

        for (let i = 0; i < this.hypeListeners.length; i++) {
            try {
                this.hypeListeners[i](true);
            } catch (e) {
                console.error(e);
            }
        }

        // Hype burst event on window for loose coupling
        window.dispatchEvent(new CustomEvent('nexora:hype', { detail: { duration } }));

        this.hypeTimer = setTimeout(() => {
            this.isHype = false;
            document.body.classList.remove('is-hype-mode');
            for (let i = 0; i < this.hypeListeners.length; i++) {
                try {
                    this.hypeListeners[i](false);
                } catch (e) {
                    console.error(e);
                }
            }
        }, duration);
    }
}

export const beatEngine = new BeatEngine(120);
export default beatEngine;
