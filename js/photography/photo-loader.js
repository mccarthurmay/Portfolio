import * as THREE from 'three';
import { getPhotoURL } from './photo-data.js';

// Lazy loading manager for photos
export class PhotoLoader {
    constructor(camera, state) {
        this.camera = camera;
        this.state = state;
        this.loadedTextures = new Map(); // photoId -> texture
        this.loadingQueue = new Set();
        this.fadeAnimations = new Map(); // mesh -> { startTime, duration }
    }

    /**
     * Check if a photo mesh is visible in the current viewport
     */
    isVisible(mesh) {
        const position = mesh.position;
        const width = mesh.userData.width;
        const height = mesh.userData.height;

        // Calculate viewport bounds in world space
        const aspect = window.innerWidth / window.innerHeight;
        const frustumHeight = 50 / this.state.zoom;
        const frustumWidth = frustumHeight * aspect;

        const viewportMinX = this.state.panX - frustumWidth / 2;
        const viewportMaxX = this.state.panX + frustumWidth / 2;
        const viewportMinY = this.state.panY - frustumHeight / 2;
        const viewportMaxY = this.state.panY + frustumHeight / 2;

        // Add buffer zone for preloading (load slightly before entering viewport)
        const buffer = 5;
        const photoMinX = position.x - width / 2 - buffer;
        const photoMaxX = position.x + width / 2 + buffer;
        const photoMinY = position.y - height / 2 - buffer;
        const photoMaxY = position.y + height / 2 + buffer;

        // Check if photo bounds overlap viewport bounds
        return !(photoMaxX < viewportMinX ||
                 photoMinX > viewportMaxX ||
                 photoMaxY < viewportMinY ||
                 photoMinY > viewportMaxY);
    }

    /**
     * Load texture for a photo mesh with fade-in animation
     */
    loadPhotoTexture(mesh) {
        const photoId = mesh.userData.photoId;
        const photoData = mesh.userData.photoData;

        // Don't reload if already loaded
        if (mesh.userData.currentQuality === 'large' && mesh.material.map) {
            return;
        }

        // Don't load if already loading
        if (this.loadingQueue.has(photoId)) {
            return;
        }

        this.loadingQueue.add(photoId);

        const textureLoader = new THREE.TextureLoader();
        const url = getPhotoURL(photoData.cloudinaryUrl, 'large');  // Always use full quality

        textureLoader.load(
            url,
            (texture) => {
                // Dispose old texture if exists
                if (mesh.material.map) {
                    mesh.material.map.dispose();
                }

                // Set new texture with proper color space
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;

                mesh.material.map = texture;
                mesh.material.color.setHex(0xffffff);  // Reset color to white
                mesh.material.needsUpdate = true;
                mesh.userData.currentQuality = 'large';

                // Start fade-in animation
                mesh.material.opacity = 0;
                this.fadeAnimations.set(mesh, {
                    startTime: Date.now(),
                    duration: 300 // 300ms fade
                });

                this.loadedTextures.set(photoId, texture);
                this.loadingQueue.delete(photoId);
            },
            undefined,
            (error) => {
                console.error(`Failed to load photo ${photoId}:`, error);
                this.loadingQueue.delete(photoId);
            }
        );
    }

    /**
     * Unload texture from a photo mesh to save memory
     */
    unloadPhotoTexture(mesh) {
        const photoId = mesh.userData.photoId;

        if (mesh.material.map) {
            mesh.material.map.dispose();
            mesh.material.map = null;
            mesh.material.needsUpdate = true;
            mesh.userData.currentQuality = null;
            this.loadedTextures.delete(photoId);
        }
    }

    /**
     * Update fade animations
     */
    updateFadeAnimations() {
        const now = Date.now();
        const completedAnimations = [];

        this.fadeAnimations.forEach((animation, mesh) => {
            const elapsed = now - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);

            // Ease-out curve
            const eased = 1 - Math.pow(1 - progress, 3);
            mesh.material.opacity = eased;

            if (progress >= 1) {
                mesh.material.opacity = 1;
                completedAnimations.push(mesh);
            }
        });

        // Remove completed animations
        completedAnimations.forEach(mesh => {
            this.fadeAnimations.delete(mesh);
        });
    }

    /**
     * Main update loop - check visibility and manage loading
     */
    update(photoMeshes) {
        // Update fade animations
        this.updateFadeAnimations();

        // Check each photo
        photoMeshes.forEach(mesh => {
            const isVisible = this.isVisible(mesh);

            if (isVisible) {
                // Load if visible (always full quality)
                this.loadPhotoTexture(mesh);
            } else {
                // Optionally unload if far from viewport to save memory
                // Only unload if very far away
                const position = mesh.position;
                const distanceX = Math.abs(position.x - this.state.panX);
                const distanceY = Math.abs(position.y - this.state.panY);
                const farThreshold = 50; // Unload if more than 50 units away

                if (distanceX > farThreshold || distanceY > farThreshold) {
                    this.unloadPhotoTexture(mesh);
                }
            }
        });
    }

    /**
     * Dispose all loaded textures
     */
    dispose() {
        this.loadedTextures.forEach(texture => texture.dispose());
        this.loadedTextures.clear();
        this.fadeAnimations.clear();
    }
}
