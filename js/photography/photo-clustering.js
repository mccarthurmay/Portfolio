// Convert RGB to HSL for better color sorting
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

    return { h: h * 360, s, l };
}

// Sort photos by color (hue-based)
function sortPhotosByColor(photos) {
    return photos.map((photo, index) => {
        const color = photo.dominantColor || { r: 128, g: 128, b: 128 };
        const hsl = rgbToHsl(color.r, color.g, color.b);
        return { photo, hsl, index };
    })
    .sort((a, b) => {
        // Sort by hue first (creates rainbow effect)
        if (Math.abs(a.hsl.h - b.hsl.h) > 5) {
            return a.hsl.h - b.hsl.h;
        }
        // Then by saturation (colorful vs muted)
        if (Math.abs(a.hsl.s - b.hsl.s) > 0.1) {
            return b.hsl.s - a.hsl.s;
        }
        // Finally by lightness (bright vs dark)
        return a.hsl.l - b.hsl.l;
    })
    .map(item => item.photo);
}

// Uniform width masonry layout with variable heights
// Photos are placed left-to-right, row-by-row for chronological order
function positionPhotosInGrid(photos) {
    if (photos.length === 0) return [];
    if (photos.length === 1) return [{ x: 0, y: 0, width: 3, height: 3 }];

    // Calculate square-ish grid: columns ≈ sqrt(photo_count)
    const columns = Math.ceil(Math.sqrt(photos.length));
    const uniformWidth = 3;  // All photos same width
    const columnSpacing = 3.3;  // Extremely tight spacing (width=3 + gap=0.3 = 3.3)
    const verticalGap = 0.15;  // Minimal vertical gap between photos

    const positions = [];
    const columnHeights = new Array(columns).fill(0);

    photos.forEach((photo, index) => {
        const aspectRatio = photo.aspectRatio || 1;

        // Fixed width, calculate height based on aspect ratio
        const width = uniformWidth;
        const height = uniformWidth / aspectRatio;  // Maintain aspect ratio

        // Place photos left-to-right (chronologically) using modulo
        const columnIndex = index % columns;

        // Calculate x position
        const x = (columnIndex - (columns - 1) / 2) * columnSpacing;

        // Calculate y position - position from TOP of photo, accounting for half height
        // Photos grow downward, so we subtract (columnHeight + height/2)
        const y = -(columnHeights[columnIndex] + height / 2);

        positions.push({ x, y, width, height });

        // Update column height - add FULL height plus gap to prevent overlap
        columnHeights[columnIndex] += height + verticalGap;
    });

    return positions;
}

// Calculate similarity score between two photos using tags (backup method)
function calculateTagSimilarity(photo1, photo2) {
    const tags1 = new Set(photo1.allTags);
    const tags2 = new Set(photo2.allTags);

    // Jaccard similarity
    const intersection = [...tags1].filter(tag => tags2.has(tag)).length;
    const union = new Set([...tags1, ...tags2]).size;

    return union > 0 ? intersection / union : 0;
}

// Sort photos by date (newest first)
function sortPhotosByDate(photos) {
    return [...photos].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;  // Newest first
    });
}

// Main entry point - uniform grid layout with various sorting options
export function clusterAndPositionPhotos(photos, sortBy = 'date') {
    let sortedPhotos = [...photos];

    if (sortBy === 'date') {
        // Sort by date (newest first) - default for chronological display
        sortedPhotos = sortPhotosByDate(photos);
    } else if (sortBy === 'color') {
        // Sort by dominant color (rainbow gradient)
        sortedPhotos = sortPhotosByColor(photos);
    } else if (sortBy === 'tags') {
        // Backup: sort by tag similarity (no sorting, will use original order)
        sortedPhotos = photos;
    }

    const positions2D = positionPhotosInGrid(sortedPhotos);

    return sortedPhotos.map((photo, index) => ({
        ...photo,
        position2D: positions2D[index],
        canvasPosition: {
            x: positions2D[index].x,
            y: positions2D[index].y,
            z: 0
        },
        // Store uniform dimensions for mesh creation
        displayHeight: positions2D[index].height,
        displayWidth: positions2D[index].width
    }));
}
