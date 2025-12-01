import { getPhotoURL } from './photo-data.js';

let portfolioObserver = null;

/**
 * Initialize the traditional portfolio grid view
 * @param {Array} photos - Array of photo data objects
 */
export function initPortfolioView(photos) {
    const gridContainer = document.getElementById('portfolio-grid');

    console.log('Grid container:', gridContainer);
    console.log('Photos received:', photos.length);

    if (!gridContainer) {
        console.error('Portfolio grid container not found!');
        return;
    }

    // Sort photos by date (newest first)
    const sortedPhotos = [...photos].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;  // Newest first
    });

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

    // Distribute photos left-to-right into columns
    sortedPhotos.forEach((photo, index) => {
        const columnIndex = index % columns;
        const gridItem = createPortfolioItem(photo);
        columnContainers[columnIndex].appendChild(gridItem);

        if (index < 3) {
            console.log(`Photo ${index} -> Column ${columnIndex}:`, photo.cloudinaryUrl);
        }
    });

    console.log('Grid container children:', gridContainer.children.length);

    // Setup intersection observer for fade-in animation
    setupScrollAnimation();

    console.log(`Portfolio view initialized with ${photos.length} photos`);
}

/**
 * Setup scroll-based fade-in animation
 */
function setupScrollAnimation() {
    const portfolioView = document.getElementById('portfolio-view');

    const options = {
        root: portfolioView,  // Use portfolio view as root instead of viewport
        rootMargin: '100px',  // Start loading 100px before visible
        threshold: 0.1
    };

    portfolioObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing after it's visible
                portfolioObserver.unobserve(entry.target);
            }
        });
    }, options);

    // Observe all portfolio photos
    const photos = document.querySelectorAll('.portfolio-photo');
    console.log(`Setting up intersection observer for ${photos.length} photos`);

    photos.forEach(photo => {
        portfolioObserver.observe(photo);
    });
}

/**
 * Create a portfolio grid item
 */
function createPortfolioItem(photo) {
    const item = document.createElement('div');
    item.className = 'portfolio-photo';

    const img = document.createElement('img');
    img.src = getPhotoURL(photo.cloudinaryUrl, 'medium');  // Start with medium quality
    img.alt = photo.allTags.join(', ');
    img.loading = 'lazy';  // Native lazy loading

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

    // Load high-res
    lightboxImage.src = getPhotoURL(photoData.cloudinaryUrl, 'large');
    lightboxImage.alt = photoData.allTags.join(', ');

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
