/**
 * logo3d.js
 * Interactive 3D NEXORA Logo using Three.js with TextGeometry,
 * metallic-orange material, orbiting glowing ring, vertical light spike,
 * mouse/touch/gyro tilt, click hype burst, and seamless 2D SVG/CSS fallback.
 */

import { beatEngine } from './beat.js';

class Logo3D {
    constructor() {
        this.container = document.getElementById('logo-3d-wrapper');
        this.canvas = document.getElementById('three-logo-canvas');
        this.fallbackEl = document.getElementById('logo-fallback-wrapper');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.logoGroup = null;
        this.ringMesh = null;
        this.spikeMesh = null;
        this.textMesh = null;

        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        this.isHovered = false;
        this.spinVelocity = 0;

        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    init() {
        if (!this.container) return;

        // Verify Three.js and WebGL
        if (!window.THREE || !this.isWebGLAvailable() || this.reducedMotion) {
            this.activate2DFallback();
            return;
        }

        try {
            this.initThreeScene();
            this.bindEvents();
            this.loadFontAndCreateText();
            this.animate();
        } catch (err) {
            console.warn("Three.js setup encountered an issue; falling back to 2D logo:", err);
            this.activate2DFallback();
        }
    }

    activate2DFallback() {
        if (this.canvas) this.canvas.style.display = 'none';
        if (this.fallbackEl) {
            this.fallbackEl.style.display = 'block';
            this.bindFallbackInteractions();
        }
    }

    bindFallbackInteractions() {
        if (!this.fallbackEl) return;
        this.fallbackEl.addEventListener('click', (e) => {
            beatEngine.triggerHype(3000);
            window.dispatchEvent(new CustomEvent('nexora:burst', {
                detail: { x: e.clientX, y: e.clientY }
            }));
            this.fallbackEl.classList.add('pulse-pop');
            setTimeout(() => this.fallbackEl.classList.remove('pulse-pop'), 800);
        });

        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 12;
            this.fallbackEl.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg)`;
        }, { passive: true });
    }

    initThreeScene() {
        const THREE = window.THREE;
        const width = this.container.clientWidth || 360;
        const height = this.container.clientHeight || 200;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(0, 0, 18);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        // Group holding logo, ring, and light spike
        this.logoGroup = new THREE.Group();
        this.scene.add(this.logoGroup);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const pointOrange = new THREE.PointLight(0xff8a1f, 3.5, 40);
        pointOrange.position.set(0, 4, 10);
        this.scene.add(pointOrange);

        const pointPurple = new THREE.PointLight(0x9d4edd, 2.5, 40);
        pointPurple.position.set(-8, -4, 5);
        this.scene.add(pointPurple);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
        dirLight.position.set(5, 10, 15);
        this.scene.add(dirLight);

        // 1. Create Orbiting Ring
        this.createOrbitingRing();

        // 2. Create Vertical Light Spike
        this.createLightSpike();
    }

    createOrbitingRing() {
        const THREE = window.THREE;
        const ringGeo = new THREE.TorusGeometry(5.8, 0.08, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 0.85,
        });
        this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
        this.ringMesh.rotation.x = Math.PI * 0.35;
        this.ringMesh.rotation.y = Math.PI * 0.15;
        this.logoGroup.add(this.ringMesh);
    }

    createLightSpike() {
        const THREE = window.THREE;
        const spikeGeo = new THREE.CylinderGeometry(0.04, 0.25, 12, 16);
        const spikeMat = new THREE.MeshBasicMaterial({
            color: 0xffdf80,
            transparent: true,
            opacity: 0.6,
        });
        this.spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
        this.spikeMesh.position.set(0, 0, -0.4);
        this.logoGroup.add(this.spikeMesh);
    }

    loadFontAndCreateText() {
        const THREE = window.THREE;

        // Create bold 3D Procedural Letters / Font
        // If FontLoader is available, use standard bold typeface; else build clean 3D text geometry
        if (THREE.FontLoader && THREE.TextGeometry) {
            const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
            const loader = new THREE.FontLoader();
            const timeout = setTimeout(() => {
                // If loading takes > 2s, build procedural mesh immediately
                if (!this.textMesh) this.createProcedural3DLogo();
            }, 2000);

            loader.load(
                fontUrl,
                (font) => {
                    clearTimeout(timeout);
                    if (this.textMesh) return;
                    this.buildTextWithFont(font);
                },
                undefined,
                () => {
                    clearTimeout(timeout);
                    this.createProcedural3DLogo();
                }
            );
        } else {
            this.createProcedural3DLogo();
        }
    }

    buildTextWithFont(font) {
        const THREE = window.THREE;
        const textGeo = new THREE.TextGeometry('NEXORA', {
            font: font,
            size: 2.3,
            height: 0.55,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.12,
            bevelSize: 0.08,
            bevelOffset: 0,
            bevelSegments: 4,
        });

        textGeo.center();

        const textMat = new THREE.MeshStandardMaterial({
            color: 0xff8a1f,
            metalness: 0.85,
            roughness: 0.22,
            emissive: 0x3a1200,
        });

        this.textMesh = new THREE.Mesh(textGeo, textMat);
        this.logoGroup.add(this.textMesh);
    }

    createProcedural3DLogo() {
        if (this.textMesh) return;
        const THREE = window.THREE;
        // Build crisp procedural faceted 3D NEXORA emblem
        const shapeGroup = new THREE.Group();

        // Extruded diamond / chevron festival emblem
        const emblemShape = new THREE.Shape();
        emblemShape.moveTo(0, 2.2);
        emblemShape.lineTo(4.5, 0);
        emblemShape.lineTo(0, -2.2);
        emblemShape.lineTo(-4.5, 0);
        emblemShape.closePath();

        const extrudeSettings = {
            depth: 0.5,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.1,
            bevelThickness: 0.1,
        };

        const emblemGeo = new THREE.ExtrudeGeometry(emblemShape, extrudeSettings);
        emblemGeo.center();

        const emblemMat = new THREE.MeshStandardMaterial({
            color: 0xff8a1f,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x220c02,
        });

        this.textMesh = new THREE.Mesh(emblemGeo, emblemMat);
        shapeGroup.add(this.textMesh);
        this.logoGroup.add(shapeGroup);
    }

    bindEvents() {
        // Container Click triggers Hype Mode!
        this.container.addEventListener('click', (e) => {
            this.triggerClickBurst(e);
        });

        this.container.addEventListener('mouseenter', () => {
            this.isHovered = true;
        });
        this.container.addEventListener('mouseleave', () => {
            this.isHovered = false;
        });

        // Mouse Move Tilt
        window.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            this.targetRotY = ((e.clientX - cx) / window.innerWidth) * 0.9;
            this.targetRotX = -((e.clientY - cy) / window.innerHeight) * 0.7;
        }, { passive: true });

        // Touch Drag on mobile
        let touchStartX = 0;
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) touchStartX = e.touches[0].clientX;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const diff = (e.touches[0].clientX - touchStartX) * 0.01;
                this.targetRotY += diff;
                touchStartX = e.touches[0].clientX;
            }
        }, { passive: true });

        // Resize
        window.addEventListener('resize', () => {
            if (!this.renderer || !this.camera) return;
            const w = this.container.clientWidth || 360;
            const h = this.container.clientHeight || 200;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }, { passive: true });

        // Beat pulse reactions
        beatEngine.onBeat((payload) => {
            if (!this.logoGroup) return;
            const pulseScale = payload.isHype ? 1.15 : (payload.isStrongBeat ? 1.05 : 1.02);
            this.logoGroup.scale.set(pulseScale, pulseScale, pulseScale);
            setTimeout(() => {
                if (this.logoGroup) this.logoGroup.scale.set(1.0, 1.0, 1.0);
            }, 180);
        });

        beatEngine.onHype((active) => {
            if (active) {
                this.spinVelocity = 0.25;
            }
        });
    }

    triggerClickBurst(e) {
        beatEngine.triggerHype(3000);
        this.spinVelocity = 0.35;

        // Dispatch burst coordinates
        const rect = this.container.getBoundingClientRect();
        const burstX = e.clientX || (rect.left + rect.width / 2);
        const burstY = e.clientY || (rect.top + rect.height / 2);

        window.dispatchEvent(new CustomEvent('nexora:burst', {
            detail: { x: burstX, y: burstY }
        }));
    }

    animate() {
        if (document.hidden) {
            requestAnimationFrame(() => this.animate());
            return;
        }

        const t = performance.now() * 0.0015;

        if (this.logoGroup) {
            // Smooth lerp to mouse tilt
            this.logoGroup.rotation.y += (this.targetRotY - this.logoGroup.rotation.y) * 0.08 + this.spinVelocity;
            this.logoGroup.rotation.x += (this.targetRotX - this.logoGroup.rotation.x) * 0.08;

            // Decelerate spin
            this.spinVelocity *= 0.94;

            // Subtle gentle float
            this.logoGroup.position.y = Math.sin(t * 1.5) * 0.35;

            // Orbiting ring rotation
            if (this.ringMesh) {
                this.ringMesh.rotation.z += 0.035;
                this.ringMesh.rotation.x = Math.PI * 0.35 + Math.sin(t) * 0.15;
            }

            // Spike shimmer
            if (this.spikeMesh) {
                this.spikeMesh.material.opacity = 0.5 + Math.sin(t * 3) * 0.25;
            }
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.animate());
    }
}

export default Logo3D;
