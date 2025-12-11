// ===================================
// RADIAL MENU SYSTEM
// ===================================

import * as THREE from 'three';
import { camera, characterGroup } from './scene.js';
import { signLabels } from './world.js';
import { detachedCamera } from './controls.js';

// Radial menu state
let currentNearbySign = null;
let radialMenuOpen = false;
let selectedIndex = 0;

// Menu configurations for each sign type
const signMenuConfig = {
    'signphotography': [
        { label: 'Photo Gallery', action: 'photo-gallery' },
        { label: 'Photography', action: 'open-portfolio' },
        { label: 'Rugby Portfolio', action: 'open-rugby' },
        { label: 'About Me', action: 'open-about' }
    ],
    'signlinks': [
        { label: 'Instagram', action: 'open-instagram' },
        { label: 'LinkedIn', action: 'open-linkedin' },
        { label: 'GitHub', action: 'open-github' }
    ]
};

// Check if player is near any interactive sign
export function updateProximityCheck() {
    if (radialMenuOpen) return; // Don't check if menu is open

    // Use larger radius for bird's eye view to make interaction easier
    const proximityRadius = detachedCamera ? 5.0 : 0.3;
    let nearestSign = null;
    let minDistance = proximityRadius;

    // Use penguin position if in normal mode, camera position if in bird's eye view
    const referencePosition = detachedCamera ? camera.position : characterGroup.position;

    signLabels.forEach(signInfo => {
        const signName = signInfo.mesh.name.toLowerCase();

        // Only check signs that have menu configs
        if (!signMenuConfig[signName]) return;

        // Get current world position of the sign
        const signWorldPos = new THREE.Vector3();
        signInfo.mesh.getWorldPosition(signWorldPos);

        // Calculate distance from reference position (penguin or camera) to sign
        const distance = referencePosition.distanceTo(signWorldPos);

        if (distance < minDistance) {
            minDistance = distance;
            nearestSign = signInfo;
        }
    });

    // Update nearby sign state (distance-based only, no view direction check)
    if (nearestSign) {
        currentNearbySign = nearestSign;
        showInteractionPrompt();
    } else {
        currentNearbySign = null;
        hideInteractionPrompt();
    }
}

// Show interaction prompt
function showInteractionPrompt() {
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) {
        prompt.style.display = 'block';
    }
}

// Hide interaction prompt
function hideInteractionPrompt() {
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) {
        prompt.style.display = 'none';
    }
}

// Open radial menu
export function openRadialMenu() {
    if (!currentNearbySign || radialMenuOpen) return;

    const signName = currentNearbySign.mesh.name.toLowerCase();
    const menuItems = signMenuConfig[signName];

    if (!menuItems || menuItems.length === 0) return;

    radialMenuOpen = true;
    hideInteractionPrompt();

    const radialMenu = document.getElementById('radial-menu');
    const menuItemsContainer = document.getElementById('radial-menu-items');
    const menuCenter = document.getElementById('radial-menu-center');

    // Clear previous items
    menuItemsContainer.innerHTML = '';

    // Set center text
    menuCenter.textContent = 'ESC to close';

    // Calculate positions for menu items in a circle
    const radius = 150; // Distance from center

    // Define specific angles for each menu item based on label
    // Photo Gallery: Left (π), Photography: Top (-π/2), Rugby: Right (0), About: Bottom (π/2)
    const angleMap = {
        'Photo Gallery': Math.PI,           // Left (-180°)
        'Photography': -Math.PI / 2,        // Top (-90°)
        'Rugby Portfolio': 0,               // Right (0°)
        'About Me': Math.PI / 2,            // Bottom (90°)
        // Links menu (evenly distributed)
        'Instagram': -Math.PI / 2,          // Top
        'LinkedIn': Math.PI / 6,            // Bottom-right
        'GitHub': Math.PI - Math.PI / 6     // Bottom-left
    };

    menuItems.forEach((item, index) => {
        // Use specific angle if defined, otherwise distribute evenly
        const angle = angleMap[item.label] !== undefined
            ? angleMap[item.label]
            : (2 * Math.PI / menuItems.length) * index - Math.PI / 2;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const menuItem = document.createElement('div');
        menuItem.className = 'radial-menu-item';
        menuItem.textContent = item.label;
        menuItem.dataset.index = index;
        menuItem.dataset.action = item.action;

        // Position the item
        menuItem.style.transform = `translate(${x}px, ${y}px)`;

        // Click handler
        menuItem.addEventListener('click', () => {
            executeMenuAction(item.action);
            closeRadialMenu();
        });

        // Hover handler
        menuItem.addEventListener('mouseenter', () => {
            selectedIndex = index;
            updateSelection();
        });

        menuItemsContainer.appendChild(menuItem);
    });

    // Show menu with animation
    radialMenu.style.display = 'block';
    selectedIndex = 0;
    updateSelection();

    console.log(`Opened radial menu for ${signName} with ${menuItems.length} items`);
}

// Close radial menu
export function closeRadialMenu() {
    radialMenuOpen = false;
    const radialMenu = document.getElementById('radial-menu');
    if (radialMenu) {
        radialMenu.style.display = 'none';
    }

    // Show interaction prompt again if still near sign
    if (currentNearbySign) {
        showInteractionPrompt();
    }
}

// Update selection highlight
function updateSelection() {
    const items = document.querySelectorAll('.radial-menu-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Navigate menu with keyboard
export function navigateMenu(direction) {
    if (!radialMenuOpen) return;

    const itemCount = document.querySelectorAll('.radial-menu-item').length;

    if (direction === 'next') {
        selectedIndex = (selectedIndex + 1) % itemCount;
    } else if (direction === 'prev') {
        selectedIndex = (selectedIndex - 1 + itemCount) % itemCount;
    }

    updateSelection();
}

// Execute selected menu item
export function executeSelectedItem() {
    if (!radialMenuOpen) return;

    const selectedItem = document.querySelector('.radial-menu-item.selected');
    if (selectedItem) {
        const action = selectedItem.dataset.action;
        executeMenuAction(action);
        closeRadialMenu();
    }
}

// Execute menu action
function executeMenuAction(action) {
    console.log(`Executing action: ${action}`);

    switch (action) {
        case 'photo-gallery':
            console.log('Photography gallery not yet available');
            // window.location.href = 'canvas.html'; // When ready
            break;

        case 'open-portfolio':
            window.open('photography.html', '_blank');
            break;

        case 'open-rugby':
            window.open('rugby.html', '_blank');
            break;

        case 'open-about':
            window.open('about.html', '_blank');
            break;

        case 'open-instagram':
            window.open('https://www.instagram.com/max_mayy/', '_blank');
            break;

        case 'open-linkedin':
            window.open('https://www.linkedin.com/in/maximillian-may-734823268/', '_blank');
            break;

        case 'open-github':
            window.open('https://github.com/mccarthurmay', '_blank');
            break;

        default:
            console.warn(`Unknown action: ${action}`);
    }
}

// Check if radial menu is currently open
export function isRadialMenuOpen() {
    return radialMenuOpen;
}
