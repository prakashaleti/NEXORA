/**
 * crowd.js
 * Dancing crowd scene:
 * - 3 depth layers of extracted poster silhouettes (back, mid, front)
 * - 16 original procedural SVG silhouette dancers with jointed limbs & unique moves
 * - 120 BPM beat synchronization and hype mode jumps.
 */

import { beatEngine } from './beat.js';

class DancingCrowd {
    constructor() {
        this.container = document.getElementById('crowd-scene-container');
        if (!this.container) return;

        this.backLayer = document.querySelector('.crowd-layer-back');
        this.midLayer = document.querySelector('.crowd-layer-mid');
        this.frontLayer = document.querySelector('.crowd-layer-front');
        this.dancersContainer = document.querySelector('.procedural-dancers-row');

        this.dancers = [];
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    init() {
        this.generateProceduralDancers(16);
        this.bindBeatEngine();

        if (!this.reducedMotion) {
            this.startContinuousMotion();
        }
    }

    /**
     * Creates an original jointed SVG dancer silhouette.
     * All paths and figures are 100% original geometric jointed shapes.
     */
    createDancerSVG(typeIndex) {
        // Variety of dance archetypes:
        // 0: Both arms in the air pumping
        // 1: One arm up waving, other on hip
        // 2: Jumping high with spread arms
        // 3: Hip sway with head nod
        const type = typeIndex % 4;
        const color = '#090414';

        let armsSVG = '';
        if (type === 0) {
            // Dual arms up high
            armsSVG = `
                <path class="dancer-arm-left" d="M 22 42 Q 10 24 12 6" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="12" cy="5" r="2.5" fill="${color}" />
                <path class="dancer-arm-right" d="M 28 42 Q 40 24 38 6" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="38" cy="5" r="2.5" fill="${color}" />
            `;
        } else if (type === 1) {
            // One arm waving high with festival wristband, other bent
            armsSVG = `
                <path class="dancer-arm-left" d="M 22 42 Q 8 32 10 18" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="10" cy="18" r="2.5" fill="${color}" />
                <path class="dancer-arm-right" d="M 28 42 Q 38 20 44 2" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="44" cy="2" r="3" fill="#FF8A1F" />
            `;
        } else if (type === 2) {
            // Jumping energetic arms V-shape
            armsSVG = `
                <path class="dancer-arm-left" d="M 22 40 Q 6 18 2 8" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <path class="dancer-arm-right" d="M 28 40 Q 44 18 48 8" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="2" cy="7" r="2.5" fill="${color}" />
                <circle cx="48" cy="7" r="2.5" fill="${color}" />
            `;
        } else {
            // Headphone groove, bent elbows
            armsSVG = `
                <path class="dancer-arm-left" d="M 22 42 Q 14 52 10 38" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="10" cy="38" r="2.5" fill="${color}" />
                <path class="dancer-arm-right" d="M 28 42 Q 36 26 35 12" stroke="${color}" stroke-width="4.5" stroke-linecap="round" fill="none" />
                <circle cx="35" cy="11" r="2.5" fill="${color}" />
            `;
        }

        return `
            <svg viewBox="0 0 50 100" class="dancer-svg dancer-type-${type}">
                <!-- Head -->
                <circle class="dancer-head" cx="25" cy="22" r="7.5" fill="${color}" />
                <!-- Neck & Torso -->
                <path class="dancer-torso" d="M 25 29 L 25 40 Q 25 60 25 65" stroke="${color}" stroke-width="11" stroke-linecap="round" />
                <!-- Arms -->
                ${armsSVG}
                <!-- Legs / Hips -->
                <path class="dancer-leg-left" d="M 21 65 Q 18 80 16 98" stroke="${color}" stroke-width="5" stroke-linecap="round" />
                <path class="dancer-leg-right" d="M 29 65 Q 32 80 34 98" stroke="${color}" stroke-width="5" stroke-linecap="round" />
            </svg>
        `;
    }

    generateProceduralDancers(count = 16) {
        if (!this.dancersContainer) return;
        this.dancersContainer.innerHTML = '';
        this.dancers = [];

        for (let i = 0; i < count; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = `procedural-dancer-item dancer-idx-${i}`;

            // Stagger positions across bottom width
            const leftPct = (i / (count - 1)) * 96 + (Math.random() * 3 - 1.5);
            const scale = 0.75 + Math.random() * 0.45;
            const zIndex = scale > 1.0 ? 5 : 3;

            wrapper.style.left = `${Math.max(1, Math.min(97, leftPct))}%`;
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.zIndex = zIndex;

            wrapper.innerHTML = this.createDancerSVG(i);
            this.dancersContainer.appendChild(wrapper);

            this.dancers.push({
                element: wrapper,
                baseY: 0,
                currentY: 0,
                targetY: 0,
                scale: scale,
                phase: Math.random() * Math.PI * 2,
                bounceFactor: 0.8 + Math.random() * 0.5,
                leftArm: wrapper.querySelector('.dancer-arm-left'),
                rightArm: wrapper.querySelector('.dancer-arm-right'),
                head: wrapper.querySelector('.dancer-head'),
            });
        }
    }

    bindBeatEngine() {
        beatEngine.onBeat((payload) => {
            if (this.reducedMotion) return;

            const hypeMultiplier = payload.isHype ? 2.4 : 1.0;
            const strongBeatMultiplier = payload.isStrongBeat ? 1.4 : 0.85;

            // 1. extracted poster silhouette bounce
            const backBounce = 4 * strongBeatMultiplier * hypeMultiplier;
            const midBounce = 7 * strongBeatMultiplier * hypeMultiplier;
            const frontBounce = 11 * strongBeatMultiplier * hypeMultiplier;

            if (this.backLayer) {
                this.backLayer.style.transform = `translate3d(0, -${backBounce}px, 0)`;
                setTimeout(() => { if (this.backLayer) this.backLayer.style.transform = 'translate3d(0, 0, 0)'; }, 220);
            }
            if (this.midLayer) {
                this.midLayer.style.transform = `translate3d(0, -${midBounce}px, 0)`;
                setTimeout(() => { if (this.midLayer) this.midLayer.style.transform = 'translate3d(0, 0, 0)'; }, 200);
            }
            if (this.frontLayer) {
                this.frontLayer.style.transform = `translate3d(0, -${frontBounce}px, 0)`;
                setTimeout(() => { if (this.frontLayer) this.frontLayer.style.transform = 'translate3d(0, 0, 0)'; }, 180);
            }

            // 2. Procedural SVG dancers jump
            for (let i = 0; i < this.dancers.length; i++) {
                const dancer = this.dancers[i];
                const jumpHeight = (payload.isHype ? 28 : 12) * dancer.bounceFactor;
                dancer.targetY = -jumpHeight;

                // Arm waving angles
                if (dancer.rightArm) {
                    const waveAngle = (Math.sin(payload.beatIndex + dancer.phase) * 22) * (payload.isHype ? 1.6 : 1.0);
                    dancer.rightArm.style.transform = `rotate(${waveAngle}deg)`;
                    dancer.rightArm.style.transformOrigin = '28px 42px';
                }
                if (dancer.leftArm) {
                    const waveAngle = -(Math.sin(payload.beatIndex + dancer.phase) * 20) * (payload.isHype ? 1.6 : 1.0);
                    dancer.leftArm.style.transform = `rotate(${waveAngle}deg)`;
                    dancer.leftArm.style.transformOrigin = '22px 42px';
                }
                if (dancer.head) {
                    const nodY = (payload.isStrongBeat ? 2 : -1.5);
                    dancer.head.style.transform = `translateY(${nodY}px)`;
                }
            }
        });
    }

    startContinuousMotion() {
        const loop = () => {
            if (document.hidden) {
                requestAnimationFrame(loop);
                return;
            }

            const t = performance.now() * 0.003;

            for (let i = 0; i < this.dancers.length; i++) {
                const d = this.dancers[i];
                // Smooth spring physics for jump return
                d.currentY += (d.targetY - d.currentY) * 0.22;
                d.targetY += (0 - d.targetY) * 0.12;

                const hipSway = Math.sin(t + d.phase) * 3;
                d.element.style.transform = `scale(${d.scale}) translate3d(${hipSway}px, ${d.currentY}px, 0)`;
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

export default DancingCrowd;
