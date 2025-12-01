import * as THREE from 'three';
import { camera, state } from './photo-scene.js';

export class PhotoControls {
    constructor(domElement, camera, state) {
        this.domElement = domElement;
        this.camera = camera;
        this.state = state;
        this.enabled = true;

        // Pan state
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseMoveDistance = 0;

        // Pan momentum
        this.panVelocity = { x: 0, y: 0 };
        this.dampingFactor = 0.92;

        // Touch state
        this.isPinching = false;
        this.lastPinchDistance = 0;

        this.addEventListeners();
    }

    addEventListeners() {
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Touch support
        this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    onMouseDown(event) {
        if (!this.enabled) return;
        this.isPanning = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.mouseMoveDistance = 0;
        this.panVelocity = { x: 0, y: 0 };
    }

    onMouseMove(event) {
        if (!this.enabled || !this.isPanning) return;

        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.mouseMoveDistance += Math.abs(deltaX) + Math.abs(deltaY);

        // Pan speed scales with zoom
        const panSpeed = 0.1 / this.state.zoom;

        this.panVelocity.x = deltaX * panSpeed;
        this.panVelocity.y = -deltaY * panSpeed;

        this.state.panX -= this.panVelocity.x;
        this.state.panY -= this.panVelocity.y;

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    onMouseUp(event) {
        this.isPanning = false;
    }

    onWheel(event) {
        if (!this.enabled) return;
        event.preventDefault();

        // Get mouse world position before zoom
        const mouseWorldBefore = this.getMouseWorldPosition(event);

        // Apply zoom
        const zoomSpeed = 0.001;
        const zoomDelta = -event.deltaY * zoomSpeed;
        const newZoom = this.state.zoom * (1 + zoomDelta);

        this.state.zoom = Math.max(
            this.state.minZoom,
            Math.min(this.state.maxZoom, newZoom)
        );

        // Get mouse position after zoom
        const mouseWorldAfter = this.getMouseWorldPosition(event);

        // Adjust pan to keep mouse position stable
        this.state.panX += (mouseWorldBefore.x - mouseWorldAfter.x);
        this.state.panY += (mouseWorldBefore.y - mouseWorldAfter.y);
    }

    getMouseWorldPosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const frustumHeight = 50 / this.state.zoom;
        const frustumWidth = frustumHeight * (rect.width / rect.height);

        return {
            x: this.state.panX + ndcX * (frustumWidth / 2),
            y: this.state.panY + ndcY * (frustumHeight / 2)
        };
    }

    // Touch support methods
    onTouchStart(event) {
        if (!this.enabled) return;

        if (event.touches.length === 1) {
            this.isPanning = true;
            this.lastMouseX = event.touches[0].clientX;
            this.lastMouseY = event.touches[0].clientY;
            this.mouseMoveDistance = 0;
        } else if (event.touches.length === 2) {
            this.isPinching = true;
            this.lastPinchDistance = this.getPinchDistance(event.touches);
        }
    }

    onTouchMove(event) {
        if (!this.enabled) return;
        event.preventDefault();

        if (event.touches.length === 1 && this.isPanning) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.lastMouseX;
            const deltaY = touch.clientY - this.lastMouseY;

            this.mouseMoveDistance += Math.abs(deltaX) + Math.abs(deltaY);

            const panSpeed = 0.1 / this.state.zoom;
            this.state.panX -= deltaX * panSpeed;
            this.state.panY += deltaY * panSpeed;

            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        } else if (event.touches.length === 2 && this.isPinching) {
            const currentDistance = this.getPinchDistance(event.touches);
            const delta = currentDistance - this.lastPinchDistance;

            const zoomDelta = delta * 0.01;
            const newZoom = this.state.zoom * (1 + zoomDelta);
            this.state.zoom = Math.max(this.state.minZoom, Math.min(this.state.maxZoom, newZoom));

            this.lastPinchDistance = currentDistance;
        }
    }

    onTouchEnd(event) {
        if (event.touches.length === 0) {
            this.isPanning = false;
            this.isPinching = false;
        }
    }

    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update() {
        if (!this.enabled) return;

        // Apply momentum when not panning
        if (!this.isPanning) {
            this.state.panX -= this.panVelocity.x;
            this.state.panY -= this.panVelocity.y;

            this.panVelocity.x *= this.dampingFactor;
            this.panVelocity.y *= this.dampingFactor;
        }

        // Enforce boundaries
        this.state.panX = Math.max(this.state.bounds.minX, Math.min(this.state.bounds.maxX, this.state.panX));
        this.state.panY = Math.max(this.state.bounds.minY, Math.min(this.state.bounds.maxY, this.state.panY));

        // Update camera
        this.updateCamera();
    }

    updateCamera() {
        // Update position for panning
        this.camera.position.set(this.state.panX, this.state.panY, 50);
        this.camera.lookAt(this.state.panX, this.state.panY, 0);

        // Update frustum for zooming
        const aspect = window.innerWidth / window.innerHeight;
        const frustumHeight = 50 / this.state.zoom;
        const frustumWidth = frustumHeight * aspect;

        this.camera.left = -frustumWidth / 2;
        this.camera.right = frustumWidth / 2;
        this.camera.top = frustumHeight / 2;
        this.camera.bottom = -frustumHeight / 2;

        this.camera.updateProjectionMatrix();
    }

    wasClick() {
        return this.mouseMoveDistance < 5;
    }
}
