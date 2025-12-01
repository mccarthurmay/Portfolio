import * as THREE from 'three';
import { getPhotoURL } from './photo-data.js';

export function createPhotoMesh(photo) {
    // Use variable dimensions from clustering (if available) or calculate from aspect ratio
    const width = photo.displayWidth || (3 * (photo.aspectRatio || 1));
    const height = photo.displayHeight || 3;

    const geometry = new THREE.PlaneGeometry(width, height);

    // Create material without texture (placeholder)
    // Texture will be loaded lazily by PhotoLoader
    const material = new THREE.MeshBasicMaterial({
        color: 0xf5f4f2,  // Cream placeholder color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0  // Start invisible for fade-in
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position on flat plane using canvasPosition
    const canvasPos = photo.canvasPosition;
    mesh.position.set(canvasPos.x, canvasPos.y, canvasPos.z);

    // No rotation needed - all photos face camera naturally
    mesh.rotation.set(0, 0, 0);

    // Store metadata
    mesh.userData = {
        photoId: photo.id,
        photoData: photo,
        originalPosition: mesh.position.clone(),
        position2D: photo.position2D,
        canvasPosition: photo.canvasPosition,
        isPhoto: true,
        currentQuality: null,  // No texture loaded yet
        width: width,
        height: height
    };

    return mesh;
}

export function createAllPhotoMeshes(photos) {
    return photos.map(photo => createPhotoMesh(photo));
}

// Determine quality based on zoom level
export function getQualityForZoom(zoom) {
    if (zoom < 0.5) return 'thumbnail';  // Zoomed out: 400px
    if (zoom < 2.0) return 'medium';     // Normal: 800px
    return 'large';                       // Zoomed in: 1600px
}

// Update photo texture quality
export function updatePhotoQuality(mesh, newQuality) {
    const userData = mesh.userData;

    if (userData.currentQuality === newQuality) return;

    const photoData = userData.photoData;
    const newTextureURL = getPhotoURL(photoData.cloudinaryUrl, newQuality);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(newTextureURL, (newTexture) => {
        // Dispose old texture
        if (mesh.material.map) {
            mesh.material.map.dispose();
        }

        // Apply new texture
        mesh.material.map = newTexture;
        mesh.material.needsUpdate = true;
        userData.currentQuality = newQuality;
    });
}
