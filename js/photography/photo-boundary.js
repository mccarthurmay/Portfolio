import * as THREE from 'three';
import { scene } from './photo-scene.js';

/**
 * Create or update visual boundary around photos
 */
export function createBoundary(minX, maxX, minY, maxY) {
    // Create points for boundary rectangle
    const points = [
        new THREE.Vector3(minX, minY, 0),
        new THREE.Vector3(maxX, minY, 0),
        new THREE.Vector3(maxX, maxY, 0),
        new THREE.Vector3(minX, maxY, 0),
        new THREE.Vector3(minX, minY, 0)  // Close the loop
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // Subtle boundary color - light gray
    const material = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        linewidth: 1,
        opacity: 0.3,
        transparent: true
    });

    const line = new THREE.Line(geometry, material);
    return line;
}

/**
 * Update existing boundary or create new one
 */
export function updateBoundary(boundaryLine, minX, maxX, minY, maxY) {
    if (boundaryLine) {
        // Update existing boundary
        const points = [
            new THREE.Vector3(minX, minY, 0),
            new THREE.Vector3(maxX, minY, 0),
            new THREE.Vector3(maxX, maxY, 0),
            new THREE.Vector3(minX, maxY, 0),
            new THREE.Vector3(minX, minY, 0)
        ];

        boundaryLine.geometry.dispose();
        boundaryLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
        boundaryLine.geometry.needsUpdate = true;
    } else {
        // Create new boundary
        boundaryLine = createBoundary(minX, maxX, minY, maxY);
        scene.add(boundaryLine);
    }

    return boundaryLine;
}

/**
 * Calculate boundary from photo meshes
 */
export function calculateBoundaryFromPhotos(photoMeshes, bufferX = 2, bufferY = 2) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    photoMeshes.forEach(mesh => {
        const pos = mesh.position;
        const width = mesh.userData.width;
        const height = mesh.userData.height;

        minX = Math.min(minX, pos.x - width / 2);
        maxX = Math.max(maxX, pos.x + width / 2);
        minY = Math.min(minY, pos.y - height / 2);
        maxY = Math.max(maxY, pos.y + height / 2);
    });

    return {
        minX: minX - bufferX,
        maxX: maxX + bufferX,
        minY: minY - bufferY,
        maxY: maxY + bufferY
    };
}
