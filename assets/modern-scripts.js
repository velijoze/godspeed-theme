/**
 * Modern JavaScript with ES6+ Features
 * Safe enhancement to existing jQuery functionality
 */

// Modern utility functions using ES6+ features
const ModernUtils = {
  // Template literals for dynamic content
  createProductCard: (product) => {
    return `
      <div class="product-card" data-product-id="${product.id}">
        <h3 class="product-title">${product.title}</h3>
        <p class="product-price">${product.price}</p>
        <button class="add-to-cart-btn" aria-label="Add ${product.title} to cart">
          Add to Cart
        </button>
      </div>
    `;
  },

  // Arrow functions and destructuring
  formatCurrency: (amount, currency = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  },

  // Array methods with arrow functions
  filterProducts: (products, criteria) => {
    return products.filter(product => {
      const { price, category, tags } = product;
      return price <= criteria.maxPrice && 
             category === criteria.category &&
             tags.some(tag => criteria.tags.includes(tag));
    });
  },

  // Map and reduce with modern syntax
  calculateTotal: (items) => {
    return items
      .map(item => item.price * item.quantity)
      .reduce((total, price) => total + price, 0);
  },

  // Async/await for modern API calls
  async fetchProductData: async (productId) => {
    try {
      const response = await fetch(`/products/${productId}.js`);
      const product = await response.json();
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  // Intersection Observer for lazy loading
  createLazyLoader: (selector, callback) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px'
    });

    document.querySelectorAll(selector).forEach(el => {
      observer.observe(el);
    });
  },

  // Modern event handling with options
  addEventListener: (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, {
      passive: true,
      capture: false,
      ...options
    });
  },

  // Debounce utility function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle utility function
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Modern grid functionality
const ModernGrid = {
  // Initialize modern grid layouts
  init: () => {
    ModernGrid.setupProductGrid();
    ModernGrid.setupMasonryGrid();
    ModernGrid.setupResponsiveGrid();
  },

  // Setup modern product grid
  setupProductGrid: () => {
    const productGrids = document.querySelectorAll('.product-grid-modern');
    
    productGrids.forEach(grid => {
      // Add loading state
      grid.classList.add('loading');
      
      // Simulate loading completion
      setTimeout(() => {
        grid.classList.remove('loading');
      }, 1000);
      
      // Add modern hover effects
      const products = grid.querySelectorAll('.product');
      products.forEach(product => {
        product.addEventListener('mouseenter', () => {
          product.style.transform = 'scale(1.02)';
        });
        
        product.addEventListener('mouseleave', () => {
          product.style.transform = 'scale(1)';
        });
      });
    });
  },

  // Setup masonry-like grid
  setupMasonryGrid: () => {
    const masonryGrids = document.querySelectorAll('.masonry-grid');
    
    masonryGrids.forEach(grid => {
      // Add random sizing for demo
      const items = grid.querySelectorAll('.masonry-item');
      items.forEach((item, index) => {
        if (index % 3 === 0) item.classList.add('tall');
        if (index % 4 === 0) item.classList.add('wide');
      });
    });
  },

  // Setup responsive grid with container queries
  setupResponsiveGrid: () => {
    const responsiveGrids = document.querySelectorAll('.container-responsive');
    
    responsiveGrids.forEach(grid => {
      // Add container query support
      grid.style.containerType = 'inline-size';
    });
  }
};

// Modern form handling
const ModernForms = {
  init: () => {
    ModernForms.setupFormValidation();
    ModernForms.setupAutoSave();
  },

  // Modern form validation
  setupFormValidation: () => {
    const forms = document.querySelectorAll('form[data-modern-validation]');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        // Real-time validation
        input.addEventListener('input', ModernUtils.debounce(() => {
          ModernForms.validateField(input);
        }, 300));
        
        // Modern focus handling
        input.addEventListener('focus', () => {
          input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
          input.parentElement.classList.remove('focused');
        });
      });
    });
  },

  // Validate individual field
  validateField: (field) => {
    const { value, type, required, pattern } = field;
    let isValid = true;
    let message = '';

    if (required && !value.trim()) {
      isValid = false;
      message = 'This field is required';
    } else if (pattern && !new RegExp(pattern).test(value)) {
      isValid = false;
      message = 'Please enter a valid value';
    } else if (type === 'email' && value && !ModernForms.isValidEmail(value)) {
      isValid = false;
      message = 'Please enter a valid email address';
    }

    ModernForms.showFieldMessage(field, message, isValid);
    return isValid;
  },

  // Email validation
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Show field validation message
  showFieldMessage: (field, message, isValid) => {
    let messageEl = field.parentElement.querySelector('.field-message');
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'field-message';
      field.parentElement.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.className = `field-message ${isValid ? 'valid' : 'error'}`;
    
    field.classList.toggle('valid', isValid);
    field.classList.toggle('error', !isValid);
  },

  // Auto-save form data
  setupAutoSave: () => {
    const forms = document.querySelectorAll('form[data-auto-save]');
    
    forms.forEach(form => {
      const formData = new FormData(form);
      const formId = form.dataset.autoSave;
      
      // Save on input
      form.addEventListener('input', ModernUtils.debounce(() => {
        ModernForms.saveFormData(formId, form);
      }, 1000));
      
      // Restore saved data
      ModernForms.restoreFormData(formId, form);
    });
  },

  // Save form data to localStorage
  saveFormData: (formId, form) => {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    localStorage.setItem(`form_${formId}`, JSON.stringify(data));
  },

  // Restore form data from localStorage
  restoreFormData: (formId, form) => {
    const saved = localStorage.getItem(`form_${formId}`);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        
        Object.keys(data).forEach(key => {
          const field = form.querySelector(`[name="${key}"]`);
          if (field) {
            field.value = data[key];
          }
        });
      } catch (error) {
        console.error('Error restoring form data:', error);
      }
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ModernGrid.init();
  ModernForms.init();
  
  // Add modern features to existing jQuery functionality
  if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(() => {
      // Enhance existing jQuery functionality with modern features
      ModernUtils.enhanceJQuery();
    });
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModernUtils, ModernGrid, ModernForms };
}

