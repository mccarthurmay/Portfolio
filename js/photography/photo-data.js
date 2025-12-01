export async function loadPhotoDatabase(folderFilter = null) {
    const response = await fetch('tags.json');
    const data = await response.json();

    // Transform to array format with additional fields
    let photos = Object.entries(data).map(([id, info], index) => ({
        id: id,
        cloudinaryUrl: info.url,  // Full secure URL from Cloudinary
        folder: info.folder || 'unknown',  // Which folder: portfolio or rugby
        contentTags: info.content,
        styleTags: info.style,
        lightingTags: info.lighting,
        colorTags: info.colors,
        allTags: info.all_tags,
        dominantColor: info.dominant_color || { r: 128, g: 128, b: 128 },  // RGB color
        createdAt: info.created_at || '',  // Upload date from Cloudinary

        // Computed fields (filled by clustering)
        position2D: null,
        spherePosition: null,
        aspectRatio: 1,  // Will be updated when image loads
        width: 3,
        height: 3
    }));

    // Filter by folder if specified
    if (folderFilter) {
        photos = photos.filter(photo => photo.folder === folderFilter);
    }

    // Load actual dimensions for each photo
    await Promise.all(photos.map(photo => loadPhotoDimensions(photo)));

    return photos;
}

// Load image dimensions to get aspect ratio
async function loadPhotoDimensions(photo) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            photo.aspectRatio = img.width / img.height;
            photo.width = img.width;
            photo.height = img.height;
            resolve();
        };
        img.onerror = () => {
            // If load fails, use default
            photo.aspectRatio = 1;
            resolve();
        };
        // Use small thumbnail for dimension loading (faster)
        img.src = getPhotoURL(photo.cloudinaryUrl, 'thumbnail');
    });
}

// Cloudinary URL transformation (for different sizes)
export function getPhotoURL(cloudinaryUrl, size = 'thumbnail') {
    const transforms = {
        thumbnail: '/h_400,q_auto,f_auto,c_fit/',  // Fixed height, maintain aspect ratio
        medium: '/h_800,q_auto,f_auto,c_fit/',
        large: '/h_1600,q_auto,f_auto,c_fit/'
    };

    // Insert transformation into Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/{public_id}
    const transform = transforms[size];
    return cloudinaryUrl.replace('/upload/', `/upload${transform}`);
}
