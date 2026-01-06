/**
 * Globe Map Quiz - Main Entry Point
 * Initializes all modules and starts the application
 */

import { CONFIG } from './core/config.js';
import { state } from './core/state.js';
import { sceneManager } from './core/scene.js';
import { globeRenderer } from './globe/globe.js';
import { countryRenderer } from './globe/countries.js';
import { audio } from './utils/audio.js';

class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;

        console.log('Globe Map Quiz - Initializing...');

        try {
            // Get container
            const container = document.getElementById('canvas-container');
            if (!container) {
                throw new Error('Canvas container not found');
            }

            // Initialize Three.js scene
            sceneManager.init(container);

            // Initialize audio (will fully init on first user interaction)
            document.addEventListener('click', () => audio.init(), { once: true });

            // Create globe
            await globeRenderer.create();

            // Load country data
            await countryRenderer.load();

            // Setup interaction handlers
            this._setupInteractions();

            // Apply saved theme
            this._applyTheme(state.get('theme'));

            // Subscribe to theme changes
            state.subscribe('theme', (theme) => this._applyTheme(theme));

            // Start animation loop
            sceneManager.start();

            // Hide loading screen
            this._hideLoadingScreen();

            this.initialized = true;
            state.set('initialized', true);

            console.log('Globe Map Quiz - Ready!');

        } catch (error) {
            console.error('Failed to initialize:', error);
            this._showError(error.message);
        }
    }

    /**
     * Setup mouse/touch interactions
     */
    _setupInteractions() {
        const canvas = sceneManager.renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Track mouse position
        canvas.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // Raycast for hover
            raycaster.setFromCamera(mouse, sceneManager.camera);
            const intersects = raycaster.intersectObject(globeRenderer.globe);

            if (intersects.length > 0) {
                const uv = intersects[0].uv;
                const country = countryRenderer.getCountryAtUV(uv);

                if (country) {
                    canvas.style.cursor = 'pointer';
                    // Could highlight country on hover
                } else {
                    canvas.style.cursor = 'grab';
                }
            }
        });

        // Click handler
        canvas.addEventListener('click', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, sceneManager.camera);
            const intersects = raycaster.intersectObject(globeRenderer.globe);

            if (intersects.length > 0) {
                const uv = intersects[0].uv;
                const country = countryRenderer.getCountryAtUV(uv);

                if (country) {
                    audio.play('select');
                    this._onCountryClick(country);
                }
            }
        });
    }

    /**
     * Handle country click
     */
    _onCountryClick(country) {
        console.log('Country clicked:', country.name);
        state.set('countries.selected', country.id);

        // If quiz is active, check answer
        if (state.get('quiz.active')) {
            // Quiz logic will handle this
            window.dispatchEvent(new CustomEvent('countrySelected', { detail: country }));
        } else {
            // Just highlight and show info
            countryRenderer.highlight(country.id);
        }
    }

    /**
     * Apply theme to DOM
     */
    _applyTheme(themeName) {
        const theme = CONFIG.themes[themeName];
        if (!theme) return;

        // Remove all theme classes
        document.body.classList.remove(
            ...Object.keys(CONFIG.themes).map(t => `theme-${t}`)
        );

        // Add new theme class
        document.body.classList.add(`theme-${themeName}`);

        // Update CSS variables
        document.documentElement.style.setProperty('--bg-color', theme.bgColor);
        document.documentElement.style.setProperty('--accent-color', theme.accentColor);
        document.documentElement.style.setProperty('--text-color', theme.textColor);

        // Update scene background
        if (sceneManager.scene) {
            sceneManager.scene.background = new THREE.Color(theme.bgColor);
        }
    }

    /**
     * Hide loading screen
     */
    _hideLoadingScreen() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 500);
        }
    }

    /**
     * Show error message
     */
    _showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-overlay';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Reload</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Create and export app instance
export const app = new App();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

export default app;
