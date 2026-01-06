/**
 * Globe Map Quiz - Country Renderer
 * Handles GeoJSON country boundaries and selection
 */

import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { sceneManager } from '../core/scene.js';
import { globeRenderer } from './globe.js';

class CountryRenderer {
    constructor() {
        this.countriesGroup = null;
        this.bordersGroup = null;
        this.highlightMesh = null;
        this.lookupTexture = null;
        this.lookupCanvas = null;
        this.countryData = [];
        this.countryMeshes = new Map();
    }

    /**
     * Load and process GeoJSON country data
     */
    async load() {
        try {
            state.set('countries.loaded', false);

            // Fetch TopoJSON data
            const response = await fetch(CONFIG.data.countriesUrl);
            const topoData = await response.json();

            // Convert TopoJSON to GeoJSON features
            const countries = topojson.feature(topoData, topoData.objects.countries);

            // Process country data
            this.countryData = countries.features.map((feature, index) => {
                const props = feature.properties || {};
                return {
                    id: feature.id || index,
                    name: props.name || `Country ${index}`,
                    geometry: feature.geometry,
                    centroid: this._calculateCentroid(feature.geometry),
                    bounds: this._calculateBounds(feature.geometry)
                };
            });

            // Build lookup maps
            const byId = new Map();
            const byName = new Map();
            this.countryData.forEach(country => {
                byId.set(country.id, country);
                byName.set(country.name.toLowerCase(), country);
            });

            state.update({
                'countries.loaded': true,
                'countries.data': this.countryData,
                'countries.byId': byId,
                'countries.byName': byName
            });

            // Create visual elements
            await this._createCountryMeshes();
            this._createLookupTexture();

            return this.countryData;

        } catch (error) {
            console.error('Failed to load country data:', error);
            throw error;
        }
    }

    /**
     * Calculate centroid of a geometry
     */
    _calculateCentroid(geometry) {
        let totalLat = 0, totalLon = 0, count = 0;

        const processCoords = (coords) => {
            if (typeof coords[0] === 'number') {
                totalLon += coords[0];
                totalLat += coords[1];
                count++;
            } else {
                coords.forEach(processCoords);
            }
        };

        if (geometry.coordinates) {
            processCoords(geometry.coordinates);
        }

        return count > 0 ? {
            lat: totalLat / count,
            lon: totalLon / count
        } : { lat: 0, lon: 0 };
    }

    /**
     * Calculate bounding box
     */
    _calculateBounds(geometry) {
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

        const processCoords = (coords) => {
            if (typeof coords[0] === 'number') {
                minLon = Math.min(minLon, coords[0]);
                maxLon = Math.max(maxLon, coords[0]);
                minLat = Math.min(minLat, coords[1]);
                maxLat = Math.max(maxLat, coords[1]);
            } else {
                coords.forEach(processCoords);
            }
        };

        if (geometry.coordinates) {
            processCoords(geometry.coordinates);
        }

        return { minLat, maxLat, minLon, maxLon };
    }

    /**
     * Create 3D meshes for country borders
     */
    async _createCountryMeshes() {
        this.bordersGroup = new THREE.Group();
        this.bordersGroup.name = 'borders';

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            linewidth: 1
        });

        this.countryData.forEach(country => {
            const lines = this._geometryToLines(country.geometry);
            lines.forEach(line => {
                line.material = lineMaterial;
                this.bordersGroup.add(line);
            });
        });

        sceneManager.scene.add(this.bordersGroup);
    }

    /**
     * Convert GeoJSON geometry to Three.js lines
     */
    _geometryToLines(geometry) {
        const lines = [];
        const radius = CONFIG.globe.radius * 1.001; // Slightly above surface

        const processRing = (ring) => {
            const points = [];
            ring.forEach(([lon, lat]) => {
                const point = this._latLonToPoint(lat, lon, radius);
                points.push(point);
            });

            if (points.length > 1) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry);
                lines.push(line);
            }
        };

        const processPolygon = (coords) => {
            coords.forEach(ring => processRing(ring));
        };

        if (geometry.type === 'Polygon') {
            processPolygon(geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => processPolygon(polygon));
        }

        return lines;
    }

    /**
     * Convert lat/lon to 3D point
     */
    _latLonToPoint(lat, lon, radius = CONFIG.globe.radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    /**
     * Create lookup texture for raycasting
     */
    _createLookupTexture() {
        const size = 2048;
        this.lookupCanvas = document.createElement('canvas');
        this.lookupCanvas.width = size;
        this.lookupCanvas.height = size;
        const ctx = this.lookupCanvas.getContext('2d');

        // Fill with black (no country)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Draw each country with unique color based on ID
        this.countryData.forEach(country => {
            const color = this._idToColor(country.id);
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;

            this._drawGeometry(ctx, country.geometry, size);
        });

        this.lookupTexture = new THREE.CanvasTexture(this.lookupCanvas);
    }

    /**
     * Convert country ID to unique color
     */
    _idToColor(id) {
        const r = (id & 0xFF0000) >> 16;
        const g = (id & 0x00FF00) >> 8;
        const b = id & 0x0000FF;
        return `rgb(${r},${g},${b})`;
    }

    /**
     * Convert color back to country ID
     */
    _colorToId(r, g, b) {
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Draw geometry to canvas
     */
    _drawGeometry(ctx, geometry, size) {
        const project = ([lon, lat]) => {
            const x = ((lon + 180) / 360) * size;
            const y = ((90 - lat) / 180) * size;
            return [x, y];
        };

        const drawRing = (ring) => {
            ctx.beginPath();
            ring.forEach(([lon, lat], i) => {
                const [x, y] = project([lon, lat]);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
        };

        const drawPolygon = (coords) => {
            coords.forEach((ring, i) => {
                if (i === 0) drawRing(ring); // Outer ring
            });
        };

        if (geometry.type === 'Polygon') {
            drawPolygon(geometry.coordinates);
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => drawPolygon(polygon));
        }
    }

    /**
     * Get country at UV coordinates
     */
    getCountryAtUV(uv) {
        if (!this.lookupCanvas) return null;

        const x = Math.floor(uv.x * this.lookupCanvas.width);
        const y = Math.floor((1 - uv.y) * this.lookupCanvas.height);
        const ctx = this.lookupCanvas.getContext('2d');
        const pixel = ctx.getImageData(x, y, 1, 1).data;

        if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
            return null;
        }

        const id = this._colorToId(pixel[0], pixel[1], pixel[2]);
        return state.get('countries.byId').get(id) || null;
    }

    /**
     * Highlight a country
     */
    highlight(countryId) {
        // Clear previous highlight
        this.clearHighlight();

        const country = state.get('countries.byId').get(countryId);
        if (!country) return;

        state.set('countries.highlighted', countryId);

        // Create highlight mesh
        // TODO: Create filled polygon mesh for highlighting
    }

    /**
     * Clear country highlight
     */
    clearHighlight() {
        state.set('countries.highlighted', null);
        if (this.highlightMesh) {
            sceneManager.scene.remove(this.highlightMesh);
            this.highlightMesh = null;
        }
    }

    /**
     * Mark country as found
     */
    markFound(countryId) {
        const found = state.get('countries.found');
        found.add(countryId);
        state.set('countries.found', found);
    }

    /**
     * Set border visibility
     */
    setBordersVisible(visible) {
        if (this.bordersGroup) {
            this.bordersGroup.visible = visible;
        }
    }

    /**
     * Update border color based on theme
     */
    updateBorderColor(color) {
        if (this.bordersGroup) {
            this.bordersGroup.traverse(child => {
                if (child.material) {
                    child.material.color.set(color);
                }
            });
        }
    }

    /**
     * Fly to country
     */
    flyToCountry(countryId) {
        const country = state.get('countries.byId').get(countryId);
        if (!country) return;

        sceneManager.flyTo(country.centroid.lat, country.centroid.lon);
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.bordersGroup) {
            this.bordersGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            sceneManager.scene.remove(this.bordersGroup);
        }

        if (this.highlightMesh) {
            sceneManager.scene.remove(this.highlightMesh);
        }

        if (this.lookupTexture) {
            this.lookupTexture.dispose();
        }

        this.countryMeshes.clear();
    }
}

// Singleton instance
export const countryRenderer = new CountryRenderer();
export default countryRenderer;
