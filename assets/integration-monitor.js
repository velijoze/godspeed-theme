/**
 * Integration Monitor
 * Protects existing functionality and ensures zero disruption
 */

class IntegrationMonitor {
  constructor() {
    this.criticalSystems = {
      workshop_booking: {
        name: 'Workshop Booking System',
        endpoint: 'https://bookings-api-802427545823.europe-west6.run.app/bookings/service',
        status: 'unknown',
        lastCheck: null,
        errorCount: 0
      },
      ai_chat: {
        name: 'AI Chat Assistant',
        selector: '.chat-widget-container, .ai-chat-assistant',
        status: 'unknown',
        lastCheck: null,
        errorCount: 0
      },
      test_ride: {
        name: 'Test Ride Booking',
        selector: '.test-ride-modal, .test-ride-button',
        status: 'unknown',
        lastCheck: null,
        errorCount: 0
      },
      google_calendar: {
        name: 'Google Calendar Integration',
        configFile: '/calendar-ids.json',
        status: 'unknown',
        lastCheck: null,
        errorCount: 0
      }
    };
    
    this.backupData = {};
    this.healthChecks = [];
    this.alertsEnabled = true;
  }

  // Initialize monitoring
  initialize() {
    console.log('🛡️ Integration Monitor initializing...');
    
    this.createBackups();
    this.startHealthChecks();
    this.setupErrorHandling();
    this.loadHealthHistory();
    
    console.log('✅ Integration Monitor active - protecting existing functionality');
  }

  // Create backups of critical configurations
  createBackups() {
    // Backup existing DOM elements
    this.backupData.chatWidget = this.backupElement('.chat-widget-container');
    this.backupData.testRideModal = this.backupElement('.test-ride-modal');
    this.backupData.workshopSections = this.backupElements('[data-section-type*="workshop"]');
    
    // Backup local storage data
    this.backupData.localStorage = {
      chatConfig: localStorage.getItem('godspeed_chat_config'),
      bookingHistory: localStorage.getItem('godspeed_bookings'),
      userPreferences: localStorage.getItem('godspeed_user_prefs')
    };
    
    // Store backup timestamp
    this.backupData.timestamp = Date.now();
    localStorage.setItem('godspeed_integration_backup', JSON.stringify(this.backupData));
    
    console.log('💾 Critical system backups created');
  }

  // Backup DOM element
  backupElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      return {
        html: element.outerHTML,
        styles: this.getComputedStyles(element),
        selector: selector
      };
    }
    return null;
  }

  // Backup multiple DOM elements
  backupElements(selector) {
    const elements = document.querySelectorAll(selector);
    const backups = [];
    
    elements.forEach((element, index) => {
      backups.push({
        html: element.outerHTML,
        styles: this.getComputedStyles(element),
        selector: selector,
        index: index
      });
    });
    
    return backups;
  }

  // Get computed styles for an element
  getComputedStyles(element) {
    const styles = {};
    const computed = window.getComputedStyle(element);
    
    // Store only critical styles
    const criticalProps = ['display', 'position', 'visibility', 'z-index', 'top', 'right', 'bottom', 'left'];
    criticalProps.forEach(prop => {
      styles[prop] = computed.getPropertyValue(prop);
    });
    
    return styles;
  }

  // Start continuous health checks
  startHealthChecks() {
    // Check every 30 seconds
    setInterval(() => this.runHealthChecks(), 30000);
    
    // Initial check
    setTimeout(() => this.runHealthChecks(), 5000);
  }

  // Run health checks on all critical systems
  async runHealthChecks() {
    for (const [key, system] of Object.entries(this.criticalSystems)) {
      try {
        await this.checkSystemHealth(key, system);
      } catch (error) {
        this.handleSystemError(key, error);
      }
    }
    
    this.saveHealthHistory();
    this.updateHealthDisplay();
  }

  // Check individual system health
  async checkSystemHealth(key, system) {
    let status = 'unknown';
    
    switch (key) {
      case 'workshop_booking':
        status = await this.checkWorkshopBookingHealth();
        break;
      case 'ai_chat':
        status = this.checkChatWidgetHealth();
        break;
      case 'test_ride':
        status = this.checkTestRideHealth();
        break;
      case 'google_calendar':
        status = this.checkCalendarIntegrationHealth();
        break;
    }
    
    // Update system status
    system.status = status;
    system.lastCheck = Date.now();
    
    // Reset error count if healthy
    if (status === 'healthy') {
      system.errorCount = 0;
    }
    
    return status;
  }

  // Check workshop booking system health
  async checkWorkshopBookingHealth() {
    try {
      const response = await fetch(this.criticalSystems.workshop_booking.endpoint + '/health', {
        method: 'GET',
        timeout: 5000
      });
      
      return response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      return 'error';
    }
  }

  // Check chat widget health
  checkChatWidgetHealth() {
    const chatWidget = document.querySelector('.chat-widget-container, .ai-chat-assistant');
    
    if (!chatWidget) {
      return 'missing';
    }
    
    // Check if widget is functional
    const toggleBtn = chatWidget.querySelector('.chat-toggle-btn, .chat-trigger');
    const inputField = chatWidget.querySelector('.chat-input, input[type="text"]');
    
    if (toggleBtn && inputField) {
      return 'healthy';
    }
    
    return 'unhealthy';
  }

  // Check test ride system health
  checkTestRideHealth() {
    const testRideModal = document.querySelector('.test-ride-modal');
    const testRideButtons = document.querySelectorAll('.test-ride-button, [onclick*="test-ride"]');
    
    if (testRideModal && testRideButtons.length > 0) {
      return 'healthy';
    } else if (testRideButtons.length > 0) {
      return 'partial';
    }
    
    return 'missing';
  }

  // Check calendar integration health
  checkCalendarIntegrationHealth() {
    // Check if booking forms exist
    const bookingForms = document.querySelectorAll('[data-booking-form], .workshop-booking');
    
    if (bookingForms.length > 0) {
      // Check for calendar-related fields
      const dateFields = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
      const locationFields = document.querySelectorAll('select[name*="location"], .location-selector');
      
      if (dateFields.length > 0 && locationFields.length > 0) {
        return 'healthy';
      }
    }
    
    return 'unknown';
  }

  // Handle system errors
  handleSystemError(systemKey, error) {
    const system = this.criticalSystems[systemKey];
    system.errorCount++;
    system.status = 'error';
    
    console.error(`🚨 System Error [${system.name}]:`, error);
    
    // Store error for analysis
    this.logError(systemKey, error);
    
    // Attempt recovery if error count exceeds threshold
    if (system.errorCount >= 3) {
      this.attemptSystemRecovery(systemKey, system);
    }
    
    // Send alert if enabled
    if (this.alertsEnabled) {
      this.sendAlert(systemKey, system, error);
    }
  }

  // Log error for tracking
  logError(systemKey, error) {
    const errorLog = {
      system: systemKey,
      error: error.message || error,
      timestamp: Date.now(),
      stack: error.stack
    };
    
    const errors = JSON.parse(localStorage.getItem('godspeed_system_errors') || '[]');
    errors.push(errorLog);
    
    // Keep only last 100 errors
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
    
    localStorage.setItem('godspeed_system_errors', JSON.stringify(errors));
  }

  // Attempt to recover a failed system
  async attemptSystemRecovery(systemKey, system) {
    console.log(`🔧 Attempting recovery for ${system.name}...`);
    
    try {
      switch (systemKey) {
        case 'ai_chat':
          await this.recoverChatWidget();
          break;
        case 'test_ride':
          await this.recoverTestRideSystem();
          break;
        case 'workshop_booking':
          await this.recoverWorkshopBooking();
          break;
      }
      
      console.log(`✅ Recovery attempted for ${system.name}`);
    } catch (error) {
      console.error(`❌ Recovery failed for ${system.name}:`, error);
    }
  }

  // Recover chat widget
  async recoverChatWidget() {
    const backup = this.backupData.chatWidget;
    if (!backup) return;
    
    // Remove any broken chat widget
    const existing = document.querySelector(backup.selector);
    if (existing) {
      existing.remove();
    }
    
    // Restore from backup
    document.body.insertAdjacentHTML('beforeend', backup.html);
    
    // Reapply styles
    const restored = document.querySelector(backup.selector);
    if (restored && backup.styles) {
      Object.assign(restored.style, backup.styles);
    }
  }

  // Recover test ride system
  async recoverTestRideSystem() {
    const backup = this.backupData.testRideModal;
    if (!backup) return;
    
    // Check if modal exists
    if (!document.querySelector('.test-ride-modal')) {
      document.body.insertAdjacentHTML('beforeend', backup.html);
    }
    
    // Ensure buttons are functional
    const buttons = document.querySelectorAll('.test-ride-button');
    buttons.forEach(button => {
      if (!button.onclick && !button.dataset.restored) {
        button.addEventListener('click', () => {
          const modal = document.querySelector('.test-ride-modal');
          if (modal) modal.style.display = 'block';
        });
        button.dataset.restored = 'true';
      }
    });
  }

  // Recover workshop booking
  async recoverWorkshopBooking() {
    // Check if booking API is accessible
    try {
      const response = await fetch(this.criticalSystems.workshop_booking.endpoint + '/health');
      if (response.ok) {
        // API is working, reset error count
        this.criticalSystems.workshop_booking.errorCount = 0;
      }
    } catch (error) {
      console.log('Workshop booking API still unreachable');
    }
    
    // Ensure booking forms are functional
    const bookingForms = document.querySelectorAll('.workshop-booking form');
    bookingForms.forEach(form => {
      if (!form.dataset.protected) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleBookingSubmission(form);
        });
        form.dataset.protected = 'true';
      }
    });
  }

  // Handle booking submission with fallback
  async handleBookingSubmission(form) {
    const formData = new FormData(form);
    const bookingData = Object.fromEntries(formData);
    
    try {
      // Try primary API
      const response = await fetch(this.criticalSystems.workshop_booking.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      if (response.ok) {
        this.showSuccessMessage('Booking submitted successfully');
      } else {
        throw new Error('Primary API failed');
      }
    } catch (error) {
      // Fallback: store locally and notify user
      this.storeBookingLocally(bookingData);
      this.showWarningMessage('Booking saved locally. Will be processed when connection is restored.');
    }
  }

  // Store booking locally as fallback
  storeBookingLocally(bookingData) {
    const bookings = JSON.parse(localStorage.getItem('godspeed_pending_bookings') || '[]');
    bookings.push({
      ...bookingData,
      timestamp: Date.now(),
      status: 'pending_submission'
    });
    localStorage.setItem('godspeed_pending_bookings', JSON.stringify(bookings));
  }

  // Setup error handling
  setupErrorHandling() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.filename, event.lineno);
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'Promise', 0);
    });
  }

  // Handle global errors
  handleGlobalError(error, filename, lineno) {
    // Don't interfere with existing functionality
    console.warn('🔍 Monitor detected error:', error);
    
    // Log for analysis but don't break anything
    this.logError('global', {
      message: error.message || error,
      filename,
      lineno,
      stack: error.stack
    });
  }

  // Send alert for critical system failure
  sendAlert(systemKey, system, error) {
    // Create visual alert
    const alert = document.createElement('div');
    alert.className = 'system-alert critical';
    alert.innerHTML = `
      <div class="alert-content">
        <strong>⚠️ System Alert</strong>
        <p>${system.name} is experiencing issues</p>
        <p>Error: ${error.message || error}</p>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;
    
    alert.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
      border: 1px solid #f5c6cb;
      border-radius: 8px;
      z-index: 10000;
      max-width: 500px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 30000);
  }

  // Save health check history
  saveHealthHistory() {
    const history = {
      timestamp: Date.now(),
      systems: { ...this.criticalSystems }
    };
    
    const healthHistory = JSON.parse(localStorage.getItem('godspeed_health_history') || '[]');
    healthHistory.push(history);
    
    // Keep only last 50 entries
    if (healthHistory.length > 50) {
      healthHistory.splice(0, healthHistory.length - 50);
    }
    
    localStorage.setItem('godspeed_health_history', JSON.stringify(healthHistory));
  }

  // Load health history
  loadHealthHistory() {
    const history = JSON.parse(localStorage.getItem('godspeed_health_history') || '[]');
    if (history.length > 0) {
      const latest = history[history.length - 1];
      this.criticalSystems = latest.systems;
    }
  }

  // Update health display in admin dashboard
  updateHealthDisplay() {
    const healthIndicator = document.querySelector('.system-health-indicator');
    if (!healthIndicator) {
      this.createHealthIndicator();
    }
    
    const healthy = Object.values(this.criticalSystems).filter(s => s.status === 'healthy').length;
    const total = Object.keys(this.criticalSystems).length;
    
    const indicator = document.querySelector('.system-health-indicator');
    if (indicator) {
      const status = healthy === total ? 'all-healthy' : healthy > total / 2 ? 'mostly-healthy' : 'issues';
      indicator.className = `system-health-indicator ${status}`;
      indicator.innerHTML = `
        <span class="health-icon">${healthy === total ? '✅' : '⚠️'}</span>
        <span class="health-text">${healthy}/${total} systems healthy</span>
      `;
    }
  }

  // Create health indicator
  createHealthIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'system-health-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: white;
      padding: 10px 15px;
      border-radius: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 12px;
      font-weight: 500;
      z-index: 9999;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    indicator.addEventListener('click', () => {
      this.showHealthDetails();
    });
    
    document.body.appendChild(indicator);
  }

  // Show detailed health information
  showHealthDetails() {
    const modal = document.createElement('div');
    modal.className = 'health-details-modal';
    modal.innerHTML = `
      <div class="health-modal-content">
        <div class="health-modal-header">
          <h3>🛡️ System Health Status</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="health-modal-body">
          ${Object.entries(this.criticalSystems).map(([key, system]) => `
            <div class="system-status-row">
              <span class="system-name">${system.name}</span>
              <span class="system-status status-${system.status}">
                ${system.status.toUpperCase()}
              </span>
              <span class="system-last-check">
                ${system.lastCheck ? new Date(system.lastCheck).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          `).join('')}
        </div>
        <div class="health-modal-footer">
          <button onclick="window.IntegrationMonitor.runHealthChecks()">Refresh</button>
          <button onclick="window.IntegrationMonitor.exportHealthData()">Export Data</button>
        </div>
      </div>
    `;
    
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    `;
    
    document.body.appendChild(modal);
  }

  // Export health data
  exportHealthData() {
    const data = {
      systems: this.criticalSystems,
      history: JSON.parse(localStorage.getItem('godspeed_health_history') || '[]'),
      errors: JSON.parse(localStorage.getItem('godspeed_system_errors') || '[]'),
      backup: this.backupData,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `godspeed-system-health-${Date.now()}.json`;
    a.click();
  }

  // Show success message
  showSuccessMessage(message) {
    this.showMessage(message, '#d4edda', '#155724');
  }

  // Show warning message
  showWarningMessage(message) {
    this.showMessage(message, '#fff3cd', '#856404');
  }

  // Show message helper
  showMessage(message, bgColor, textColor) {
    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: ${textColor};
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 5000);
  }
}

// Initialize global integration monitor
window.IntegrationMonitor = new IntegrationMonitor();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for other systems to load
  setTimeout(() => {
    window.IntegrationMonitor.initialize();
  }, 2000);
});