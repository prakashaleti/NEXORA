/**
 * intro.js
 * Movie-Style "THE FLASH" / Warner Bros Cinematic Studio Intro:
 * - Speed-force electric lightning arcs crackling
 * - Deep space hyper-speed zoom
 * - Synthesized cinematic bass-drop boom & electrical whoosh via Web Audio API
 * - Blinding electric white-gold lens flash & shockwave ring
 * - Fades smoothly into the animated festival stage
 */

class CinematicIntro {
    constructor() {
        this.overlay = document.getElementById('intro-cinematic-overlay');
        this.skipBtn = document.getElementById('intro-skip-btn');
        this.homeContent = document.getElementById('home-content-container');
        this.lightningCanvas = document.getElementById('intro-lightning-canvas');
        this.hasSeenIntro = sessionStorage.getItem('nexora_intro_seen') === 'true';
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.audioCtx = null;
        this.lightningInterval = null;

        this.init();
    }

    init() {
        if (!this.overlay) return;

        // Skip intro if already seen or user requests reduced motion
        if (this.hasSeenIntro || this.reducedMotion) {
            this.dismissIntroImmediately();
            return;
        }

        this.initLightningCanvas();
        this.bindEvents();
        this.playMovieIntro();
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
    }

    playCinematicAudio() {
        try {
            this.initAudio();
            if (!this.audioCtx) return;
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;

            // 1. Sub-bass cinematic impact boom
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 1.6);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 1.8);

            // 2. High-frequency electrical energy crackle
            const osc2 = this.audioCtx.createOscillator();
            const gain2 = this.audioCtx.createGain();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(450, now);
            osc2.frequency.linearRampToValueAtTime(980, now + 0.8);
            osc2.frequency.exponentialRampToValueAtTime(80, now + 1.4);
            gain2.gain.setValueAtTime(0.08, now);
            gain2.gain.linearRampToValueAtTime(0.2, now + 0.8);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            osc2.connect(gain2);
            gain2.connect(this.audioCtx.destination);
            osc2.start(now);
            osc2.stop(now + 1.5);
        } catch (e) {
            // Audio policy fallback
        }
    }

    initLightningCanvas() {
        if (!this.lightningCanvas) return;
        const resize = () => {
            this.lightningCanvas.width = window.innerWidth;
            this.lightningCanvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });
    }

    drawLightningBolt() {
        if (!this.lightningCanvas) return;
        const ctx = this.lightningCanvas.getContext('2d');
        const w = this.lightningCanvas.width;
        const h = this.lightningCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        // Draw 3-5 electric lightning bolts radiating from center
        const boltCount = 4;
        for (let b = 0; b < boltCount; b++) {
            ctx.beginPath();
            let x = cx + (Math.random() - 0.5) * 120;
            let y = cy + (Math.random() - 0.5) * 80;
            ctx.moveTo(x, y);

            const targetAngle = Math.random() * Math.PI * 2;
            const segments = 12;
            const stepLen = Math.min(w, h) * 0.06;

            for (let s = 0; s < segments; s++) {
                x += Math.cos(targetAngle) * stepLen + (Math.random() - 0.5) * 45;
                y += Math.sin(targetAngle) * stepLen + (Math.random() - 0.5) * 45;
                ctx.lineTo(x, y);
            }

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = Math.random() * 3 + 1.5;
            ctx.shadowColor = '#FF9D2E';
            ctx.shadowBlur = 25;
            ctx.stroke();

            // Orange glow halo
            ctx.strokeStyle = '#FF7A00';
            ctx.lineWidth = Math.random() * 5 + 4;
            ctx.stroke();
        }
    }

    bindEvents() {
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissIntroImmediately();
            });
        }

        this.overlay.addEventListener('click', () => {
            this.playCinematicAudio();
            this.dismissIntroImmediately();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === ' ') {
                if (this.overlay && !this.overlay.classList.contains('intro-dismissed')) {
                    this.dismissIntroImmediately();
                }
            }
        });
    }

    playMovieIntro() {
        document.body.classList.add('intro-active');

        // Play audio on first user gesture or attempt automatically
        setTimeout(() => this.playCinematicAudio(), 200);

        // Flash Lightning Animation Loop
        let frame = 0;
        this.lightningInterval = setInterval(() => {
            frame++;
            if (Math.random() > 0.25) {
                this.drawLightningBolt();
            } else if (this.lightningCanvas) {
                const ctx = this.lightningCanvas.getContext('2d');
                ctx.clearRect(0, 0, this.lightningCanvas.width, this.lightningCanvas.height);
            }
        }, 60);

        // Stage 1: Speed-force electrical build-up (0.2s)
        setTimeout(() => {
            if (this.isDismissed()) return;
            this.overlay.classList.add('flash-stage-1');
        }, 200);

        // Stage 2: Hyperspace deep-space dive (1.0s)
        setTimeout(() => {
            if (this.isDismissed()) return;
            this.overlay.classList.add('flash-stage-2');
        }, 1000);

        // Stage 3: Super-sonic shockwave & lens flare burst (2.2s)
        setTimeout(() => {
            if (this.isDismissed()) return;
            this.overlay.classList.add('flash-stage-3');
            this.playCinematicAudio();
        }, 2200);

        // Stage 4: Blinding White-Hot Flash Reveal (3.0s)
        setTimeout(() => {
            if (this.isDismissed()) return;
            this.overlay.classList.add('flash-stage-4');
        }, 3000);

        // Stage 5: Dissolve into world (3.6s)
        setTimeout(() => {
            if (this.isDismissed()) return;
            this.dismissIntro();
        }, 3600);
    }

    isDismissed() {
        return !this.overlay || this.overlay.classList.contains('intro-dismissed');
    }

    dismissIntro() {
        sessionStorage.setItem('nexora_intro_seen', 'true');
        document.body.classList.remove('intro-active');
        if (this.lightningInterval) clearInterval(this.lightningInterval);

        if (this.overlay) {
            this.overlay.classList.add('intro-dismissed');
            setTimeout(() => {
                if (this.overlay) this.overlay.style.display = 'none';
            }, 800);
        }

        if (this.homeContent) {
            this.homeContent.classList.add('content-visible');
        }

        window.dispatchEvent(new CustomEvent('nexora:intro_complete'));
    }

    dismissIntroImmediately() {
        sessionStorage.setItem('nexora_intro_seen', 'true');
        document.body.classList.remove('intro-active');
        if (this.lightningInterval) clearInterval(this.lightningInterval);

        if (this.overlay) {
            this.overlay.classList.add('intro-dismissed');
            this.overlay.style.display = 'none';
        }

        if (this.homeContent) {
            this.homeContent.classList.add('content-visible');
        }

        window.dispatchEvent(new CustomEvent('nexora:intro_complete'));
    }
}

export default CinematicIntro;
