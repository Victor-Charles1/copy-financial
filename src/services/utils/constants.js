// src/services/utils/constants.js

// API Configuration
export const API_TIMEOUT = 30000; // 30 seconds
export const RATE_LIMIT_DELAY = 1000; // 1 second between requests
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 2000; // 2 seconds

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes  
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  PERMANENT: Infinity         // Never expires
};

// API Endpoints
export const API_ENDPOINTS = {
  // Federal APIs
  CENSUS_GEOCODING: 'https://geocoding.geo.census.gov/geocoder',
  HUD_USER: 'https://www.huduser.gov/PORTAL',
  SBA_API: 'https://api.sba.gov',
  TREASURY_API: 'https://api.fiscaldata.treasury.gov',
  
  // Third-party APIs
  NOMINATIM: 'https://nominatim.openstreetmap.org',
  
  // Program-specific endpoints
  OPPORTUNITY_ZONES: 'https://www.cdfifund.gov/Documents/Designated%20QOZs.12.14.18.xlsx',
  NMTC_DIRECTORY: 'https://www.cdfifund.gov/programs-training/Programs/new-markets-tax-credit',
  HISTORIC_PLACES: 'https://www.nps.gov/subjects/nationalregister/database-research.htm',
  PACE_PROGRAMS: 'https://pacenation.org/pace-programs/',
  SBA_LENDERS: 'https://www.sba.gov/funding-programs/loans/lender-match'
};

// Program Configuration
export const PROGRAM_LIMITS = {
  OPPORTUNITY_ZONES: {
    MIN_INVESTMENT: 1000000,
    MAX_BENEFIT_YEARS: 10,
    DEFERRAL_DEADLINE: '2026-12-31'
  },
  HISTORIC_TAX_CREDITS: {
    CREDIT_RATE: 0.20,
    MIN_REHAB_COST: 5000,
    CLAIM_PERIOD_YEARS: 5
  },
  NMTC: {
    CREDIT_RATE: 0.39,
    CREDIT_PERIOD_YEARS: 7,
    MIN_INVESTMENT: 1000000
  },
  SBA_504: {
    MAX_SBA_AMOUNT: 5500000,
    MAX_PROJECT_COST: 13750000,
    OWNER_EQUITY_MIN: 0.10,
    OWNER_OCCUPANCY_MIN: 0.51
  },
  CPACE: {
    MAX_TERM_YEARS: 30,
    TYPICAL_RATE_RANGE: [0.04, 0.08],
    MAX_LTV_RATIO: 0.30
  }
};

// SBA Size Standards (simplified - actual standards vary by detailed NAICS codes)
export const SBA_SIZE_STANDARDS = {
  'retail': { employees: 500, receipts: 8000000 },
  'manufacturing': { employees: 1500, receipts: null },
  'construction': { employees: null, receipts: 42000000 },
  'professional_services': { employees: null, receipts: 8500000 },
  'real_estate': { employees: null, receipts: 8000000 },
  'hospitality': { employees: null, receipts: 8500000 },
  'healthcare': { employees: null, receipts: 8500000 },
  'technology': { employees: null, receipts: 8500000 },
  'other': { employees: 500, receipts: 8000000 }
};

// State Program Availability
export const STATE_PROGRAMS = {
  CPACE_STATES: [
    'California', 'New York', 'Texas', 'Florida', 'Colorado', 'Connecticut',
    'Maryland', 'Minnesota', 'Nevada', 'New Jersey', 'Ohio', 'Rhode Island',
    'Virginia', 'Wisconsin', 'Missouri', 'Michigan', 'Utah', 'Vermont'
  ],
  HISTORIC_CREDIT_STATES: [
    'California', 'New York', 'Texas', 'Georgia', 'Louisiana', 'Maryland',
    'Massachusetts', 'Missouri', 'New Mexico', 'North Carolina', 'Ohio',
    'South Carolina', 'Virginia', 'Wisconsin'
  ]
};

// Geographic Constants
export const US_BOUNDS = {
  MIN_LAT: 24.396308,
  MAX_LAT: 49.384358,
  MIN_LON: -125.000000,
  MAX_LON: -66.934570
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Please provide a valid US address',
  GEOCODING_FAILED: 'Unable to determine location coordinates',
  CENSUS_TRACT_FAILED: 'Unable to determine census tract',
  API_TIMEOUT: 'Request timed out - please try again',
  RATE_LIMITED: 'Too many requests - please wait and try again',
  NETWORK_ERROR: 'Network error - please check your connection',
  INVALID_PROJECT_COST: 'Project cost must be a positive number',
  INSUFFICIENT_EQUITY: 'Owner equity must be at least 10% of project cost'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETE: 'Property analysis completed successfully',
  REPORT_GENERATED: 'Financial report generated successfully',
  CACHE_CLEARED: 'Cache cleared successfully'
};

// Program Status Constants
export const PROGRAM_STATUS = {
  AVAILABLE: 'available',
  NOT_AVAILABLE: 'not_available',
  POTENTIALLY_AVAILABLE: 'potentially_available',
  ERROR: 'error',
  UNKNOWN: 'unknown'
};

// Report Configuration
export const REPORT_CONFIG = {
  FORMAT: {
    DATE: 'MM/DD/YYYY',
    CURRENCY: 'USD',
    PERCENTAGE: 2 // decimal places
  },
  SECTIONS: [
    'executive_summary',
    'location_analysis',
    'incentive_details',
    'financial_projections',
    'implementation_plan',
    'risk_assessment',
    'next_steps',
    'appendices'
  ]
};

// Validation Rules
export const VALIDATION_RULES = {
  ADDRESS: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 200,
    REQUIRED_PATTERNS: [/\d/, /[a-zA-Z]/] // Must have numbers and letters
  },
  PROJECT_COST: {
    MIN: 1000,
    MAX: 1000000000 // $1B max
  },
  BUSINESS_AGE: {
    MIN: 0,
    MAX: 200 // years
  },
  EMPLOYEE_COUNT: {
    MIN: 0,
    MAX: 100000
  },
  OWNER_OCCUPANCY: {
    MIN: 0,
    MAX: 100 // percentage
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CACHING: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_DETAILED_LOGGING: false,
  ENABLE_MOCK_DATA: false, // Use for testing
  ENABLE_ANALYTICS: true
};

// Mock Data Toggle (for development/testing)
export const USE_MOCK_DATA = process.env.NODE_ENV === 'development' && FEATURE_FLAGS.ENABLE_MOCK_DATA;