/**
 * scene-background.js
 * Permanent fixed layered background:
 * - Breathing base poster WebP with mouse/gyro parallax
 * - Night sky canvas: twinkling stars, nebula clouds, shooting stars
 * - Concert stage light beams from left/right trusses, pulsing string lights, lens flare bloom
 * Synchronised with beatEngine.
 */

import { beatEngine } from './beat.js';

class SceneBackground {
    constructor() {
        this.container = document.getElementById('fixed-stage-scene');
        this.posterLayer = document.querySelector('.scene-poster-layer');
        this.canvas = document.getElementById('sky-lights-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.stars = [];
        this.shootingStars = [];
        this.lastShootingStarTime = 0;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Mouse / Parallax target and current values
        this.targetParallax = { x: 0, y: 0 };
        this.currentParallax = { x: 0, y: 0 };

        // Stage spotlight angles
        this.leftBeamAngle = -0.4;
        this.rightBeamAngle = 0.4;
        this.beamPulse = 1.0;
        this.stringLightPulse = 0.8;

        this.init();
    }

    init() {
        this.resize();
        this.createStars();
        this.bindEvents();

        if (!this.reducedMotion) {
            this.animate();
        } else {
            this.renderStatic();
        }
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
        this.createStars();
    }

    createStars() {
        const starCount = Math.floor((this.width * this.height) / 7000);
        this.stars = [];
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height * 0.65), // Stars mostly in sky
                size: Math.random() * 1.8 + 0.6,
                baseAlpha: Math.random() * 0.7 + 0.2,
                twinkleSpeed: Math.random() * 0.04 + 0.01,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize(), { passive: true });

        // Mouse Parallax
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / this.width - 0.5) * 2;
            const y = (e.clientY / this.height - 0.5) * 2;
            this.targetParallax.x = x * 15;
            this.targetParallax.y = y * 10;
        }, { passive: true });

        // Mobile Device Orientation Gyroscope
        if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.gamma !== null && e.beta !== null) {
                    const gx = Math.min(Math.max(e.gamma / 30, -1), 1);
                    const gy = Math.min(Math.max((e.beta - 45) / 30, -1), 1);
                    this.targetParallax.x = gx * 18;
                    this.targetParallax.y = gy * 12;
                }
            }, { passive: true });
        }

        // Beat Engine Listeners
        beatEngine.onBeat((payload) => {
            if (this.reducedMotion) return;
            this.beamPulse = payload.isHype ? 1.8 : (payload.isStrongBeat ? 1.35 : 1.15);
            this.stringLightPulse = payload.isHype ? 1.9 : 1.3;

            // Trigger shooting star on bar starts randomly
            if (payload.isBarStart && Math.random() > 0.4) {
                this.spawnShootingStar();
            }
        });

        beatEngine.onHype((active) => {
            if (active) {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => this.spawnShootingStar(), i * 350);
                }
            }
        });
    }

    spawnShootingStar() {
        const startX = Math.random() * (this.width * 0.8) + (this.width * 0.1);
        const startY = Math.random() * (this.height * 0.35);
        const length = Math.random() * 120 + 80;
        const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3; // ~45 deg downward
        const speed = Math.random() * 18 + 14;

        this.shootingStars.push({
            x: startX,
            y: startY,
            length,
            angle,
            speed,
            alpha: 1.0,
            fadeSpeed: 0.025,
            width: Math.random() * 2 + 1.5,
        });
    }

    updateParallax() {
        this.currentParallax.x += (this.targetParallax.x - this.currentParallax.x) * 0.06;
        this.currentParallax.y += (this.targetParallax.y - this.currentParallax.y) * 0.06;

        if (this.posterLayer) {
            this.posterLayer.style.transform = `scale(1.04) translate3d(${this.currentParallax.x}px, ${this.currentParallax.y}px, 0)`;
        }
    }

    animate() {
        if (document.hidden) {
            requestAnimationFrame(() => this.animate());
            return;
        }

        this.updateParallax();
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Nebula Glows
        this.drawNebula();

        // 2. Draw Twinkling Stars
        this.drawStars();

        // 3. Draw Shooting Stars
        this.drawShootingStars();

        // 4. Draw Concert Stage Light Beams
        this.drawStageBeams();

        // 5. Draw Truss String Lights & Flares
        this.drawTrussLights();

        // Decay pulses
        this.beamPulse = Math.max(1.0, this.beamPulse - 0.02);
        this.stringLightPulse = Math.max(0.8, this.stringLightPulse - 0.03);

        requestAnimationFrame(() => this.animate());
    }

    renderStatic() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawNebula();
        this.drawStars();
        this.drawStageBeams();
        this.drawTrussLights();
    }

    drawNebula() {
        // Deep purple and electric blue ambient atmosphere
        const t = performance.now() * 0.0003;
        const grad1 = this.ctx.createRadialGradient(
            this.width * 0.3 + Math.sin(t) * 40,
            this.height * 0.35 + Math.cos(t) * 20,
            20,
            this.width * 0.3,
            this.height * 0.35,
            this.width * 0.55
        );
        grad1.addColorStop(0, 'rgba(120, 40, 200, 0.16)');
        grad1.addColorStop(0.6, 'rgba(50, 20, 110, 0.08)');
        grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = grad1;
        this.ctx.fillRect(0, 0, this.width, this.height);

        const grad2 = this.ctx.createRadialGradient(
            this.width * 0.75 + Math.cos(t * 1.2) * 50,
            this.height * 0.25 + Math.sin(t * 1.2) * 25,
            10,
            this.width * 0.75,
            this.height * 0.25,
            this.width * 0.5
        );
        grad2.addColorStop(0, 'rgba(255, 110, 20, 0.12)');
        grad2.addColorStop(0.5, 'rgba(160, 40, 140, 0.06)');
        grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = grad2;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawStars() {
        const time = performance.now() * 0.002;
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            const alpha = Math.max(0.05, Math.min(1.0, star.baseAlpha + Math.sin(time * star.twinkleSpeed * 100 + star.phase) * 0.35));
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    drawShootingStars() {
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            const tailX = ss.x - Math.cos(ss.angle) * ss.length;
            const tailY = ss.y - Math.sin(ss.angle) * ss.length;

            const grad = this.ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
            grad.addColorStop(0, 'rgba(255, 140, 20, 0)');
            grad.addColorStop(0.7, `rgba(255, 180, 50, ${ss.alpha * 0.6})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${ss.alpha})`);

            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = ss.width;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(tailX, tailY);
            this.ctx.lineTo(ss.x, ss.y);
            this.ctx.stroke();

            // Head sparkle
            this.ctx.fillStyle = `rgba(255, 255, 255, ${ss.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(ss.x, ss.y, ss.width * 1.2, 0, Math.PI * 2);
            this.ctx.fill();

            ss.x += Math.cos(ss.angle) * ss.speed;
            ss.y += Math.sin(ss.angle) * ss.speed;
            ss.alpha -= ss.fadeSpeed;

            if (ss.alpha <= 0) {
                this.shootingStars.splice(i, 1);
            }
        }
    }

    drawStageBeams() {
        const t = performance.now() * 0.001;
        const leftOriginX = this.width * 0.08;
        const leftOriginY = this.height * 0.52;
        const rightOriginX = this.width * 0.92;
        const rightOriginY = this.height * 0.52;

        const leftAngle = Math.sin(t * 0.8) * 0.35 + 0.45;
        const rightAngle = -Math.sin(t * 0.85 + 1.2) * 0.35 - 0.45;

        // Beam colors: warm gold and magenta/orange
        const beamIntensity = this.beamPulse * (beatEngine.isHype ? 1.6 : 1.0);

        this.drawConicBeam(leftOriginX, leftOriginY, leftAngle, 0.22, 'rgba(255, 138, 31, ', beamIntensity);
        this.drawConicBeam(leftOriginX, leftOriginY, leftAngle - 0.3, 0.16, 'rgba(230, 60, 180, ', beamIntensity * 0.7);

        this.drawConicBeam(rightOriginX, rightOriginY, rightAngle, 0.22, 'rgba(255, 197, 90, ', beamIntensity);
        this.drawConicBeam(rightOriginX, rightOriginY, rightAngle + 0.3, 0.16, 'rgba(255, 80, 20, ', beamIntensity * 0.7);
    }

    drawConicBeam(ox, oy, angle, spread, colorPrefix, intensity) {
        const beamLength = Math.max(this.width, this.height) * 1.3;
        const a1 = angle - spread * 0.5;
        const a2 = angle + spread * 0.5;

        const p1x = ox + Math.cos(a1) * beamLength;
        const p1y = oy + Math.sin(a1) * beamLength;
        const p2x = ox + Math.cos(a2) * beamLength;
        const p2y = oy + Math.sin(a2) * beamLength;

        const grad = this.ctx.createRadialGradient(ox, oy, 10, ox, oy, beamLength * 0.85);
        const alphaMax = Math.min(0.45, 0.22 * intensity);
        grad.addColorStop(0, `${colorPrefix}${alphaMax})`);
        grad.addColorStop(0.4, `${colorPrefix}${alphaMax * 0.5})`);
        grad.addColorStop(1, `${colorPrefix}0)`);

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(ox, oy);
        this.ctx.lineTo(p1x, p1y);
        this.ctx.lineTo(p2x, p2y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawTrussLights() {
        const pulse = this.stringLightPulse;
        const trussLocations = [
            { x: this.width * 0.08, y: this.height * 0.52, color: 'rgba(255, 170, 50, ' },
            { x: this.width * 0.92, y: this.height * 0.52, color: 'rgba(255, 120, 30, ' },
            { x: this.width * 0.18, y: this.height * 0.44, color: 'rgba(255, 210, 100, ' },
            { x: this.width * 0.82, y: this.height * 0.44, color: 'rgba(255, 140, 60, ' },
        ];

        for (let i = 0; i < trussLocations.length; i++) {
            const loc = trussLocations[i];
            const flareRad = (14 + Math.sin(performance.now() * 0.005 + i) * 3) * pulse;

            const flareGrad = this.ctx.createRadialGradient(loc.x, loc.y, 2, loc.x, loc.y, flareRad * 2.5);
            flareGrad.addColorStop(0, '#FFFFFF');
            flareGrad.addColorStop(0.3, `${loc.color}0.85)`);
            flareGrad.addColorStop(1, `${loc.color}0)`);

            this.ctx.fillStyle = flareGrad;
            this.ctx.beginPath();
            this.ctx.arc(loc.x, loc.y, flareRad * 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

export default SceneBackground;
