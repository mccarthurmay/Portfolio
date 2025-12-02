import * as THREE from 'three';
import { camera, state } from './photo-scene.js';
import { getPhotoURL } from './photo-data.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function initPhotoInteractions(canvas, photoMeshes, controls) {
    canvas.addEventListener('click', (event) => {
        // Only trigger if it was a click, not a drag
        if (controls.wasClick()) {
            onPhotoClick(event, canvas, photoMeshes);
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!controls.isDragging) {
            onPhotoHover(event, canvas, photoMeshes);
        }
    });
}

function updateMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPhotoClick(event, canvas, photoMeshes) {
    updateMousePosition(event, canvas);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoMeshes);

    if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.userData.isPhoto) {
            openLightbox(clicked.userData.photoData);
        }
    }
}

function onPhotoHover(event, canvas, photoMeshes) {
    updateMousePosition(event, canvas);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photoMeshes);

    // Change cursor when hovering over photo
    if (intersects.length > 0) {
        canvas.classList.add('hovering-photo');
    } else {
        canvas.classList.remove('hovering-photo');
    }
}

function openLightbox(photoData) {
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    // Remove loaded class to start fade from 0
    lightboxImage.classList.remove('loaded');

    // Load full original quality
    lightboxImage.src = getPhotoURL(photoData.cloudinaryUrl, 'original');
    lightboxImage.alt = photoData.allTags.join(', ');

    // Add loaded class when image is fully loaded
    lightboxImage.onload = () => {
        lightboxImage.classList.add('loaded');
    };

    lightbox.classList.remove('hidden');
    lightbox.classList.add('visible');

    state.selectedPhoto = photoData.id;
}

export function closeLightbox() {
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    lightbox.classList.remove('visible');
    lightbox.classList.add('hidden');

    // Clear the image to prevent showing stale image on next open
    if (lightboxImage) {
        lightboxImage.classList.remove('loaded');
        lightboxImage.src = '';
    }

    state.selectedPhoto = null;
}

export function initLightboxHandlers() {
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox-backdrop').addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state.selectedPhoto) {
            closeLightbox();
        }
    });
}
