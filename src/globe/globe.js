/**
 * Globe Map Quiz - Globe Renderer
 * High-quality PBR globe with displacement mapping
 */

import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { sceneManager } from '../core/scene.js';

class GlobeRenderer {
    constructor() {
        this.globe = null;
        this.atmosphere = null;
        this.clouds = null;
        this.material = null;
        this.textures = {};
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * Create the globe mesh with high-poly geodesic geometry
     * Uses IcosahedronGeometry for even triangle distribution
     */
    async create() {
        state.set('loading', true);
        state.set('loadProgress', 0);

        try {
            // Load textures first
            await this._loadTextures();

            // Create high-poly geodesic sphere
            // Detail level 6 = 163,842 vertices (good for displacement)
            // Detail level 7 = 655,362 vertices (very high quality)
            const geometry = new THREE.IcosahedronGeometry(
                CONFIG.globe.radius,
                6  // subdivision level
            );

            // Convert to buffer geometry with UVs for texturing
            this._computeUVs(geometry);

            // Create PBR material
            this.material = this._createMaterial();

            // Create mesh
            this.globe = new THREE.Mesh(geometry, this.material);
            this.globe.name = 'globe';

            // Add to scene
            sceneManager.scene.add(this.globe);

            // Create atmosphere glow
            this._createAtmosphere();

            // Create cloud layer (optional)
            if (this.textures.clouds) {
                this._createClouds();
            }

            state.set('globe.ready', true);
            state.set('loading', false);

            return this.globe;

        } catch (error) {
            console.error('Failed to create globe:', error);
            state.set('loading', false);
            throw error;
        }
    }

    /**
     * Load all textures with progress tracking
     */
    async _loadTextures() {
        const textureConfigs = [
            { key: 'color', url: CONFIG.textures.color8k, required: true },
            { key: 'height', url: CONFIG.textures.heightMap, required: false },
            { key: 'normal', url: CONFIG.textures.normalMap, required: false },
            { key: 'specular', url: CONFIG.textures.specularMap, required: false },
            { key: 'night', url: CONFIG.textures.nightLights, required: false },
            { key: 'clouds', url: CONFIG.textures.clouds, required: false }
        ];

        const validConfigs = textureConfigs.filter(c => c.url);
        let loaded = 0;

        const promises = validConfigs.map(config => {
            return new Promise((resolve) => {
                this.textureLoader.load(
                    config.url,
                    (texture) => {
                        texture.encoding = THREE.sRGBEncoding;
                        texture.anisotropy = sceneManager.renderer?.capabilities.getMaxAnisotropy() || 16;
                        this.textures[config.key] = texture;
                        loaded++;
                        state.set('loadProgress', Math.floor((loaded / validConfigs.length) * 100));
                        resolve(texture);
                    },
                    undefined,
                    (error) => {
                        if (config.required) {
                            console.error(`Failed to load required texture: ${config.key}`, error);
                        }
                        loaded++;
                        state.set('loadProgress', Math.floor((loaded / validConfigs.length) * 100));
                        resolve(null);
                    }
                );
            });
        });

        await Promise.all(promises);
    }

    /**
     * Compute UV coordinates for icosahedron geometry
     * Maps spherical coordinates to equirectangular projection
     */
    _computeUVs(geometry) {
        const positions = geometry.attributes.position;
        const uvs = new Float32Array(positions.count * 2);

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            // Convert to spherical coordinates
            const theta = Math.atan2(z, x);
            const phi = Math.acos(y / CONFIG.globe.radius);

            // Map to UV (equirectangular projection)
            uvs[i * 2] = 0.5 + theta / (2 * Math.PI);
            uvs[i * 2 + 1] = 1 - phi / Math.PI;
        }

        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    }

    /**
     * Create PBR material with all maps
     */
    _createMaterial() {
        const materialConfig = {
            map: this.textures.color || null,
            side: THREE.FrontSide,
            metalness: 0.0,
            roughness: 0.8
        };

        // Add displacement map for terrain
        if (this.textures.height) {
            materialConfig.displacementMap = this.textures.height;
            materialConfig.displacementScale = CONFIG.globe.displacementScale;
            materialConfig.displacementBias = -CONFIG.globe.displacementScale * 0.5;
        }

        // Add normal map for surface detail
        if (this.textures.normal) {
            materialConfig.normalMap = this.textures.normal;
            materialConfig.normalScale = new THREE.Vector2(1, 1);
        }

        // Add specular/roughness map
        if (this.textures.specular) {
            materialConfig.roughnessMap = this.textures.specular;
        }

        // Add emissive for city lights
        if (this.textures.night) {
            materialConfig.emissiveMap = this.textures.night;
            materialConfig.emissive = new THREE.Color(0xffaa44);
            materialConfig.emissiveIntensity = 0.5;
        }

        return new THREE.MeshStandardMaterial(materialConfig);
    }

    /**
     * Create atmospheric glow effect
     */
    _createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(
            CONFIG.globe.radius * 1.015,
            64, 64
        );

        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.atmosphere.name = 'atmosphere';
        sceneManager.scene.add(this.atmosphere);
    }

    /**
     * Create cloud layer
     */
    _createClouds() {
        const cloudGeometry = new THREE.SphereGeometry(
            CONFIG.globe.radius * 1.01,
            64, 64
        );

        const cloudMaterial = new THREE.MeshStandardMaterial({
            map: this.textures.clouds,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.clouds.name = 'clouds';
        sceneManager.scene.add(this.clouds);

        // Animate clouds slowly
        sceneManager.onRender((time) => {
            if (this.clouds) {
                this.clouds.rotation.y = time * 0.00002;
            }
        });
    }

    /**
     * Update emissive intensity based on sun position (day/night)
     */
    updateDayNight(sunDirection) {
        if (!this.material || !this.textures.night) return;

        // Calculate average light on visible hemisphere
        // For now, use a fixed value - can be made dynamic
        this.material.emissiveIntensity = 0.3;
    }

    /**
     * Set globe visibility
     */
    setVisible(visible) {
        if (this.globe) this.globe.visible = visible;
        if (this.atmosphere) this.atmosphere.visible = visible;
        if (this.clouds) this.clouds.visible = visible;
    }

    /**
     * Get point on globe surface from lat/lon
     */
    latLonToPoint(lat, lon) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -CONFIG.globe.radius * Math.sin(phi) * Math.cos(theta);
        const y = CONFIG.globe.radius * Math.cos(phi);
        const z = CONFIG.globe.radius * Math.sin(phi) * Math.sin(theta);

        return new THREE.Vector3(x, y, z);
    }

    /**
     * Get lat/lon from point on globe
     */
    pointToLatLon(point) {
        const normalized = point.clone().normalize();
        const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
        const lon = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI);
        return { lat, lon };
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.globe) {
            this.globe.geometry.dispose();
            this.material.dispose();
            sceneManager.scene.remove(this.globe);
        }
        if (this.atmosphere) {
            this.atmosphere.geometry.dispose();
            this.atmosphere.material.dispose();
            sceneManager.scene.remove(this.atmosphere);
        }
        if (this.clouds) {
            this.clouds.geometry.dispose();
            this.clouds.material.dispose();
            sceneManager.scene.remove(this.clouds);
        }

        Object.values(this.textures).forEach(tex => tex?.dispose());
        this.textures = {};
    }
}

// Singleton instance
export const globeRenderer = new GlobeRenderer();
export default globeRenderer;
