/**
 * app.js
 * NEXORA Main Application orchestrator.
 * Initializes all animated subsystems, beat engine, 3D logo, and card interactions.
 */

import { beatEngine } from './beat.js';
import SceneBackground from './scene-background.js';
import EmberParticles from './particles.js';
import DancingCrowd from './crowd.js';
import Logo3D from './logo3d.js';
import CinematicIntro from './intro.js';
import InvitationCard from './card.js';

class NexoraApp {
    constructor() {
        this.init();
    }

    init() {
        // 1. Initialize permanent scene background
        this.sceneBg = new SceneBackground();

        // 2. Initialize rising embers & confetti bursts
        this.particles = new EmberParticles();

        // 3. Initialize extracted crowd layers and procedural dancers
        this.crowd = new DancingCrowd();

        // 4. Initialize 3D interactive NEXORA logo
        this.logo3d = new Logo3D();

        // 5. Initialize cinematic intro (plays on "/" once per session)
        this.intro = new CinematicIntro();

        // 6. Initialize invitation card (if present on "/invite/")
        this.card = new InvitationCard();

        // 7. Bind global keyboard shortcuts and audio synth
        this.bindGlobalBehaviors();

        console.log("NEXORA 2K26 Scene Engine Initialized successfully.");
    }

    bindGlobalBehaviors() {
        // Spacebar or "H" key triggers Hype Mode!
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                return;
            }
            if (e.code === 'KeyH' || e.code === 'Space') {
                beatEngine.triggerHype(3000);
            }
        });

        // Hype mode visual indicator
        window.addEventListener('nexora:hype', () => {
            const indicator = document.getElementById('hype-mode-indicator');
            if (indicator) {
                indicator.classList.add('indicator-active');
                setTimeout(() => indicator.classList.remove('indicator-active'), 3000);
            }
        });
    }
}

// Bootstrap once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NexoraApp());
} else {
    new NexoraApp();
}
