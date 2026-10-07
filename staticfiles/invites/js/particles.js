/**
 * particles.js
 * Glowing orange embers system with responsive count tuning,
 * beat synchronisation, and hype mode particle explosions.
 */

import { beatEngine } from './beat.js';

class EmberParticles {
    constructor() {
        this.canvas = document.getElementById('embers-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.particles = [];
        this.burstParticles = [];

        this.colors = [
            '255, 138, 31',  // Primary Orange
            '255, 197, 90',  // Warm Gold
            '255, 75, 10',   // Deep Amber Red
            '255, 230, 150', // Electric Highlight
        ];

        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    init() {
        this.resize();
        this.createEmbers();
        this.bindEvents();

        if (!this.reducedMotion) {
            this.animate();
        }
    }

    getParticleCount() {
        const cores = navigator.hardwareConcurrency || 4;
        const isMobile = window.innerWidth < 768;
        if (isMobile || cores <= 4) {
            return Math.floor(Math.min(65, Math.max(35, this.width / 14)));
        }
        return Math.floor(Math.min(140, Math.max(80, this.width / 10)));
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);
    }

    createEmbers() {
        const count = this.getParticleCount();
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.spawnEmber(true));
        }
    }

    spawnEmber(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : this.height + Math.random() * 40,
            size: Math.random() * 2.8 + 1.2,
            baseSpeedY: -(Math.random() * 1.2 + 0.6),
            speedY: -(Math.random() * 1.2 + 0.6),
            driftSpeed: Math.random() * 0.02 + 0.01,
            driftAmp: Math.random() * 1.5 + 0.5,
            driftPhase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.7 + 0.3,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            flickerSpeed: Math.random() * 0.05 + 0.02,
        };
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createEmbers();
        }, { passive: true });

        // Beat pulse boost
        beatEngine.onBeat((payload) => {
            if (this.reducedMotion) return;
            const boost = payload.isHype ? 2.5 : (payload.isStrongBeat ? 1.5 : 1.2);
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].speedY = this.particles[i].baseSpeedY * boost;
            }
        });

        // Hype burst / Confetti explosion
        beatEngine.onHype((active) => {
            if (active) {
                this.spawnBurst(this.width * 0.5, this.height * 0.45, 90);
            }
        });

        // Trigger burst on custom clicks
        window.addEventListener('nexora:burst', (e) => {
            const x = (e.detail && e.detail.x) || this.width * 0.5;
            const y = (e.detail && e.detail.y) || this.height * 0.45;
            this.spawnBurst(x, y, 65);
        });
    }

    spawnBurst(originX, originY, count = 70) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 10 + 3;
            this.burstParticles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - 2.5,
                gravity: 0.18,
                drag: 0.96,
                size: Math.random() * 3.5 + 1.5,
                alpha: 1.0,
                fadeRate: Math.random() * 0.025 + 0.015,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
            });
        }
    }

    animate() {
        if (document.hidden) {
            requestAnimationFrame(() => this.animate());
            return;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        const time = performance.now() * 0.002;

        // 1. Draw and update rising embers
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Gradual decay of speed boost back to base
            p.speedY += (p.baseSpeedY - p.speedY) * 0.08;
            p.y += p.speedY;
            p.x += Math.sin(time * p.driftSpeed * 100 + p.driftPhase) * p.driftAmp;

            const flicker = Math.sin(time * p.flickerSpeed * 100) * 0.25;
            const curAlpha = Math.max(0.1, Math.min(1.0, p.alpha + flicker));

            // Soft ember glow circle
            const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            grad.addColorStop(0, `rgba(255, 255, 255, ${curAlpha})`);
            grad.addColorStop(0.35, `rgba(${p.color}, ${curAlpha * 0.9})`);
            grad.addColorStop(1, `rgba(${p.color}, 0)`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Respawn when exiting top or sides
            if (p.y < -20 || p.x < -30 || p.x > this.width + 30) {
                this.particles[i] = this.spawnEmber(false);
            }
        }

        // 2. Draw and update burst particles
        for (let i = this.burstParticles.length - 1; i >= 0; i--) {
            const bp = this.burstParticles[i];

            bp.x += bp.vx;
            bp.y += bp.vy;
            bp.vy += bp.gravity;
            bp.vx *= bp.drag;
            bp.vy *= bp.drag;
            bp.alpha -= bp.fadeRate;

            if (bp.alpha <= 0) {
                this.burstParticles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = `rgba(${bp.color}, ${bp.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(bp.x, bp.y, bp.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        requestAnimationFrame(() => this.animate());
    }
}

export default EmberParticles;
