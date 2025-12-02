import { getPhotoURL } from './photo-data.js';

// Batch loading state
const batchState = {
    isProcessing: false,
    currentBatch: [],
    pendingImages: []  // Queue of images waiting to be loaded
};

/**
 * Process the next batch of images from the queue
 */
function processNextBatch() {
    if (batchState.isProcessing || batchState.pendingImages.length === 0) {
        return;
    }

    // Take next batch (max 3 images)
    const batchSize = Math.min(3, batchState.pendingImages.length);
    const batch = batchState.pendingImages.splice(0, batchSize);

    console.log(`📦 Starting batch of ${batchSize} images (${batchState.pendingImages.length} remaining)`);

    batchState.isProcessing = true;

    // Track batch
    batchState.currentBatch = batch.map(img => ({
        img: img,
        loaded: false,
        faded: false
    }));

    // Start loading all images in batch
    batch.forEach(img => {
        // If the image has a data-src, load it
        if (img.dataset.src && !img.src.includes(img.dataset.src)) {
            img.src = img.dataset.src;
            delete img.dataset.src;
        }
    });
}

/**
 * Unlock batch processing and start next batch
 */
function unlockBatch() {
    batchState.isProcessing = false;
    batchState.currentBatch = [];

    console.log('🔓 Batch complete');

    // Process next batch if there are pending images
    if (batchState.pendingImages.length > 0) {
        console.log(`📋 Processing ${batchState.pendingImages.length} pending images`);
        // Small delay before next batch
        setTimeout(() => {
            processNextBatch();
        }, 100);
    }
}

/**
 * Convert RGB to HSL color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} - {h: 0-360, s: 0-1, l: 0-1}
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: h * 360,
        s: s,
        l: l
    };
}

/**
 * Initialize the traditional portfolio grid view
 * @param {Array} photos - Array of photo data objects
 * @param {Object} options - Configuration options
 * @param {boolean} options.sortByColor - Whether to sort by color (default: true)
 */
export function initPortfolioView(photos, options = {}) {
    const { sortByColor = true } = options;

    const gridContainer = document.getElementById('portfolio-grid');

    console.log('Grid container:', gridContainer);
    console.log('Photos received:', photos.length);

    if (!gridContainer) {
        console.error('Portfolio grid container not found!');
        return;
    }

    // Sort photos by color (rainbow spectrum) unless disabled
    let sortedPhotos;
    if (sortByColor) {
        sortedPhotos = [...photos].sort((a, b) => {
            // Get the primary (most dominant) color from each palette
            const colorA = a.colorPalette[0];
            const colorB = b.colorPalette[0];

            // Convert to HSL
            const hslA = rgbToHsl(colorA.r, colorA.g, colorA.b);
            const hslB = rgbToHsl(colorB.r, colorB.g, colorB.b);

            // Sort by hue (creates rainbow order)
            // Then by saturation (vivid colors first)
            // Then by lightness (bright to dark)
            if (Math.abs(hslA.h - hslB.h) > 5) {  // 5 degree tolerance for similar hues
                return hslA.h - hslB.h;  // Rainbow order
            } else if (Math.abs(hslA.s - hslB.s) > 0.1) {
                return hslB.s - hslA.s;  // More saturated first
            } else {
                return hslB.l - hslA.l;  // Brighter first
            }
        });
    } else {
        sortedPhotos = photos;  // Use provided order
    }

    console.log('Sorted photos:', sortedPhotos.length);

    // Create grid items
    const columns = 3;
    const columnContainers = [];

    // Create column containers
    for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'portfolio-column';
        gridContainer.appendChild(column);
        columnContainers.push(column);
    }

    // Distribute photos using greedy algorithm (shortest column first)
    // This maintains color order better with varying aspect ratios
    const columnHeights = new Array(columns).fill(0);

    sortedPhotos.forEach((photo, index) => {
        // Find the shortest column
        let shortestColumnIndex = 0;
        let minHeight = columnHeights[0];

        for (let i = 1; i < columns; i++) {
            if (columnHeights[i] < minHeight) {
                minHeight = columnHeights[i];
                shortestColumnIndex = i;
            }
        }

        // Add photo to shortest column
        // Prioritize first 10 images (load immediately), lazy load the rest
        const shouldLazyLoad = index >= 10;
        const gridItem = createPortfolioItem(photo, shouldLazyLoad);
        columnContainers[shortestColumnIndex].appendChild(gridItem);

        // Update column height (using aspect ratio)
        // Height contribution = 1 / aspectRatio (normalized)
        columnHeights[shortestColumnIndex] += (1 / (photo.aspectRatio || 1));

        if (index < 6) {
            console.log(`Photo ${index} -> Column ${shortestColumnIndex} (height: ${columnHeights[shortestColumnIndex].toFixed(2)}):`, photo.cloudinaryUrl);
        }
    });

    console.log('Grid container children:', gridContainer.children.length);

    // Setup intersection observer for smooth loading
    setupLazyLoadObserver();

    console.log(`Portfolio view initialized with ${photos.length} photos`);
}

/**
 * Setup intersection observer for batch lazy loading
 */
function setupLazyLoadObserver() {
    const portfolioView = document.getElementById('portfolio-view');

    const options = {
        root: portfolioView,
        rootMargin: '0px',  // Load only when visible
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        // Filter to only intersecting entries
        const intersecting = entries.filter(entry => entry.isIntersecting);

        if (intersecting.length === 0) return;

        // Add all intersecting images to the pending queue
        intersecting.forEach(entry => {
            const img = entry.target;

            // Only add if not already in queue and has data-src
            if (img.dataset.src && !batchState.pendingImages.includes(img)) {
                batchState.pendingImages.push(img);
                console.log('➕ Added image to queue');
            }

            // Stop observing once added to queue
            observer.unobserve(img);
        });

        // If not currently processing a batch, start processing
        if (!batchState.isProcessing) {
            processNextBatch();
        } else {
            console.log(`⏸️ Batch already loading, queued ${intersecting.length} images`);
        }

    }, options);

    // Observe all lazy-loaded images
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => observer.observe(img));

    console.log(`👀 Observing ${lazyImages.length} lazy images (batch mode)`);
}


/**
 * Create a portfolio grid item
 * @param {Object} photo - Photo data
 * @param {boolean} shouldLazyLoad - Whether to lazy load this image
 */
function createPortfolioItem(photo, shouldLazyLoad = true) {
    const item = document.createElement('div');
    item.className = 'portfolio-photo';

    const img = document.createElement('img');
    img.alt = photo.allTags.join(', ');

    if (shouldLazyLoad) {
        // Store URL in data-src for lazy loading (large = 1600px quality)
        img.dataset.src = getPhotoURL(photo.cloudinaryUrl, 'large');
        // Use a 1x1 transparent placeholder
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    } else {
        // Load immediately for first 10 images (large = 1600px quality)
        img.src = getPhotoURL(photo.cloudinaryUrl, 'large');
    }

    // Fade in when image loads
    img.addEventListener('load', () => {
        // Only fade in if it's not the placeholder
        if (!img.src.startsWith('data:image')) {
            item.classList.add('loaded');

            // Check if this image is part of current batch
            const batchItem = batchState.currentBatch.find(b => b.img === img);

            if (batchItem) {
                console.log('✅ Batch image loaded, starting fade');
                batchItem.loaded = true;

                // Wait for 1.2s fade to complete
                setTimeout(() => {
                    batchItem.faded = true;
                    console.log('✨ Batch image fade complete');

                    // Check if all batch images are loaded and faded
                    const allComplete = batchState.currentBatch.every(
                        b => b.loaded && b.faded
                    );

                    if (allComplete) {
                        console.log('🎉 Batch complete');
                        unlockBatch();
                    }
                }, 1200); // Match CSS transition time
            }
        }
    });

    // Error handler - if image fails to load, don't block forever
    img.addEventListener('error', () => {
        const batchItem = batchState.currentBatch.find(b => b.img === img);
        if (batchItem) {
            console.error('❌ Image failed to load, marking as complete');
            batchItem.loaded = true;
            batchItem.faded = true;

            // Check if all batch images are done
            const allComplete = batchState.currentBatch.every(
                b => b.loaded && b.faded
            );

            if (allComplete) {
                unlockBatch();
            }
        }
    });

    // Click to open lightbox
    item.addEventListener('click', () => {
        openLightbox(photo);
    });

    item.appendChild(img);
    return item;
}

/**
 * Open lightbox for a photo
 */
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
}

/**
 * Clear portfolio grid
 */
export function clearPortfolioView() {
    const gridContainer = document.getElementById('portfolio-grid');
    gridContainer.innerHTML = '';
}
