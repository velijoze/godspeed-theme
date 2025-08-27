// WebP Image Support for Godspeed Theme
// Provides WebP image support with automatic fallbacks for older browsers

(function() {
  'use strict';
  
  // Check if browser supports WebP
  function supportsWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = function () {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
  
  // Convert image URLs to WebP when supported
  function convertToWebP() {
    const images = document.querySelectorAll('img[data-webp], img[src*=".jpg"], img[src*=".png"], img[src*=".jpeg"]');
    
    images.forEach(function(img) {
      // Skip if already processed or has specific WebP source
      if (img.classList.contains('webp-processed') || img.dataset.webp) {
        return;
      }
      
      const originalSrc = img.src;
      if (originalSrc && !originalSrc.includes('data:') && !originalSrc.includes('blob:')) {
        // Try to convert to WebP
        const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)(\?.*)?$/i, '.webp$2');
        
        // Test if WebP version exists
        testImageExists(webpSrc).then(function(exists) {
          if (exists) {
            img.src = webpSrc;
            img.classList.add('webp-processed');
          }
        });
      }
    });
  }
  
  // Test if an image exists
  function testImageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() { resolve(true); };
      img.onerror = function() { resolve(false); };
      img.src = url;
    });
  }
  
  // Add WebP support to background images
  function convertBackgroundImages() {
    const elements = document.querySelectorAll('[style*="background-image"], [class*="bg-"]');
    
    elements.forEach(function(element) {
      const style = window.getComputedStyle(element);
      const backgroundImage = style.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) {
          const originalUrl = urlMatch[1];
          if (originalUrl && !originalUrl.includes('data:') && !originalUrl.includes('blob:')) {
            const webpUrl = originalUrl.replace(/\.(jpg|jpeg|png)(\?.*)?$/i, '.webp$2');
            
            testImageExists(webpUrl).then(function(exists) {
              if (exists) {
                element.style.backgroundImage = `url('${webpUrl}')`;
                element.classList.add('webp-bg-processed');
              }
            });
          }
        }
      }
    });
  }
  
  // Initialize WebP support
  async function initWebPSupport() {
    const webpSupported = await supportsWebP();
    
    if (webpSupported) {
      document.documentElement.classList.add('webp');
      document.documentElement.classList.remove('no-webp');
      
      // Convert existing images
      convertToWebP();
      convertBackgroundImages();
      
      // Watch for new images
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                  if (node.tagName === 'IMG') {
                    convertToWebP();
                  } else {
                    const newImages = node.querySelectorAll('img');
                    if (newImages.length > 0) {
                      convertToWebP();
                    }
                  }
                }
              });
            }
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
      
      console.log('✅ WebP support enabled');
    } else {
      document.documentElement.classList.add('no-webp');
      document.documentElement.classList.remove('webp');
      console.log('ℹ️ WebP not supported, using fallback images');
    }
  }
  
  // Run when DOM is ready
  if (document.readyState !== 'loading') {
    initWebPSupport();
  } else {
    document.addEventListener('DOMContentLoaded', initWebPSupport);
  }
  
  // Also run after any dynamic content loads
  if (typeof jQuery !== 'undefined') {
    jQuery(document).on('ajaxComplete', function() {
      setTimeout(function() {
        convertToWebP();
        convertBackgroundImages();
      }, 100);
    });
  }
  
  // Run after a delay for any late-loading images
  setTimeout(function() {
    convertToWebP();
    convertBackgroundImages();
  }, 2000);
  
})();
