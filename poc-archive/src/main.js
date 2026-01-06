/**
 * Globe Map Quiz - Vite Build Test
 * Testing three-globe tile streaming via npm
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ThreeGlobe from 'three-globe';

// Debug info
console.log('Three.js version:', THREE.REVISION);
console.log('ThreeGlobe imported:', typeof ThreeGlobe);

// Test if tile engine method exists
const testGlobe = new ThreeGlobe();
console.log('globeTileEngineUrl exists:', typeof testGlobe.globeTileEngineUrl === 'function');
console.log('Available methods:', Object.keys(testGlobe).filter(k => typeof testGlobe[k] === 'function'));

// DOM elements
const container = document.getElementById('globe-container');
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');

function log(msg, type = 'info') {
    console.log(msg);
    if (debugEl) {
        const line = document.createElement('div');
        line.className = type;
        line.textContent = `> ${msg}`;
        debugEl.appendChild(line);
    }
}

// Scene setup
let scene, camera, renderer, controls, globe;

function init() {
    log('Initializing scene...');

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);

    // Camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 300);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 101;
    controls.maxDistance = 500;
    controls.enablePan = false;

    // Create globe
    log('Creating globe...');
    globe = new ThreeGlobe();

    // Check for tile engine
    if (typeof globe.globeTileEngineUrl === 'function') {
        log('TILE ENGINE AVAILABLE!', 'success');
        statusEl.textContent = 'Tile streaming enabled!';
        statusEl.className = 'success';

        // Try CartoDB tiles (often have better CORS support)
        const tileUrl = (x, y, l) => {
            const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${l}/${x}/${y}.png`;
            log(`Requesting tile: z=${l} x=${x} y=${y}`, 'info');
            return url;
        };

        globe.globeTileEngineUrl(tileUrl);

        if (typeof globe.globeTileEngineMaxZoom === 'function') {
            globe.globeTileEngineMaxZoom(19);
            log('Set max zoom to 19');
        }

        // Don't set a default image - let tiles be the only source
        globe.showAtmosphere(true);
        globe.atmosphereColor('#38bdf8');
        globe.atmosphereAltitude(0.15);

        log('Configured CartoDB tile streaming');
    } else {
        log('Tile engine NOT available in this version', 'warn');
        statusEl.textContent = 'Static texture (no tiles)';
        statusEl.className = 'warn';

        globe
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
            .showAtmosphere(true)
            .atmosphereColor('#38bdf8')
            .atmosphereAltitude(0.15);
    }

    scene.add(globe);
    log('Globe added to scene', 'success');

    // Handle resize
    window.addEventListener('resize', onResize);

    // Start animation
    animate();

    // Hide loading
    document.getElementById('loading').style.display = 'none';
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    // Update distance display
    const dist = camera.position.length();
    document.getElementById('distance').textContent = dist.toFixed(0);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Fly to location
window.flyTo = function(lat, lon, altitude = 150) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const radius = 100 + altitude;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(x, y, z);
    const startTime = Date.now();

    function step() {
        const t = Math.min((Date.now() - startTime) / 2000, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(startPos, endPos, eased);
        camera.lookAt(0, 0, 0);
        if (t < 1) requestAnimationFrame(step);
    }
    step();
    log(`Flying to ${lat}, ${lon}`);
};

window.resetView = function() {
    camera.position.set(0, 0, 300);
    camera.lookAt(0, 0, 0);
};

// Initialize with error handling
try {
    init();
} catch (err) {
    console.error('Init failed:', err);
    log('INIT FAILED: ' + err.message, 'error');
    document.getElementById('loading').innerHTML =
        `<div style="color: #ef4444;">Error: ${err.message}</div>`;
}
