// src/services/api/BaseAPIService.js
import { NetworkError, APIError, ValidationError } from '../errors/index.js';
import { validateAddress } from '../utils/validation.js';
import { cache } from '../utils/cache.js';
import { API_TIMEOUT, RATE_LIMIT_DELAY } from '../utils/constants.js';

class BaseAPIService {
  constructor(baseURL, apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.rateLimit = new Map();
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, options);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && !options.skipCache) {
      return cached;
    }

    // Rate limiting
    await this.handleRateLimit();

    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      },
      signal: AbortSignal.timeout(options.timeout || API_TIMEOUT),
      ...options
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new APIError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          url
        );
      }

      const data = await response.json();
      
      // Cache successful responses
      if (options.cacheTTL !== 0) {
        cache.set(cacheKey, data, options.cacheTTL);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout', url);
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new NetworkError(`Network error: ${error.message}`, url);
    }
  }

  getAuthHeaders() {
    if (this.apiKey) {
      return { 'Authorization': `Bearer ${this.apiKey}` };
    }
    return {};
  }

  getCacheKey(url, options) {
    return `${url}_${JSON.stringify(options.body || {})}`;
  }

  async handleRateLimit() {
    const now = Date.now();
    const lastRequest = this.rateLimit.get(this.baseURL);
    
    if (lastRequest && now - lastRequest < RATE_LIMIT_DELAY) {
      const delay = RATE_LIMIT_DELAY - (now - lastRequest);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.rateLimit.set(this.baseURL, now);
  }

  validateAddress(address) {
    const validation = validateAddress(address);
    if (!validation.isValid) {
      throw new ValidationError(`Invalid address: ${validation.errors.join(', ')}`);
    }
    return validation.normalized;
  }

  async geocodeAddress(address) {
    // Using a free geocoding service as fallback
    const query = encodeURIComponent(address);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=us&limit=1`,
        {
          headers: {
            'User-Agent': 'CRE-Financial-Tool/1.0'
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return null;
    }
  }

  async getCensusTract(lat, lon) {
    try {
      const response = await fetch(
        `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=14&format=json`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const geographies = data?.result?.geographies;
      
      if (geographies && geographies['Census Tracts'] && geographies['Census Tracts'].length > 0) {
        const tract = geographies['Census Tracts'][0];
        return {
          tract: tract.TRACT,
          county: tract.COUNTY,
          state: tract.STATE,
          geoid: tract.GEOID
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Census tract lookup failed:', error);
      return null;
    }
  }
}

export default BaseAPIService;