/**
 * Cube API Client
 * Supports both direct Cube Connect API and VeloConnect integration
 */

class CubeAPIClient {
  constructor() {
    this.baseUrl = 'https://connect.cube.eu/api/v1';
    this.veloconnectUrl = 'https://api.veloconnect.de/v1';
    this.credentials = null;
    this.mode = 'direct'; // 'direct' or 'veloconnect'
    this.token = null;
    this.tokenExpiry = null;
  }

  // Initialize with stored credentials
  async initialize() {
    this.credentials = await window.GodspeedCredentials?.getCredentials('cube');
    if (this.credentials) {
      this.mode = this.credentials.mode || 'direct';
      if (this.mode === 'direct') {
        await this.authenticate();
      }
    }
    return this.credentials !== null;
  }

  // Authenticate with Cube Connect API
  async authenticate() {
    if (this.mode !== 'direct' || !this.credentials) return false;

    // If we have a 24-hour token, use it directly
    if (this.credentials.accessToken) {
      this.token = this.credentials.accessToken;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      return true;
    }

    // Otherwise, try OAuth2 client credentials flow
    try {
      const response = await fetch(`${this.baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': this.credentials.apiKey
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          scope: 'profile connectapi',
          acr_values: this.credentials.acrValues || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return true;
      }
    } catch (error) {
      console.error('Cube authentication error:', error);
    }
    return false;
  }

  // Check if token is valid
  isTokenValid() {
    return this.token && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  // Get products from Cube
  async getProducts(options = {}) {
    if (this.mode === 'direct') {
      return await this.getProductsDirect(options);
    } else {
      return await this.getProductsVeloConnect(options);
    }
  }

  // Direct API product fetch
  async getProductsDirect(options) {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    try {
      const params = new URLSearchParams({
        page: options.page || 1,
        limit: options.limit || 50,
        category: options.category || '',
        in_stock: options.inStock || true
      });

      const response = await fetch(`${this.baseUrl}/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-API-Key': this.credentials.apiKey
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Cube direct API error:', error);
    }
    return null;
  }

  // VeloConnect product fetch
  async getProductsVeloConnect(options) {
    try {
      const response = await fetch(`${this.veloconnectUrl}/suppliers/cube/products`, {
        headers: {
          'Authorization': `Basic ${btoa(this.credentials.username + ':' + this.credentials.password)}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('VeloConnect API error:', error);
    }
    return null;
  }

  // Get product details
  async getProductDetails(productId) {
    if (this.mode === 'direct') {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      try {
        const response = await fetch(`${this.baseUrl}/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.credentials.apiKey
          }
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Product details error:', error);
      }
    } else {
      // VeloConnect product details
      try {
        const response = await fetch(`${this.veloconnectUrl}/suppliers/cube/products/${productId}`, {
          headers: {
            'Authorization': `Basic ${btoa(this.credentials.username + ':' + this.credentials.password)}`
          }
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('VeloConnect product details error:', error);
      }
    }
    return null;
  }

  // Get inventory/stock information
  async getInventory(productIds = []) {
    if (this.mode === 'direct') {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      try {
        const response = await fetch(`${this.baseUrl}/inventory`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.credentials.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ product_ids: productIds })
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Inventory error:', error);
      }
    } else {
      // VeloConnect inventory
      try {
        const response = await fetch(`${this.veloconnectUrl}/suppliers/cube/inventory`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(this.credentials.username + ':' + this.credentials.password)}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ products: productIds })
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('VeloConnect inventory error:', error);
      }
    }
    return null;
  }

  // Get pricing information
  async getPricing(productIds = []) {
    if (this.mode === 'direct') {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      try {
        const response = await fetch(`${this.baseUrl}/pricing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.credentials.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            product_ids: productIds,
            currency: 'CHF',
            customer_group: 'dealer'
          })
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Pricing error:', error);
      }
    }
    return null;
  }

  // Place an order
  async placeOrder(orderData) {
    if (this.mode === 'direct') {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      try {
        const response = await fetch(`${this.baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.credentials.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Order placement error:', error);
      }
    }
    return null;
  }

  // Get order status
  async getOrderStatus(orderId) {
    if (this.mode === 'direct') {
      if (!this.isTokenValid()) {
        await this.authenticate();
      }

      try {
        const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-API-Key': this.credentials.apiKey
          }
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Order status error:', error);
      }
    }
    return null;
  }

  // Test connection
  async testConnection() {
    if (this.mode === 'direct') {
      return await this.authenticate();
    } else {
      // Test VeloConnect connection
      try {
        const response = await fetch(`${this.veloconnectUrl}/suppliers/cube/status`, {
          headers: {
            'Authorization': `Basic ${btoa(this.credentials.username + ':' + this.credentials.password)}`
          }
        });
        return response.ok;
      } catch (error) {
        console.error('VeloConnect test error:', error);
        return false;
      }
    }
  }

  // Sync products to Shopify
  async syncToShopify() {
    const products = await this.getProducts({ limit: 100 });
    
    if (!products || !products.items) {
      return { success: false, message: 'Failed to fetch products' };
    }

    let synced = 0;
    let failed = 0;

    for (const product of products.items) {
      try {
        // Transform Cube product to Shopify format
        const shopifyProduct = {
          title: product.name,
          body_html: product.description,
          vendor: 'Cube',
          product_type: product.category,
          tags: product.tags?.join(',') || '',
          variants: [{
            price: product.price,
            sku: product.sku,
            inventory_quantity: product.stock,
            inventory_management: 'shopify',
            barcode: product.ean
          }],
          images: product.images?.map(img => ({ src: img.url })) || []
        };

        // Create or update product in Shopify
        const response = await fetch('/admin/api/2024-01/products.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': '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'
          },
          body: JSON.stringify({ product: shopifyProduct })
        });

        if (response.ok) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Product sync error:', error);
        failed++;
      }
    }

    return {
      success: true,
      message: `Synced ${synced} products, ${failed} failed`,
      synced,
      failed
    };
  }
}

// Initialize global Cube API client
window.CubeAPI = new CubeAPIClient();