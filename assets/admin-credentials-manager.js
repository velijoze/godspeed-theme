/**
 * Admin Credentials Manager
 * Secure storage and retrieval of API credentials using Shopify metafields
 */

class CredentialsManager {
  constructor() {
    this.storageKey = 'godspeed_api_credentials';
    this.encryptionKey = this.generateKey();
  }

  generateKey() {
    // Generate a unique key based on shop domain
    return btoa(window.Shopify?.shop || 'godspeed').substring(0, 16);
  }

  // Simple XOR encryption for client-side storage
  encrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  decrypt(encoded, key) {
    try {
      const text = atob(encoded);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (e) {
      console.error('Decryption failed:', e);
      return null;
    }
  }

  // Save credentials to Shopify metafields via AJAX
  async saveCredentials(vendor, credentials) {
    const encrypted = this.encrypt(JSON.stringify(credentials), this.encryptionKey);
    
    try {
      const response = await fetch('/apps/metafields/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': window.Shopify?.accessToken || ''
        },
        body: JSON.stringify({
          namespace: 'godspeed_admin',
          key: `${vendor}_credentials`,
          value: encrypted,
          type: 'single_line_text_field'
        })
      });

      // Fallback to localStorage if metafields unavailable
      if (!response.ok) {
        localStorage.setItem(`${this.storageKey}_${vendor}`, encrypted);
        return { success: true, storage: 'local' };
      }

      return { success: true, storage: 'metafield' };
    } catch (error) {
      // Fallback to localStorage
      localStorage.setItem(`${this.storageKey}_${vendor}`, encrypted);
      return { success: true, storage: 'local' };
    }
  }

  // Retrieve credentials from storage
  async getCredentials(vendor) {
    try {
      // Try metafields first
      const response = await fetch(`/apps/metafields/get?namespace=godspeed_admin&key=${vendor}_credentials`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          return JSON.parse(this.decrypt(data.value, this.encryptionKey));
        }
      }
    } catch (error) {
      console.log('Metafield retrieval failed, trying localStorage');
    }

    // Fallback to localStorage
    const localData = localStorage.getItem(`${this.storageKey}_${vendor}`);
    if (localData) {
      return JSON.parse(this.decrypt(localData, this.encryptionKey));
    }

    return null;
  }

  // Validate credentials format
  validateCredentials(vendor, credentials) {
    const requiredFields = {
      cube: credentials.mode === 'direct' 
        ? ['clientId', 'apiKey', 'acrValues'] // Client secret and token are optional for direct mode
        : ['username', 'password'], // VeloConnect mode
      veloconnect: ['username', 'password', 'apiUrl'],
      abus: ['username', 'password', 'apiKey'],
      maxxis: ['clientId', 'apiSecret'],
      orbea: ['username', 'password', 'dealerId'],
      sks: ['apiKey', 'secretKey'],
      magura: ['username', 'password'],
      komenda: ['apiKey', 'accountId'],
      amsler: ['username', 'password', 'clientId'],
      'chris-sports': ['apiKey', 'storeId'],
      'tour-de-suisse': ['username', 'password', 'apiKey']
    };

    const required = requiredFields[vendor.toLowerCase()] || ['username', 'password'];
    return required.every(field => credentials[field] && credentials[field].trim() !== '');
  }

  // Clear all stored credentials
  async clearAllCredentials() {
    const vendors = ['cube', 'veloconnect', 'abus', 'maxxis', 'orbea', 'sks', 'magura', 'komenda', 'amsler', 'chris-sports', 'tour-de-suisse'];
    
    for (const vendor of vendors) {
      localStorage.removeItem(`${this.storageKey}_${vendor}`);
      try {
        await fetch('/apps/metafields/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            namespace: 'godspeed_admin',
            key: `${vendor}_credentials`
          })
        });
      } catch (error) {
        console.log(`Failed to clear metafield for ${vendor}`);
      }
    }
  }
}

// Initialize global credentials manager
window.GodspeedCredentials = new CredentialsManager();