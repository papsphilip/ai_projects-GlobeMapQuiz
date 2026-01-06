/**
 * Globe Map Quiz - Three.js Scene Setup
 * Manages renderer, camera, controls, and lighting
 */

import { CONFIG } from './config.js';
import { state } from './state.js';

class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        this.animationId = null;
        this.onRenderCallbacks = [];
    }

    /**
     * Initialize the Three.js scene
     * @param {HTMLElement} container - DOM element to attach renderer
     */
    init(container) {
        this.container = container;

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.01,
            100
        );
        this.camera.position.set(0, 0, 2.5);

        // Create renderer with high quality settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: CONFIG.performance.antialias,
            alpha: true,
            logarithmicDepthBuffer: CONFIG.performance.logarithmicDepthBuffer
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(CONFIG.performance.pixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        container.appendChild(this.renderer.domElement);

        // Create orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.5;
        this.controls.zoomSpeed = 1.0;
        this.controls.minDistance = CONFIG.globe.minDistance;
        this.controls.maxDistance = CONFIG.globe.maxDistance;
        this.controls.enablePan = false;
        this.controls.autoRotate = state.get('globe.autoRotate');
        this.controls.autoRotateSpeed = CONFIG.globe.rotateSpeed;

        // Setup lighting
        this._setupLighting();

        // Handle resize
        window.addEventListener('resize', () => this._onResize());

        // Subscribe to state changes
        state.subscribe('globe.autoRotate', (value) => {
            this.controls.autoRotate = value;
        });

        state.subscribe('theme', (theme) => {
            this._updateBackground(theme);
        });

        // Set initial background
        this._updateBackground(state.get('theme'));

        return this;
    }

    /**
     * Setup scene lighting
     */
    _setupLighting() {
        // Ambient light for base illumination
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Main directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(5, 3, 5);
        this.scene.add(sunLight);

        // Fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, -2, -5);
        this.scene.add(fillLight);

        // Hemisphere light for sky/ground color variation
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362312, 0.3);
        this.scene.add(hemiLight);
    }

    /**
     * Update background based on theme
     */
    _updateBackground(theme) {
        const themeConfig = CONFIG.themes[theme];
        if (themeConfig) {
            this.scene.background = new THREE.Color(themeConfig.bgColor);
        }
    }

    /**
     * Handle window resize
     */
    _onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Register callback to be called each frame
     */
    onRender(callback) {
        this.onRenderCallbacks.push(callback);
        return () => {
            const idx = this.onRenderCallbacks.indexOf(callback);
            if (idx > -1) this.onRenderCallbacks.splice(idx, 1);
        };
    }

    /**
     * Start the animation loop
     */
    start() {
        const animate = (time) => {
            this.animationId = requestAnimationFrame(animate);

            // Update controls
            this.controls.update();

            // Call registered callbacks
            this.onRenderCallbacks.forEach(cb => cb(time, this));

            // Render
            this.renderer.render(this.scene, this.camera);
        };

        animate(0);
    }

    /**
     * Stop the animation loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Fly camera to a specific lat/lon
     */
    flyTo(lat, lon, duration = 1000) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const distance = this.camera.position.length();
        const targetX = distance * Math.sin(phi) * Math.cos(theta);
        const targetY = distance * Math.cos(phi);
        const targetZ = distance * Math.sin(phi) * Math.sin(theta);

        const startPos = this.camera.position.clone();
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        const startTime = performance.now();

        const animateFly = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(startPos, targetPos, eased);
            this.camera.lookAt(0, 0, 0);

            if (t < 1) {
                requestAnimationFrame(animateFly);
            }
        };

        // Disable auto-rotate during flight
        const wasAutoRotating = this.controls.autoRotate;
        this.controls.autoRotate = false;

        animateFly();

        // Re-enable after flight
        setTimeout(() => {
            this.controls.autoRotate = wasAutoRotating;
        }, duration + 100);
    }

    /**
     * Reset camera to default position
     */
    resetView() {
        this.flyTo(20, 0, 800);
    }

    /**
     * Get screen coordinates for a 3D point
     */
    worldToScreen(worldPos) {
        const vector = worldPos.clone();
        vector.project(this.camera);

        return {
            x: (vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-vector.y * 0.5 + 0.5) * window.innerHeight
        };
    }

    /**
     * Cleanup
     */
    dispose() {
        this.stop();
        this.renderer.dispose();
        this.controls.dispose();
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Singleton instance
export const sceneManager = new SceneManager();
export default sceneManager;
