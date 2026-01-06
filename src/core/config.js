/**
 * Globe Map Quiz - Configuration
 * Central configuration for the entire application
 */

export const CONFIG = {
    // Globe settings
    globe: {
        radius: 1,
        segments: 256,           // High detail for displacement
        displacementScale: 0.03, // Height map intensity
        rotateSpeed: 0.15,
        minDistance: 1.15,
        maxDistance: 4.5
    },

    // Texture URLs - will be replaced with local assets
    textures: {
        // Earth textures (NASA Blue Marble / Natural Earth)
        color8k: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
        color16k: null, // Local asset: assets/textures/earth_color_16k.jpg
        heightMap: null, // Local asset: assets/textures/earth_height_8k.png
        normalMap: null, // Local asset: assets/textures/earth_normal_8k.jpg
        specularMap: null, // Local asset: assets/textures/earth_specular_8k.jpg
        nightLights: null, // Local asset: assets/textures/earth_lights_8k.jpg
        clouds: null, // Local asset: assets/textures/earth_clouds_8k.png
    },

    // GeoJSON data
    data: {
        countriesUrl: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
        countriesDetailUrl: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
    },

    // Quiz modes
    modes: {
        LOCATE: { id: 1, name: 'Locate', given: 'name', find: 'country' },
        IDENTIFY: { id: 2, name: 'Identify', given: 'highlight', find: 'name' },
        FLAG_MATCH: { id: 3, name: 'Flag Match', given: 'flag', find: 'name' },
        REVERSE_LOCATE: { id: 4, name: 'Reverse Locate', given: 'flag', find: 'country' },
        MASTER: { id: 5, name: 'Master', given: 'name', find: 'type' },
        MARATHON: { id: 6, name: 'Marathon', given: 'name', find: 'country' }
    },

    // Difficulty presets
    difficulty: {
        easy: { lives: 5, timeLimit: 0, questionCount: 10 },
        medium: { lives: 3, timeLimit: 30, questionCount: 20 },
        hard: { lives: 1, timeLimit: 15, questionCount: 50 }
    },

    // Theme definitions
    themes: {
        cyber: {
            name: 'Cyber',
            bgColor: '#0f172a',
            accentColor: '#38bdf8',
            textColor: '#f1f5f9'
        },
        royal: {
            name: 'Royal',
            bgColor: '#1a0b2e',
            accentColor: '#fbbf24',
            textColor: '#fef3c7'
        },
        terminal: {
            name: 'Terminal',
            bgColor: '#000000',
            accentColor: '#00ff00',
            textColor: '#00ff00'
        },
        paper: {
            name: 'Paper',
            bgColor: '#f3f4f6',
            accentColor: '#1f2937',
            textColor: '#111827'
        },
        midnight: {
            name: 'Midnight',
            bgColor: '#000000',
            accentColor: '#6366f1',
            textColor: '#e0e7ff'
        },
        navy: {
            name: 'Navy',
            bgColor: '#0a1628',
            accentColor: '#f59e0b',
            textColor: '#fef3c7'
        }
    },

    // Audio settings
    audio: {
        enabled: true,
        volume: 0.5
    },

    // Performance
    performance: {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        antialias: true,
        logarithmicDepthBuffer: true
    }
};

export default CONFIG;
