import * as THREE from 'three';

export let scene, camera, renderer;
export let sphereCore;
export const photoMeshes = [];
export let boundaryLine = null;

export const state = {
    mode: 'flat',  // Single mode only

    // Pan/zoom state
    panX: 0,
    panY: 0,
    zoom: 6,  // Start at medium zoom
    minZoom: 5.7,  // Minimum zoom (limited to show ~4 photos at once)
    maxZoom: 15,  // Maximum zoom (much closer for detail)

    // Boundaries (will be set based on photo count)
    bounds: {
        minX: -20,
        maxX: 20,
        minY: -100,
        maxY: 0
    },

    selectedPhoto: null
};

export function initScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f4f2);  // Cream/off-white

    // Camera - OrthographicCamera for true 2D projection
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = 50;
    const frustumWidth = frustumHeight * aspect;

    camera = new THREE.OrthographicCamera(
        -frustumWidth / 2,   // left
        frustumWidth / 2,    // right
        frustumHeight / 2,   // top
        -frustumHeight / 2,  // bottom
        0.1,
        1000
    );
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('photo-canvas-container').appendChild(renderer.domElement);

    // Lighting - simple ambient only for flat view
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// Stars and core removed for flat canvas mode

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = 50 / state.zoom;
    const frustumWidth = frustumHeight * aspect;

    camera.left = -frustumWidth / 2;
    camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
