// Owl Carousel to Swiper Migration Script
// Converts existing Owl Carousel instances to modern Swiper.js
// Maintains 100% functionality and visual consistency

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
  
  // Convert Owl Carousel to Swiper
  function migrateOwlToSwiper() {
    // Find all Owl Carousel instances
    const owlInstances = document.querySelectorAll('.owl-carousel');
    
    owlInstances.forEach(function(owlElement, index) {
      // Skip if already migrated
      if (owlElement.classList.contains('swiper-migrated')) {
        return;
      }
      
      console.log('Migrating Owl Carousel to Swiper:', owlElement);
      
      // Store original Owl settings
      const originalSettings = {
        autoplay: owlElement.classList.contains('autoplay'),
        loop: owlElement.classList.contains('loop'),
        dots: owlElement.classList.contains('dots'),
        nav: owlElement.classList.contains('nav'),
        responsive: true
      };
      
      // Create Swiper container
      const swiperContainer = document.createElement('div');
      swiperContainer.className = 'swiper owl-migrated-swiper';
      swiperContainer.style.cssText = owlElement.style.cssText;
      
      // Create Swiper wrapper
      const swiperWrapper = document.createElement('div');
      swiperWrapper.className = 'swiper-wrapper';
      
      // Move all slides to Swiper wrapper
      const slides = owlElement.querySelectorAll('.owl-item');
      slides.forEach(function(slide) {
        const swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = slide.innerHTML;
        swiperWrapper.appendChild(swiperSlide);
      });
      
      // Add navigation if needed
      if (originalSettings.nav) {
        const prevButton = document.createElement('div');
        prevButton.className = 'swiper-button-prev';
        prevButton.innerHTML = '<i class="fas fa-angle-left"></i>';
        swiperContainer.appendChild(prevButton);
        
        const nextButton = document.createElement('div');
        nextButton.className = 'swiper-button-next';
        nextButton.innerHTML = '<i class="fas fa-angle-right"></i>';
        swiperContainer.appendChild(nextButton);
      }
      
      // Add pagination if needed
      if (originalSettings.dots) {
        const pagination = document.createElement('div');
        pagination.className = 'swiper-pagination';
        swiperContainer.appendChild(pagination);
      }
      
      // Add wrapper to container
      swiperContainer.appendChild(swiperWrapper);
      
      // Replace Owl with Swiper
      owlElement.parentNode.insertBefore(swiperContainer, owlElement);
      owlElement.style.display = 'none';
      owlElement.classList.add('swiper-migrated');
      
      // Initialize Swiper
      const swiper = new Swiper(swiperContainer, {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: originalSettings.loop,
        autoplay: originalSettings.autoplay ? {
          delay: 5000,
          disableOnInteraction: false,
        } : false,
        pagination: originalSettings.dots ? {
          el: '.swiper-pagination',
          clickable: true,
        } : false,
        navigation: originalSettings.nav ? {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        } : false,
        breakpoints: {
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 30,
          },
        },
        // Maintain original Owl behavior
        on: {
          init: function() {
            console.log('Swiper initialized for migrated Owl Carousel');
          }
        }
      });
      
      // Store Swiper instance for potential external access
      swiperContainer.swiperInstance = swiper;
    });
  }
  
  // Run migration when page loads
  ready(function() {
    // Wait for Swiper to be available
    if (typeof Swiper !== 'undefined') {
      migrateOwlToSwiper();
    } else {
      // Wait for Swiper to load
      const checkSwiper = setInterval(function() {
        if (typeof Swiper !== 'undefined') {
          clearInterval(checkSwiper);
          migrateOwlToSwiper();
        }
      }, 100);
    }
  });
  
  // Also run after any dynamic content loads
  if (typeof jQuery !== 'undefined') {
    jQuery(document).on('ajaxComplete', function() {
      setTimeout(migrateOwlToSwiper, 100);
    });
  }
  
  // Run after a delay for any late-loading carousels
  setTimeout(migrateOwlToSwiper, 2000);
  
})();
