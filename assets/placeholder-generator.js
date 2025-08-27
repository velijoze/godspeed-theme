// Placeholder Generator for Godspeed Theme
// Generates base64 SVG placeholders dynamically
// Located directly in assets folder (no subfolder)

function generatePlaceholder(width, height, text = '', bgColor = '#f0f0f0', textColor = '#666') {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" 
            fill="${textColor}" text-anchor="middle" dy=".3em">
        ${text || `${width}×${height}`}
      </text>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Predefined placeholder dimensions for common use cases
const placeholders = {
  '660x600': generatePlaceholder(660, 600, 'Product Image'),
  '300x300': generatePlaceholder(300, 300, 'Product Thumbnail'),
  '800x600': generatePlaceholder(800, 600, 'Banner Image'),
  '400x300': generatePlaceholder(400, 300, 'Gallery Image'),
  '1200x600': generatePlaceholder(1200, 600, 'Hero Image'),
  '200x200': generatePlaceholder(200, 200, 'Small Image'),
  '100x100': generatePlaceholder(100, 100, 'Icon')
};

function getPlaceholder(dimensions) {
  if (placeholders[dimensions]) {
    return placeholders[dimensions];
  }
  
  // Parse dimensions like "660x600" and generate custom placeholder
  const match = dimensions.match(/(\d+)x(\d+)/);
  if (match) {
    const width = parseInt(match[1]);
    const height = parseInt(match[2]);
    return generatePlaceholder(width, height);
  }
  
  // Fallback to default
  return placeholders['300x300'];
}

// Make available globally
window.GodspeedPlaceholders = {
  generate: generatePlaceholder,
  get: getPlaceholder,
  all: placeholders
};
