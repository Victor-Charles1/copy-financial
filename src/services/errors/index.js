// src/services/errors/index.js

export class APIError extends Error {
  constructor(message, status = 500, url = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.url = url;
    this.timestamp = new Date().toISOString();
  }
}

export class NetworkError extends Error {
  constructor(message, url = null) {
    super(message);
    this.name = 'NetworkError';
    this.url = url;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.timestamp = new Date().toISOString();
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.timestamp = new Date().toISOString();
  }
}