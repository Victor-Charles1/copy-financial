// src/services/utils/cache.js

class CacheManager {
    constructor() {
      this.cache = new Map();
      this.defaultTTL = 5 * 60 * 1000; // 5 minutes
      this.maxSize = 1000; // Maximum number of cached items
    }
  
    set(key, value, ttl = this.defaultTTL) {
      // Implement LRU eviction if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
  
      const expiresAt = Date.now() + ttl;
      this.cache.set(key, {
        value,
        expiresAt,
        createdAt: Date.now()
      });
    }
  
    get(key) {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }
  
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        return null;
      }
  
      // Move to end for LRU
      this.cache.delete(key);
      this.cache.set(key, item);
  
      return item.value;
    }
  
    has(key) {
      return this.get(key) !== null;
    }
  
    delete(key) {
      return this.cache.delete(key);
    }
  
    clear() {
      this.cache.clear();
    }
  
    size() {
      return this.cache.size;
    }
  
    getStats() {
      const now = Date.now();
      let expired = 0;
      let active = 0;
  
      for (const [, item] of this.cache) {
        if (now > item.expiresAt) {
          expired++;
        } else {
          active++;
        }
      }
  
      return {
        totalItems: this.cache.size,
        activeItems: active,
        expiredItems: expired,
        hitRate: this.hitRate || 0,
        maxSize: this.maxSize
      };
    }
  
    // Clean up expired items
    cleanup() {
      const now = Date.now();
      const keysToDelete = [];
  
      for (const [key, item] of this.cache) {
        if (now > item.expiresAt) {
          keysToDelete.push(key);
        }
      }
  
      keysToDelete.forEach(key => this.cache.delete(key));
      
      return keysToDelete.length;
    }
  
    // Start automatic cleanup
    startCleanup(intervalMs = 60000) { // Default: every minute
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
  
      this.cleanupInterval = setInterval(() => {
        const cleaned = this.cleanup();
        if (cleaned > 0) {
          console.log(`Cache cleanup: removed ${cleaned} expired items`);
        }
      }, intervalMs);
    }
  
    stopCleanup() {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    }
  }
  
  // Create singleton instance
  export const cache = new CacheManager();
  
  // Start automatic cleanup
  cache.startCleanup();
  
  // Cache TTL constants
  export const CACHE_TTL = {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
    PERMANENT: Infinity         // Never expires (until manually cleared)
  };
  
  // Utility functions for cache key generation
  export function generateCacheKey(service, method, params) {
    const paramString = typeof params === 'object' ? 
      JSON.stringify(params) : String(params || '');
    
    return `${service}_${method}_${btoa(paramString).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  
  export function generateLocationCacheKey(lat, lon, radius = 0) {
    // Round coordinates to reduce cache fragmentation
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    
    return `location_${roundedLat}_${roundedLon}_${radius}`;
  }
  
  export function generateAddressCacheKey(address) {
    return `address_${btoa(address.toLowerCase().replace(/\s+/g, ' ')).replace(/[^a-zA-Z0-9]/g, '')}`;
  }