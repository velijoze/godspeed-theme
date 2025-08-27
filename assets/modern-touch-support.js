// Modern Touch Support for Godspeed Theme
// Adds touch gestures, swipe support, and modern mobile interactions

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }
  
  // Add touch support to existing elements
  function addTouchSupport() {
    // Add touch class to body for CSS targeting
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('touch-device');
    } else {
      document.body.classList.add('no-touch-device');
    }
    
    // Add swipe support to product images
    const productImages = document.querySelectorAll('.product-image, .product-gallery img');
    productImages.forEach(function(img) {
      if (img.parentNode && !img.parentNode.classList.contains('swiper-slide')) {
        addSwipeSupport(img.parentNode);
      }
    });
    
    // Add touch feedback to buttons
    const touchButtons = document.querySelectorAll('button, .btn, a[href], .clickable');
    touchButtons.forEach(function(button) {
      addTouchFeedback(button);
    });
    
    // Add pull-to-refresh on mobile
    if ('ontouchstart' in window) {
      addPullToRefresh();
    }
  }
  
  // Add swipe support to element
  function addSwipeSupport(element) {
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    
    element.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    element.addEventListener('touchend', function(e) {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      
      const diffX = startX - endX;
      const diffY = startY - endY;
      
      // Determine swipe direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) {
          // Swipe left
          triggerSwipeEvent(element, 'swipeleft');
        } else if (diffX < -50) {
          // Swipe right
          triggerSwipeEvent(element, 'swiperight');
        }
      } else {
        if (diffY > 50) {
          // Swipe up
          triggerSwipeEvent(element, 'swipeup');
        } else if (diffY < -50) {
          // Swipe down
          triggerSwipeEvent(element, 'swipedown');
        }
      }
    }, { passive: true });
  }
  
  // Trigger custom swipe events
  function triggerSwipeEvent(element, direction) {
    const event = new CustomEvent('swipe', {
      detail: { direction: direction, element: element },
      bubbles: true
    });
    element.dispatchEvent(event);
    
    // Also trigger jQuery events if available
    if (typeof jQuery !== 'undefined') {
      jQuery(element).trigger('swipe', [direction, element]);
    }
  }
  
  // Add touch feedback to buttons
  function addTouchFeedback(button) {
    button.addEventListener('touchstart', function() {
      this.classList.add('touch-active');
    }, { passive: true });
    
    button.addEventListener('touchend', function() {
      this.classList.remove('touch-active');
    }, { passive: true });
    
    button.addEventListener('touchcancel', function() {
      this.classList.remove('touch-active');
    }, { passive: true });
  }
  
  // Add pull-to-refresh functionality
  function addPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    let isPulling = false;
    
    document.addEventListener('touchstart', function(e) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
      if (isPulling && window.scrollY === 0) {
        currentY = e.touches[0].clientY;
        pullDistance = currentY - startY;
        
        if (pullDistance > 0) {
          // Show pull indicator
          showPullIndicator(pullDistance);
        }
      }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
      if (isPulling && pullDistance > 100) {
        // Trigger refresh
        triggerRefresh();
      }
      
      // Hide pull indicator
      hidePullIndicator();
      isPulling = false;
      pullDistance = 0;
    }, { passive: true });
  }
  
  // Show pull-to-refresh indicator
  function showPullIndicator(distance) {
    let indicator = document.getElementById('pull-refresh-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-refresh-indicator';
      indicator.innerHTML = '<i class="fas fa-arrow-down"></i> Pull to refresh';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #007bff;
        color: white;
        text-align: center;
        padding: 10px;
        z-index: 9999;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }
    
    const progress = Math.min(distance / 100, 1);
    indicator.style.transform = `translateY(${(progress - 1) * 100}%)`;
  }
  
  // Hide pull-to-refresh indicator
  function hidePullIndicator() {
    const indicator = document.getElementById('pull-refresh-indicator');
    if (indicator) {
      indicator.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }
  
  // Trigger page refresh
  function triggerRefresh() {
    // Show loading state
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    loadingIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #28a745;
      color: white;
      text-align: center;
      padding: 10px;
      z-index: 9999;
    `;
    document.body.appendChild(loadingIndicator);
    
    // Refresh after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
  
  // Initialize touch support
  ready(function() {
    addTouchSupport();
    
    // Re-run after dynamic content loads
    if (typeof jQuery !== 'undefined') {
      jQuery(document).on('ajaxComplete', function() {
        setTimeout(addTouchSupport, 100);
      });
    }
  });
  
  // Also run when window loads
  window.addEventListener('load', addTouchSupport);
  
})();
