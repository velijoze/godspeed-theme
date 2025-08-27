// Placeholder Replacer for Godspeed Theme
// Dynamically replaces via.placeholder.com URLs with local SVG placeholders
// Located directly in assets folder (no subfolder)

(function() {
  'use strict';
  
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  function replacePlaceholders() {
    // Replace background images
    const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
    elementsWithBg.forEach(function(element) {
      const style = element.getAttribute('style');
      if (style && style.includes('via.placeholder.com')) {
        const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) {
          const placeholderUrl = urlMatch[1];
          const dimensionsMatch = placeholderUrl.match(/via\.placeholder\.com\/(\d+x\d+)/);
          if (dimensionsMatch && window.GodspeedPlaceholders) {
            const dimensions = dimensionsMatch[1];
            const newPlaceholder = window.GodspeedPlaceholders.get(dimensions);
            const newStyle = style.replace(placeholderUrl, newPlaceholder);
            element.setAttribute('style', newStyle);
          }
        }
      }
    });
    
    // Replace img src attributes
    const images = document.querySelectorAll('img[src*="via.placeholder.com"]');
    images.forEach(function(img) {
      const src = img.getAttribute('src');
      const dimensionsMatch = src.match(/via\.placeholder\.com\/(\d+x\d+)/);
      if (dimensionsMatch && window.GodspeedPlaceholders) {
        const dimensions = dimensionsMatch[1];
        const newPlaceholder = window.GodspeedPlaceholders.get(dimensions);
        img.setAttribute('src', newPlaceholder);
      }
    });
    
    // Replace data-src attributes (for lazy loading)
    const lazyImages = document.querySelectorAll('img[data-src*="via.placeholder.com"]');
    lazyImages.forEach(function(img) {
      const dataSrc = img.getAttribute('data-src');
      const dimensionsMatch = dataSrc.match(/via\.placeholder\.com\/(\d+x\d+)/);
      if (dimensionsMatch && window.GodspeedPlaceholders) {
        const dimensions = dimensionsMatch[1];
        const newPlaceholder = window.GodspeedPlaceholders.get(dimensions);
        img.setAttribute('data-src', newPlaceholder);
      }
    });
  }
  
  ready(function() {
    // Wait for placeholder generator to load
    if (typeof window.GodspeedPlaceholders !== 'undefined') {
      replacePlaceholders();
    } else {
      // Wait for it to load
      const checkPlaceholders = setInterval(function() {
        if (typeof window.GodspeedPlaceholders !== 'undefined') {
          clearInterval(checkPlaceholders);
          replacePlaceholders();
        }
      }, 100);
    }
    
    // Also run after any dynamic content loads
    if (typeof jQuery !== 'undefined') {
      jQuery(document).on('ajaxComplete', replacePlaceholders);
      jQuery(document).on('lazyloaded', replacePlaceholders);
    }
    
    // Run after delays for any late-loading content
    setTimeout(replacePlaceholders, 1000);
    setTimeout(replacePlaceholders, 3000);
  });
  
  // Also run when window loads
  window.addEventListener('load', replacePlaceholders);
})();
