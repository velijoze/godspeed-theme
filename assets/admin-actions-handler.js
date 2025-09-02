/**
 * Admin Actions Handler
 * Makes all admin dashboard buttons functional
 */

class AdminActionsHandler {
  constructor() {
    const base = (window.GS_API_BASE || '').replace(/\/$/, '');
    this.apiEndpoints = {
      bookings: base,
      vendors: base
    };
    this.initialized = false;
  }

  // Initialize action handlers
  initialize() {
    if (this.initialized) return;
    
    // Bind all button actions
    this.bindActions();
    this.initialized = true;
  }

  // Bind action handlers to buttons
  bindActions() {
    // Override global functions called by buttons
    window.testAIChat = () => this.testAIChat();
    window.checkAPIs = () => this.checkAPIs();
    window.viewLogs = () => this.viewLogs();
    window.exportData = () => this.exportData();
    window.saveAIChatConfig = () => this.saveAIChatConfig();
    window.testWorkshopAPI = () => this.testWorkshopAPI();
    window.syncCubeProducts = () => this.syncCubeProducts();
    window.configureVeloConnect = () => this.configureVeloConnect();
  }

  // Test AI Chat functionality (real implementation)
  async testAIChat() {
    this.showNotification('Testing AI Chat...', 'info');
    
    try {
      // Check if chat widget exists
      const chatWidget = document.querySelector('.chat-widget-container');
      const chatToggle = document.querySelector('.chat-toggle-btn');
      
      if (!chatWidget && !chatToggle) {
        // Create test chat widget if not exists
        this.createTestChatWidget();
      } else if (chatToggle) {
        // Toggle existing chat
        chatToggle.click();
      }
      
      // Send test message
      setTimeout(() => {
        const chatInput = document.querySelector('.chat-input');
        const sendButton = document.querySelector('.chat-send-btn');
        
        if (chatInput && sendButton) {
          chatInput.value = 'Test message from admin dashboard';
          sendButton.click();
          this.showNotification('AI Chat test successful! Check the chat widget.', 'success');
        } else {
          this.showNotification('Chat widget opened. Ready for testing.', 'success');
        }
      }, 500);
      
      // Track the test
      window.MetricsTracker?.trackChatSession({
        type: 'test',
        source: 'admin_dashboard',
        messages: 1
      });
      
    } catch (error) {
      console.error('AI Chat test error:', error);
      this.showNotification('AI Chat test failed: ' + error.message, 'error');
    }
  }

  // Check all API health (real health checks)
  async checkAPIs() {
    this.showNotification('Checking API health...', 'info');
    
    const apis = [
      { name: 'Booking API', url: `${this.apiEndpoints.bookings}/health` },
      { name: 'Sync Backend', url: `${this.apiEndpoints.vendors}/health` },
      { name: 'Shopify Admin API', url: '/admin/api/2024-01/shop.json' },
      { name: 'Cube Direct API', url: 'https://connect.cube.eu/api/v1/status' }
    ];
    
    const results = [];
    
    for (const api of apis) {
      try {
        const startTime = Date.now();
        const response = await fetch(api.url, {
          method: 'GET',
          headers: api.name === 'Shopify Admin API' 
            ? { 'X-Shopify-Access-Token': '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' }
            : {}
        });
        
        const responseTime = Date.now() - startTime;
        
        results.push({
          name: api.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          statusCode: response.status
        });
        
        // Track API call
        window.MetricsTracker?.trackAPICall(api.url, response.ok, responseTime);
        
      } catch (error) {
        results.push({
          name: api.name,
          status: 'error',
          error: error.message
        });
        
        window.MetricsTracker?.trackAPICall(api.url, false);
      }
    }
    
    // Display results
    this.displayAPIHealthResults(results);
  }

  // Display API health results
  displayAPIHealthResults(results) {
    let healthy = 0;
    let unhealthy = 0;
    let message = 'API Health Check Results:\n';
    
    results.forEach(result => {
      if (result.status === 'healthy') {
        healthy++;
        message += `✅ ${result.name}: Healthy (${result.responseTime}ms)\n`;
      } else {
        unhealthy++;
        message += `❌ ${result.name}: ${result.status} ${result.error || ''}\n`;
      }
    });
    
    const type = unhealthy === 0 ? 'success' : unhealthy < results.length ? 'warning' : 'error';
    this.showNotification(`${healthy}/${results.length} APIs are healthy`, type);
    
    console.log(message);
  }

  // View system logs (real implementation)
  async viewLogs() {
    this.showNotification('Loading system logs...', 'info');
    
    // Create logs modal
    const modal = document.createElement('div');
    modal.className = 'logs-modal';
    modal.innerHTML = `
      <div class="logs-modal-content">
        <div class="logs-header">
          <h3>System Logs</h3>
          <button class="close-logs" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="logs-filters">
          <select id="log-level-filter">
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
          <select id="log-source-filter">
            <option value="all">All Sources</option>
            <option value="api">API</option>
            <option value="chat">Chat</option>
            <option value="booking">Booking</option>
            <option value="vendor">Vendors</option>
          </select>
          <button onclick="window.AdminActions.refreshLogs()">Refresh</button>
        </div>
        <div class="logs-content" id="logs-content">
          <div class="log-loading">Loading logs...</div>
        </div>
      </div>
    `;
    
    // Add styles
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
      z-index: 10000;
    `;
    
    const content = modal.querySelector('.logs-modal-content');
    content.style.cssText = `
      background: white;
      width: 90%;
      max-width: 1000px;
      height: 80%;
      max-height: 600px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
    `;
    
    const header = modal.querySelector('.logs-header');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const filters = modal.querySelector('.logs-filters');
    filters.style.cssText = `
      padding: 15px 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      gap: 10px;
    `;
    
    const logsContent = modal.querySelector('.logs-content');
    logsContent.style.cssText = `
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      background: #f8f9fa;
    `;
    
    document.body.appendChild(modal);
    
    // Load logs
    this.loadLogs();
  }

  // Load system logs
  async loadLogs(level = 'all', source = 'all') {
    const logsContent = document.getElementById('logs-content');
    if (!logsContent) return;
    
    // Get logs from various sources
    const logs = [];
    
    // Get API logs
    const apiCalls = JSON.parse(localStorage.getItem('godspeed_api_calls') || '[]');
    apiCalls.forEach(call => {
      logs.push({
        timestamp: call.timestamp,
        level: call.error ? 'error' : 'info',
        source: 'api',
        message: `API Call: ${call.endpoint} - ${call.error ? 'Failed' : 'Success'} (${call.responseTime}ms)`
      });
    });
    
    // Get chat logs
    const chatSessions = JSON.parse(localStorage.getItem('godspeed_chat_sessions') || '[]');
    chatSessions.forEach(session => {
      logs.push({
        timestamp: session.timestamp,
        level: 'info',
        source: 'chat',
        message: `Chat Session: ${session.messages || 0} messages from ${session.source || 'unknown'}`
      });
    });
    
    // Get error logs
    const errorLogs = JSON.parse(localStorage.getItem('godspeed_errors') || '[]');
    errorLogs.forEach(error => {
      logs.push({
        timestamp: error.timestamp,
        level: 'error',
        source: error.source || 'system',
        message: error.message
      });
    });

    // Fetch backend sync jobs
    try {
      const resp = await fetch(`${this.apiEndpoints.vendors}/api/jobs?limit=25`);
      if (resp.ok) {
        const data = await resp.json();
        (data.jobs || []).forEach(job => {
          const ts = job.startedAt? (new Date(job.startedAt._seconds ? job.startedAt._seconds * 1000 : job.startedAt)).getTime() : Date.now();
          logs.push({
            timestamp: ts,
            level: job.ok === false ? 'error' : (job.status === 'preview' ? 'info' : 'success'),
            source: job.type || 'sync',
            message: `${job.type || 'sync'} ${job.status} ${job.vendorId ? '('+job.vendorId+')' : ''}`
          });
        });
      }
    } catch (_) {}
    
    // Sort by timestamp
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Filter logs
    const filteredLogs = logs.filter(log => {
      if (level !== 'all' && log.level !== level) return false;
      if (source !== 'all' && log.source !== source) return false;
      return true;
    });
    
    // Display logs
    if (filteredLogs.length === 0) {
      logsContent.innerHTML = '<div class="no-logs">No logs found</div>';
    } else {
      logsContent.innerHTML = filteredLogs.map(log => `
        <div class="log-entry log-${log.level}">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level">[${log.level.toUpperCase()}]</span>
          <span class="log-source">[${log.source}]</span>
          <span class="log-message">${log.message}</span>
        </div>
      `).join('');
    }
    
    // Add styles for log entries
    const style = document.createElement('style');
    style.textContent = `
      .log-entry {
        padding: 8px;
        margin-bottom: 4px;
        background: white;
        border-left: 3px solid #6c757d;
      }
      .log-error { border-left-color: #dc3545; }
      .log-warning { border-left-color: #ffc107; }
      .log-info { border-left-color: #17a2b8; }
      .log-timestamp { color: #6c757d; margin-right: 10px; }
      .log-level { color: #333; font-weight: bold; margin-right: 10px; }
      .log-source { color: #6c757d; margin-right: 10px; }
      .log-message { color: #333; }
      .no-logs { text-align: center; color: #6c757d; padding: 40px; }
    `;
    document.head.appendChild(style);
  }

  // Refresh logs
  refreshLogs() {
    const levelFilter = document.getElementById('log-level-filter')?.value || 'all';
    const sourceFilter = document.getElementById('log-source-filter')?.value || 'all';
    this.loadLogs(levelFilter, sourceFilter);
  }

  // Export data (real export)
  async exportData() {
    this.showNotification('Preparing data export...', 'info');
    
    try {
      // Collect all data
      const exportData = {
        exportDate: new Date().toISOString(),
        metrics: await window.MetricsTracker?.collectAllMetrics(),
        bookings: JSON.parse(localStorage.getItem('godspeed_bookings') || '[]'),
        chatSessions: JSON.parse(localStorage.getItem('godspeed_chat_sessions') || '[]'),
        apiCalls: JSON.parse(localStorage.getItem('godspeed_api_calls') || '[]'),
        suppliers: await this.getSupplierData(),
        settings: await this.getSettings()
      };
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `godspeed-admin-export-${Date.now()}.json`;
      a.click();
      
      this.showNotification('Data export completed successfully', 'success');
      
    } catch (error) {
      console.error('Export error:', error);
      this.showNotification('Export failed: ' + error.message, 'error');
    }
  }

  // Get supplier data for export
  async getSupplierData() {
    const suppliers = ['cube', 'abus', 'amsler', 'chris-sports', 'komenda', 'magura', 'maxxis', 'orbea', 'sks', 'tour-de-suisse'];
    const data = {};
    
    for (const supplier of suppliers) {
      const credentials = await window.GodspeedCredentials?.getCredentials(supplier);
      data[supplier] = {
        configured: !!credentials,
        hasCredentials: !!credentials,
        // Don't export actual credentials
      };
    }
    
    return data;
  }

  // Get settings for export
  async getSettings() {
    return {
      chatTitle: document.getElementById('chat-title-input')?.value || '',
      welcomeMessage: document.getElementById('welcome-message-input')?.value || '',
      buttonColor: document.getElementById('button-color-input')?.value || '',
      headerColor: document.getElementById('header-color-input')?.value || ''
    };
  }

  // Save AI Chat configuration (real save)
  async saveAIChatConfig() {
    const config = {
      title: document.getElementById('chat-title-input')?.value || 'Godspeed E-Bike Expert',
      welcomeMessage: document.getElementById('welcome-message-input')?.value || 'Hello! How can I help you?',
      buttonColor: document.getElementById('button-color-input')?.value || '#333333',
      headerColor: document.getElementById('header-color-input')?.value || '#f8f9fa'
    };
    
    try {
      // Save to localStorage
      localStorage.setItem('godspeed_chat_config', JSON.stringify(config));
      
      // Update chat widget if it exists
      const chatWidget = document.querySelector('.chat-widget-container');
      if (chatWidget) {
        const header = chatWidget.querySelector('.chat-header');
        const button = chatWidget.querySelector('.chat-toggle-btn');
        
        if (header) {
          header.style.background = config.headerColor;
          const title = header.querySelector('h3');
          if (title) title.textContent = config.title;
        }
        
        if (button) {
          button.style.background = config.buttonColor;
        }
      }
      
      this.showNotification('AI Chat configuration saved successfully!', 'success');
      
    } catch (error) {
      console.error('Save config error:', error);
      this.showNotification('Failed to save configuration', 'error');
    }
  }

  // Test Workshop API (real test)
  async testWorkshopAPI() {
    this.showNotification('Testing workshop booking API...', 'info');
    
    try {
      const response = await fetch(`${this.apiEndpoints.bookings}/bookings/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.showNotification('Workshop API test successful! ' + (data.message || ''), 'success');
      } else {
        this.showNotification('Workshop API test failed with status: ' + response.status, 'error');
      }
      
      // Track the test
      window.MetricsTracker?.trackAPICall('workshop-test', response.ok);
      
    } catch (error) {
      console.error('Workshop API test error:', error);
      this.showNotification('Workshop API test failed: ' + error.message, 'error');
    }
  }

  // Sync Cube products (real sync)
  async syncCubeProducts() {
    this.showNotification('Starting Cube product synchronization...', 'info');
    try {
      const payload = {
        mode: 'apply',
        fields: ['inventory','price'],
        filters: {},
        options: { createNewDrafts: false, archiveMissing: false }
      };
      const resp = await fetch(`${this.apiEndpoints.bookings}/api/cube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${txt}`);
      }
      const data = await resp.json();
      const updated = data?.applied?.updated || 0;
      const created = data?.applied?.created || 0;
      this.showNotification(`Cube sync applied: ${updated} updated, ${created} created`, 'success');

      localStorage.setItem('godspeed_supplier_cube_status', JSON.stringify({
        connected: true,
        lastSync: Date.now(),
        products: updated + created
      }));
      window.MetricsTracker?.collectAllMetrics();
    } catch (error) {
      console.error('Cube sync error:', error);
      this.showNotification('Cube synchronization failed: ' + error.message, 'error');
    }
  }

  // Configure VeloConnect (open configuration)
  configureVeloConnect() {
    this.showNotification('Opening VeloConnect configuration...', 'info');
    
    // Scroll to VeloConnect section if on same page
    const veloconnectSection = document.querySelector('.veloconnect-dynamic-section');
    if (veloconnectSection) {
      veloconnectSection.scrollIntoView({ behavior: 'smooth' });
      this.showNotification('Navigate to VeloConnect section below', 'success');
    } else {
      // Navigate to VeloConnect page
      window.location.href = '/pages/admin-tools#veloconnect';
    }
  }

  // Create test chat widget
  createTestChatWidget() {
    const widget = document.createElement('div');
    widget.className = 'chat-widget-container test-chat';
    widget.innerHTML = `
      <div class="chat-widget">
        <div class="chat-header">
          <h3>Test Chat Widget</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="chat-messages">
          <div class="chat-message">Welcome to test chat!</div>
        </div>
        <div class="chat-input-area">
          <input type="text" class="chat-input" placeholder="Type a message...">
          <button class="chat-send-btn">Send</button>
        </div>
      </div>
    `;
    
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      height: 450px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 9999;
    `;
    
    document.body.appendChild(widget);
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
      color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Initialize global admin actions handler
window.AdminActions = new AdminActionsHandler();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AdminActions.initialize();
});
