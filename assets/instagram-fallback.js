// Instagram Feed Fallback for Godspeed Theme
// Handles broken Instagram API by showing fallback content

(function() {
  'use strict';
  
  // Override Instafeed to prevent errors
  if (typeof Instafeed !== 'undefined') {
    const originalInstafeed = Instafeed;
    
    Instafeed = function(options) {
      // Create a mock feed that shows fallback content
      const mockFeed = {
        run: function() {
          console.log('Instagram feed disabled - API no longer available');
          this._showFallback(options.target || 'instafeed');
        },
        _showFallback: function(targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            target.innerHTML = `
              <div class="instagram-fallback" style="text-align: center; padding: 40px 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 48px; color: #e4405f; margin-bottom: 20px;">
                  <i class="fab fa-instagram"></i>
                </div>
                <h3 style="color: #333; margin-bottom: 15px;">Follow Us on Instagram</h3>
                <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                  Instagram integration is temporarily unavailable due to API changes.<br>
                  Please visit our Instagram profile for the latest updates and products.
                </p>
                <a href="https://www.instagram.com/" target="_blank" style="
                  display: inline-block; 
                  background: #e4405f; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 25px; 
                  font-weight: 500;
                  transition: background 0.3s ease;
                " onmouseover="this.style.background='#c13584'" onmouseout="this.style.background='#e4405f'">
                  Visit Instagram
                </a>
              </div>
            `;
          }
        }
      };
      
      return mockFeed;
    };
    
    // Copy prototype methods to maintain compatibility
    Instafeed.prototype = originalInstafeed.prototype;
  }
  
  // Also handle any existing Instafeed instances
  document.addEventListener('DOMContentLoaded', function() {
    const instagramSections = document.querySelectorAll('[id*="instagram"], [class*="instagram"]');
    instagramSections.forEach(function(section) {
      if (section.innerHTML.includes('Instafeed') || section.innerHTML.includes('instagram')) {
        // Check if it's actually broken
        setTimeout(function() {
          if (section.innerHTML.includes('error') || section.innerHTML.includes('undefined')) {
            section.innerHTML = `
              <div class="instagram-fallback" style="text-align: center; padding: 40px 20px; background: #f8f9fa; border-radius: 8px;">
                <div style="font-size: 48px; color: #e4405f; margin-bottom: 20px;">
                  <i class="fab fa-instagram"></i>
                </div>
                <h3 style="color: #333; margin-bottom: 15px;">Follow Us on Instagram</h3>
                <p style="color: #666; margin-bottom: 20px; line-height: 1.6;">
                  Instagram integration is temporarily unavailable due to API changes.<br>
                  Please visit our Instagram profile for the latest updates and products.
                </p>
                <a href="https://www.instagram.com/" target="_blank" style="
                  display: inline-block; 
                  background: #e4405f; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 25px; 
                  font-weight: 500;
                  transition: background 0.3s ease;
                " onmouseover="this.style.background='#c13584'" onmouseout="this.style.background='#e4405f'">
                  Visit Instagram
                </a>
              </div>
            `;
          }
        }, 2000);
      }
    });
  });
  
})();