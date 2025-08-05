// Error Classes
class APIError extends Error {
    constructor(message, status, endpoint, originalError = null) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.endpoint = endpoint;
      this.originalError = originalError;
      this.timestamp = new Date().toISOString();
    }
  }
  
  class RateLimitError extends APIError {
    constructor(endpoint, retryAfter = null) {
      super('Rate limit exceeded', 429, endpoint);
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  }
  
  class ValidationError extends Error {
    constructor(field, message) {
      super(`Validation error for ${field}: ${message}`);
      this.name = 'ValidationError';
      this.field = field;
    }
  }