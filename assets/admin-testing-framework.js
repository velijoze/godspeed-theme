/**
 * Admin Testing Framework
 * Provides safe testing environment with feature flags
 */

class AdminTestingFramework {
  constructor() {
    this.featureFlags = {
      enableRealAPI: false,
      enableCubeSync: false,
      enableVeloConnect: false,
      enableMetricsTracking: true,
      enableExports: true,
      debugMode: true
    };
    this.testResults = [];
    this.mockData = this.generateMockData();
  }

  // Initialize testing framework
  initialize() {
    this.loadFeatureFlags();
    this.setupTestEnvironment();
    this.runInitialTests();
  }

  // Load feature flags from storage
  loadFeatureFlags() {
    const stored = localStorage.getItem('godspeed_feature_flags');
    if (stored) {
      this.featureFlags = { ...this.featureFlags, ...JSON.parse(stored) };
    }
    
    // Display current flags
    console.log('Feature Flags:', this.featureFlags);
  }

  // Save feature flags
  saveFeatureFlags() {
    localStorage.setItem('godspeed_feature_flags', JSON.stringify(this.featureFlags));
  }

  // Toggle feature flag
  toggleFeature(feature, enabled = null) {
    if (enabled !== null) {
      this.featureFlags[feature] = enabled;
    } else {
      this.featureFlags[feature] = !this.featureFlags[feature];
    }
    this.saveFeatureFlags();
    
    console.log(`Feature ${feature} ${this.featureFlags[feature] ? 'enabled' : 'disabled'}`);
    return this.featureFlags[feature];
  }

  // Setup test environment
  setupTestEnvironment() {
    // Add test controls to page
    this.createTestControls();
    
    // Override API calls in test mode
    this.setupAPIInterception();
    
    // Setup error handling
    this.setupErrorTracking();
  }

  // Create test controls panel
  createTestControls() {
    const controls = document.createElement('div');
    controls.id = 'admin-test-controls';
    controls.innerHTML = `
      <div class="test-controls-header">
        <h3>🧪 Admin Test Controls</h3>
        <button onclick="document.getElementById('admin-test-controls').style.display='none'">×</button>
      </div>
      <div class="test-controls-body">
        <div class="feature-flags">
          <h4>Feature Flags</h4>
          ${Object.entries(this.featureFlags).map(([key, value]) => `
            <label class="flag-control">
              <input type="checkbox" ${value ? 'checked' : ''} 
                     onchange="window.AdminTesting.toggleFeature('${key}', this.checked)">
              <span>${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
            </label>
          `).join('')}
        </div>
        
        <div class="test-actions">
          <h4>Test Actions</h4>
          <button onclick="window.AdminTesting.runAllTests()">Run All Tests</button>
          <button onclick="window.AdminTesting.resetTestData()">Reset Test Data</button>
          <button onclick="window.AdminTesting.generateMockData()">Generate Mock Data</button>
          <button onclick="window.AdminTesting.exportTestResults()">Export Test Results</button>
        </div>
        
        <div class="test-results">
          <h4>Test Results <span id="test-count">(0)</span></h4>
          <div id="test-results-list"></div>
        </div>
      </div>
    `;
    
    // Add styles
    controls.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      width: 300px;
      max-height: 80vh;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      z-index: 10001;
      font-family: monospace;
      font-size: 12px;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    // Add internal styles
    const style = document.createElement('style');
    style.textContent = `
      .test-controls-header {
        background: #333;
        color: white;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .test-controls-header h3 {
        margin: 0;
        font-size: 14px;
      }
      .test-controls-body {
        padding: 15px;
      }
      .test-controls-body h4 {
        margin: 10px 0 5px 0;
        color: #333;
      }
      .flag-control {
        display: block;
        margin: 5px 0;
        cursor: pointer;
      }
      .flag-control input {
        margin-right: 8px;
      }
      .test-actions button {
        display: block;
        width: 100%;
        margin: 5px 0;
        padding: 5px 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      .test-actions button:hover {
        background: #0056b3;
      }
      #test-results-list {
        max-height: 200px;
        overflow-y: auto;
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        margin-top: 5px;
      }
      .test-result {
        padding: 5px;
        margin: 3px 0;
        border-left: 3px solid #6c757d;
        background: white;
        font-size: 11px;
      }
      .test-result.pass { border-left-color: #28a745; }
      .test-result.fail { border-left-color: #dc3545; }
      .test-result.warning { border-left-color: #ffc107; }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(controls);
    
    // Only show in development or if debug mode enabled
    if (!this.featureFlags.debugMode) {
      controls.style.display = 'none';
    }
  }

  // Setup API call interception for testing
  setupAPIInterception() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0];
      const options = args[1] || {};
      
      // Log API calls in debug mode
      if (this.featureFlags.debugMode) {
        console.log(`🔗 API Call: ${url}`, options);
      }
      
      // Intercept specific APIs when not in real mode
      if (!this.featureFlags.enableRealAPI) {
        if (url.includes('bookings-api') || url.includes('vendor-connectors')) {
          return this.mockAPIResponse(url, options);
        }
      }
      
      // Track API calls
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);
        const responseTime = Date.now() - startTime;
        
        window.MetricsTracker?.trackAPICall(url, response.ok, responseTime);
        
        return response;
      } catch (error) {
        window.MetricsTracker?.trackAPICall(url, false);
        throw error;
      }
    };
  }

  // Mock API response for testing
  async mockAPIResponse(url, options) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100)); // Simulate delay
    
    let mockResponse = { success: true, message: 'Mock response' };
    
    if (url.includes('health')) {
      mockResponse = { status: 'healthy', timestamp: Date.now() };
    } else if (url.includes('metrics')) {
      mockResponse = this.mockData.metrics;
    } else if (url.includes('test')) {
      mockResponse = { success: true, message: 'Test successful (mock)' };
    } else if (url.includes('bookings')) {
      mockResponse = this.mockData.bookings;
    }
    
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Setup error tracking
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', event.error?.message || event.message, event.filename, event.lineno);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
    });
  }

  // Log error for testing
  logError(type, message, filename = '', lineno = 0) {
    const error = {
      type,
      message,
      filename,
      lineno,
      timestamp: Date.now(),
      source: 'admin-testing'
    };
    
    // Store error
    const errors = JSON.parse(localStorage.getItem('godspeed_errors') || '[]');
    errors.push(error);
    localStorage.setItem('godspeed_errors', JSON.stringify(errors));
    
    // Add to test results
    this.addTestResult(`Error: ${type} - ${message}`, 'fail');
    
    if (this.featureFlags.debugMode) {
      console.error('🚨 Error tracked:', error);
    }
  }

  // Generate mock data for testing
  generateMockData() {
    return {
      metrics: {
        chat: {
          total: 156,
          today: 12,
          thisWeek: 89,
          growth: 15.3,
          averageMessages: 7
        },
        bookings: {
          total: 234,
          today: 8,
          thisWeek: 45,
          growth: 8.7,
          byLocation: {
            lugano: 15,
            bellinzona: 12,
            locarno: 8,
            zurich: 10
          }
        },
        api: {
          total: 1247,
          today: 156,
          thisHour: 23,
          errors: 12,
          successRate: 99.2
        }
      },
      bookings: {
        recent: [
          { id: 1, service: 'Basic Service', location: 'Lugano', date: '2025-01-15' },
          { id: 2, service: 'E-bike Diagnostic', location: 'Zurich', date: '2025-01-16' }
        ]
      },
      suppliers: {
        cube: { connected: true, products: 1247 },
        abus: { connected: false, products: 0 },
        orbea: { connected: true, products: 567 }
      }
    };
  }

  // Run all tests
  async runAllTests() {
    this.testResults = [];
    this.updateTestResults();
    
    console.log('🧪 Running all admin tests...');
    
    // Test 1: Credentials Manager
    await this.testCredentialsManager();
    
    // Test 2: Metrics Tracker
    await this.testMetricsTracker();
    
    // Test 3: Admin Actions
    await this.testAdminActions();
    
    // Test 4: API Health
    await this.testAPIHealth();
    
    // Test 5: Feature Flags
    await this.testFeatureFlags();
    
    // Test 6: Error Handling
    await this.testErrorHandling();
    
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    
    console.log(`✅ Tests completed: ${passed} passed, ${failed} failed`);
    this.addTestResult(`Test Suite Complete: ${passed}/${this.testResults.length} passed`, passed === this.testResults.length ? 'pass' : 'fail');
  }

  // Test credentials manager
  async testCredentialsManager() {
    try {
      if (!window.GodspeedCredentials) {
        this.addTestResult('Credentials Manager not loaded', 'fail');
        return;
      }
      
      // Test save/retrieve
      const testCreds = { username: 'test', password: 'test123' };
      await window.GodspeedCredentials.saveCredentials('test-vendor', testCreds);
      const retrieved = await window.GodspeedCredentials.getCredentials('test-vendor');
      
      if (retrieved && retrieved.username === 'test') {
        this.addTestResult('Credentials Manager: Save/Retrieve', 'pass');
      } else {
        this.addTestResult('Credentials Manager: Save/Retrieve failed', 'fail');
      }
      
      // Test validation
      const valid = window.GodspeedCredentials.validateCredentials('cube', {
        clientId: 'test', clientSecret: 'test', apiKey: 'test', username: 'test', password: 'test'
      });
      
      this.addTestResult(`Credentials Manager: Validation - ${valid ? 'pass' : 'fail'}`, valid ? 'pass' : 'fail');
      
    } catch (error) {
      this.addTestResult('Credentials Manager: Exception - ' + error.message, 'fail');
    }
  }

  // Test metrics tracker
  async testMetricsTracker() {
    try {
      if (!window.MetricsTracker) {
        this.addTestResult('Metrics Tracker not loaded', 'fail');
        return;
      }
      
      // Test tracking
      window.MetricsTracker.trackAPICall('test-endpoint', true, 150);
      window.MetricsTracker.trackChatSession({ messages: 5, source: 'test' });
      
      this.addTestResult('Metrics Tracker: Tracking methods', 'pass');
      
      // Test metrics collection
      const metrics = await window.MetricsTracker.collectAllMetrics();
      
      if (metrics && metrics.timestamp) {
        this.addTestResult('Metrics Tracker: Collection', 'pass');
      } else {
        this.addTestResult('Metrics Tracker: Collection failed', 'fail');
      }
      
    } catch (error) {
      this.addTestResult('Metrics Tracker: Exception - ' + error.message, 'fail');
    }
  }

  // Test admin actions
  async testAdminActions() {
    try {
      if (!window.AdminActions) {
        this.addTestResult('Admin Actions not loaded', 'fail');
        return;
      }
      
      // Test initialization
      window.AdminActions.initialize();
      this.addTestResult('Admin Actions: Initialization', 'pass');
      
      // Test functions exist
      const functions = ['testAIChat', 'checkAPIs', 'viewLogs', 'exportData'];
      const missing = functions.filter(fn => typeof window[fn] !== 'function');
      
      if (missing.length === 0) {
        this.addTestResult('Admin Actions: All functions available', 'pass');
      } else {
        this.addTestResult(`Admin Actions: Missing functions - ${missing.join(', ')}`, 'fail');
      }
      
    } catch (error) {
      this.addTestResult('Admin Actions: Exception - ' + error.message, 'fail');
    }
  }

  // Test API health
  async testAPIHealth() {
    try {
      // Test mock API calls
      const response = await fetch('test-health-endpoint');
      
      if (response.ok) {
        this.addTestResult('API Health: Mock response', 'pass');
      } else {
        this.addTestResult('API Health: Mock response failed', 'fail');
      }
      
    } catch (error) {
      this.addTestResult('API Health: Exception - ' + error.message, 'fail');
    }
  }

  // Test feature flags
  async testFeatureFlags() {
    try {
      const original = this.featureFlags.debugMode;
      
      // Test toggle
      this.toggleFeature('debugMode', !original);
      if (this.featureFlags.debugMode !== original) {
        this.addTestResult('Feature Flags: Toggle', 'pass');
      } else {
        this.addTestResult('Feature Flags: Toggle failed', 'fail');
      }
      
      // Restore
      this.toggleFeature('debugMode', original);
      
    } catch (error) {
      this.addTestResult('Feature Flags: Exception - ' + error.message, 'fail');
    }
  }

  // Test error handling
  async testErrorHandling() {
    try {
      // Trigger a test error
      this.logError('Test Error', 'This is a test error for validation');
      
      const errors = JSON.parse(localStorage.getItem('godspeed_errors') || '[]');
      const testError = errors.find(e => e.message === 'This is a test error for validation');
      
      if (testError) {
        this.addTestResult('Error Handling: Error logging', 'pass');
      } else {
        this.addTestResult('Error Handling: Error logging failed', 'fail');
      }
      
    } catch (error) {
      this.addTestResult('Error Handling: Exception - ' + error.message, 'fail');
    }
  }

  // Add test result
  addTestResult(message, status = 'pass') {
    const result = {
      message,
      status,
      timestamp: Date.now()
    };
    
    this.testResults.push(result);
    this.updateTestResults();
    
    if (this.featureFlags.debugMode) {
      const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${message}`);
    }
  }

  // Update test results display
  updateTestResults() {
    const countElement = document.getElementById('test-count');
    const listElement = document.getElementById('test-results-list');
    
    if (countElement) {
      countElement.textContent = `(${this.testResults.length})`;
    }
    
    if (listElement) {
      listElement.innerHTML = this.testResults.map(result => `
        <div class="test-result ${result.status}">
          <strong>${result.status.toUpperCase()}:</strong> ${result.message}
          <br><small>${new Date(result.timestamp).toLocaleTimeString()}</small>
        </div>
      `).reverse().join('');
    }
  }

  // Reset test data
  resetTestData() {
    localStorage.removeItem('godspeed_api_calls');
    localStorage.removeItem('godspeed_chat_sessions');
    localStorage.removeItem('godspeed_bookings');
    localStorage.removeItem('godspeed_errors');
    
    this.testResults = [];
    this.updateTestResults();
    
    console.log('🗑️ Test data reset');
    this.addTestResult('Test data reset completed', 'pass');
  }

  // Export test results
  exportTestResults() {
    const data = {
      testResults: this.testResults,
      featureFlags: this.featureFlags,
      exportDate: new Date().toISOString(),
      environment: 'admin-testing'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `godspeed-test-results-${Date.now()}.json`;
    a.click();
    
    this.addTestResult('Test results exported', 'pass');
  }

  // Run initial tests when framework loads
  runInitialTests() {
    setTimeout(() => {
      this.addTestResult('Testing Framework initialized', 'pass');
      
      // Check critical components
      if (window.GodspeedCredentials) {
        this.addTestResult('Credentials Manager loaded', 'pass');
      } else {
        this.addTestResult('Credentials Manager missing', 'warning');
      }
      
      if (window.MetricsTracker) {
        this.addTestResult('Metrics Tracker loaded', 'pass');
      } else {
        this.addTestResult('Metrics Tracker missing', 'warning');
      }
      
      if (window.AdminActions) {
        this.addTestResult('Admin Actions loaded', 'pass');
      } else {
        this.addTestResult('Admin Actions missing', 'warning');
      }
      
    }, 1000);
  }
}

// Initialize global testing framework
window.AdminTesting = new AdminTestingFramework();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AdminTesting.initialize();
});