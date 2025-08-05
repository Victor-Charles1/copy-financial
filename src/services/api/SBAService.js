// SBA-504 Loan Eligibility Checker Service
// Comprehensive service to evaluate SBA-504 loan program eligibility

import { BaseAPIService, APIError, ValidationError } from './BaseAPIService.js';

class SBA504Service extends BaseAPIService {
  constructor() {
    super({
      timeout: 10000,
      retryAttempts: 2,
      cacheTimeout: 3600000 // 1 hour cache for SBA data
    });
    
    // SBA API endpoints (when available)
    this.sbaApiBase = 'https://api.sba.gov/';
    
    // NAICS code lookup service
    this.naicsApiBase = 'https://www.naics.com/api/';
    
    // Size standards and eligibility criteria
    this.sizeStandards = this.initializeSizeStandards();
    this.eligibilityCriteria = this.initializeEligibilityCriteria();
  }

  /**
   * Main eligibility checker for SBA-504 loans
   * @param {Object} businessData - Business information for eligibility check
   * @returns {Promise<Object>} Eligibility result with detailed analysis
   */
  async checkSBA504Eligibility(businessData) {
    try {
      console.log('🏦 Starting SBA-504 eligibility analysis...');
      
      // Validate input data
      const validatedData = this.validateBusinessData(businessData);
      
      // Run eligibility checks
      const eligibilityResults = await this.performEligibilityChecks(validatedData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(eligibilityResults);
      
      return {
        success: true,
        businessName: validatedData.businessName,
        eligibility: eligibilityResults,
        recommendations: recommendations,
        loanProgram: 'SBA-504',
        analysisDate: new Date().toISOString(),
        nextSteps: this.generateNextSteps(eligibilityResults)
      };

    } catch (error) {
      console.error('SBA-504 eligibility check failed:', error);
      
      return {
        success: false,
        error: {
          type: error.name,
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate business data input
   * @param {Object} data - Business data to validate
   * @returns {Object} Validated business data
   */
  validateBusinessData(data) {
    const required = ['businessName', 'industry', 'annualRevenue', 'employeeCount', 'netWorth', 'avgNetIncome'];
    
    for (const field of required) {
      if (!data[field] && data[field] !== 0) {
        throw new ValidationError(field, `${field} is required for SBA-504 eligibility check`);
      }
    }

    // Validate numeric fields
    const numericFields = ['annualRevenue', 'employeeCount', 'netWorth', 'avgNetIncome', 'loanAmount'];
    for (const field of numericFields) {
      if (data[field] !== undefined && (typeof data[field] !== 'number' || data[field] < 0)) {
        throw new ValidationError(field, `${field} must be a positive number`);
      }
    }

    // Validate NAICS code format if provided
    if (data.naicsCode && !/^\d{2,6}$/.test(data.naicsCode)) {
      throw new ValidationError('naicsCode', 'NAICS code must be 2-6 digits');
    }

    return {
      businessName: data.businessName?.trim(),
      industry: data.industry?.trim(),
      naicsCode: data.naicsCode?.toString(),
      annualRevenue: Number(data.annualRevenue),
      employeeCount: Number(data.employeeCount),
      netWorth: Number(data.netWorth),
      avgNetIncome: Number(data.avgNetIncome),
      loanAmount: Number(data.loanAmount || 0),
      businessAge: Number(data.businessAge || 0),
      useOfFunds: data.useOfFunds || 'real_estate',
      location: data.location || '',
      ownerOccupancy: data.ownerOccupancy !== false, // Default true
      jobsCreated: Number(data.jobsCreated || 0),
      jobsRetained: Number(data.jobsRetained || 0)
    };
  }

  /**
   * Perform comprehensive eligibility checks
   * @param {Object} data - Validated business data
   * @returns {Object} Detailed eligibility analysis
   */
  async performEligibilityChecks(data) {
    const checks = {
      basicRequirements: this.checkBasicRequirements(data),
      sizeStandards: await this.checkSizeStandards(data),
      financialRequirements: this.checkFinancialRequirements(data),
      useOfFunds: this.checkUseOfFunds(data),
      jobCreation: this.checkJobCreationRequirements(data),
      ownerOccupancy: this.checkOwnerOccupancyRequirements(data),
      overallEligibility: false
    };

    // Calculate overall eligibility
    const criticalChecks = ['basicRequirements', 'sizeStandards', 'financialRequirements', 'useOfFunds'];
    checks.overallEligibility = criticalChecks.every(check => checks[check].eligible);

    return checks;
  }

  /**
   * Check basic SBA-504 requirements
   * @param {Object} data - Business data
   * @returns {Object} Basic requirements check result
   */
  checkBasicRequirements(data) {
    const issues = [];
    let eligible = true;

    // For-profit business
    if (!data.businessName) {
      issues.push('Business name required');
      eligible = false;
    }

    // Operating in US (assumed if location provided, otherwise flag for manual verification)
    if (!data.location) {
      issues.push('Business location verification needed');
    }

    // Business age (typically need 2+ years for full consideration)
    if (data.businessAge < 2) {
      issues.push('Business should have 2+ years of operating history for optimal consideration');
    }

    return {
      eligible,
      category: 'Basic Requirements',
      issues,
      details: {
        businessName: data.businessName,
        location: data.location,
        businessAge: data.businessAge
      }
    };
  }

  /**
   * Check SBA size standards based on industry/NAICS code
   * @param {Object} data - Business data
   * @returns {Promise<Object>} Size standards check result
   */
  async checkSizeStandards(data) {
    let eligible = true;
    const issues = [];
    let sizeStandard = null;

    try {
      // Get size standard for industry
      sizeStandard = await this.getSizeStandardForIndustry(data.industry, data.naicsCode);
      
      if (sizeStandard) {
        // Check against size standards
        if (sizeStandard.type === 'employees') {
          if (data.employeeCount > sizeStandard.limit) {
            eligible = false;
            issues.push(`Exceeds employee limit: ${data.employeeCount} > ${sizeStandard.limit}`);
          }
        } else if (sizeStandard.type === 'revenue') {
          if (data.annualRevenue > sizeStandard.limit) {
            eligible = false;
            issues.push(`Exceeds revenue limit: $${data.annualRevenue.toLocaleString()} > $${sizeStandard.limit.toLocaleString()}`);
          }
        }
      } else {
        // Default small business standards
        if (data.employeeCount > 500) {
          eligible = false;
          issues.push('Exceeds general employee limit of 500');
        }
        if (data.annualRevenue > 7500000) {
          eligible = false;
          issues.push('Exceeds general revenue limit of $7.5M');
        }
      }

    } catch (error) {
      console.warn('Size standard lookup failed, using general standards');
      // Apply general standards as fallback
      if (data.employeeCount > 500 || data.annualRevenue > 7500000) {
        eligible = false;
        issues.push('May exceed SBA size standards - manual verification required');
      }
    }

    return {
      eligible,
      category: 'SBA Size Standards',
      issues,
      details: {
        employees: data.employeeCount,
        annualRevenue: data.annualRevenue,
        sizeStandard: sizeStandard,
        industry: data.industry
      }
    };
  }

  /**
   * Check financial requirements
   * @param {Object} data - Business data
   * @returns {Object} Financial requirements check result
   */
  checkFinancialRequirements(data) {
    const issues = [];
    let eligible = true;

    // Net worth limit: $15 million
    if (data.netWorth > 15000000) {
      eligible = false;
      issues.push(`Net worth exceeds $15M limit: $${data.netWorth.toLocaleString()}`);
    }

    // Average net income limit: $5 million for 2 preceding years
    if (data.avgNetIncome > 5000000) {
      eligible = false;
      issues.push(`Average net income exceeds $5M limit: $${data.avgNetIncome.toLocaleString()}`);
    }

    // Minimum down payment check (10% typical)
    if (data.loanAmount > 0) {
      const minDownPayment = data.loanAmount * 0.1;
      if (data.netWorth < minDownPayment) {
        issues.push(`May need additional down payment funds. Estimated need: $${minDownPayment.toLocaleString()}`);
      }
    }

    return {
      eligible,
      category: 'Financial Requirements',
      issues,
      details: {
        netWorth: data.netWorth,
        avgNetIncome: data.avgNetIncome,
        netWorthLimit: 15000000,
        avgIncomeLimit: 5000000
      }
    };
  }

  /**
   * Check approved uses of funds
   * @param {Object} data - Business data
   * @returns {Object} Use of funds check result
   */
  checkUseOfFunds(data) {
    const approvedUses = [
      'real_estate',
      'equipment',
      'construction',
      'renovation',
      'debt_refinancing'
    ];

    const issues = [];
    let eligible = true;

    if (!approvedUses.includes(data.useOfFunds)) {
      eligible = false;
      issues.push(`"${data.useOfFunds}" may not be an approved use of SBA-504 funds`);
    }

    // Minimum project amount typically $125,000
    if (data.loanAmount > 0 && data.loanAmount < 125000) {
      issues.push('Project amount may be below typical $125,000 minimum');
    }

    return {
      eligible,
      category: 'Use of Funds',
      issues,
      details: {
        useOfFunds: data.useOfFunds,
        loanAmount: data.loanAmount,
        approvedUses: approvedUses
      }
    };
  }

  /**
   * Check job creation/retention requirements
   * @param {Object} data - Business data
   * @returns {Object} Job creation check result
   */
  checkJobCreationRequirements(data) {
    const issues = [];
    let eligible = true;

    if (data.loanAmount > 0) {
      // Standard: 1 job per $75,000 (manufacturing: 1 per $120,000)
      const isManufacturing = data.industry?.toLowerCase().includes('manufacturing') || 
                             data.naicsCode?.startsWith('31') || 
                             data.naicsCode?.startsWith('32') || 
                             data.naicsCode?.startsWith('33');
      
      const jobRatio = isManufacturing ? 120000 : 75000;
      const requiredJobs = Math.ceil(data.loanAmount / jobRatio);
      const totalJobs = data.jobsCreated + data.jobsRetained;

      if (totalJobs < requiredJobs) {
        issues.push(`Need ${requiredJobs} jobs (created/retained), currently planning ${totalJobs}`);
        eligible = false;
      }
    }

    return {
      eligible: eligible || data.loanAmount === 0, // Pass if no loan amount specified
      category: 'Job Creation/Retention',
      issues,
      details: {
        jobsCreated: data.jobsCreated,
        jobsRetained: data.jobsRetained,
        totalJobs: data.jobsCreated + data.jobsRetained,
        loanAmount: data.loanAmount
      }
    };
  }

  /**
   * Check owner-occupancy requirements
   * @param {Object} data - Business data
   * @returns {Object} Owner occupancy check result
   */
  checkOwnerOccupancyRequirements(data) {
    const issues = [];
    let eligible = true;

    // For real estate purchases, typically need 51% owner occupancy
    if (data.useOfFunds === 'real_estate' && !data.ownerOccupancy) {
      issues.push('Real estate projects typically require owner-occupancy of at least 51%');
      eligible = false;
    }

    return {
      eligible,
      category: 'Owner Occupancy',
      issues,
      details: {
        ownerOccupancy: data.ownerOccupancy,
        useOfFunds: data.useOfFunds
      }
    };
  }

  /**
   * Get size standard for specific industry
   * @param {string} industry - Industry description
   * @param {string} naicsCode - NAICS code if available
   * @returns {Promise<Object>} Size standard information
   */
  async getSizeStandardForIndustry(industry, naicsCode) {
    // In a real implementation, this would call SBA's size standards API
    // For now, we'll use common size standards
    
    const commonStandards = {
      'manufacturing': { type: 'employees', limit: 500 },
      'retail': { type: 'revenue', limit: 8000000 },
      'construction': { type: 'revenue', limit: 42000000 },
      'professional_services': { type: 'revenue', limit: 8500000 },
      'real_estate': { type: 'revenue', limit: 8000000 },
      'restaurant': { type: 'revenue', limit: 8500000 },
      'wholesale': { type: 'employees', limit: 100 }
    };

    // Simple industry matching
    const industryKey = industry.toLowerCase().replace(/\s+/g, '_');
    for (const [key, standard] of Object.entries(commonStandards)) {
      if (industryKey.includes(key)) {
        return standard;
      }
    }

    // Default standard
    return { type: 'revenue', limit: 7500000 };
  }

  /**
   * Generate recommendations based on eligibility results
   * @param {Object} eligibilityResults - Results from eligibility checks
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(eligibilityResults) {
    const recommendations = [];

    if (eligibilityResults.overallEligibility) {
      recommendations.push({
        type: 'approval',
        priority: 'high',
        title: 'SBA-504 Loan Eligible',
        description: 'Your business appears to meet SBA-504 loan requirements.',
        action: 'Contact an SBA-approved Certified Development Company (CDC) to begin the application process.'
      });
    } else {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        title: 'Address Eligibility Issues',
        description: 'Some requirements are not currently met.',
        action: 'Review the specific issues identified and consider alternative financing or business structure changes.'
      });
    }

    // Add specific recommendations based on issues
    Object.values(eligibilityResults).forEach(check => {
      if (check.issues && check.issues.length > 0) {
        recommendations.push({
          type: 'action_required',
          priority: 'medium',
          title: `${check.category} Issues`,
          description: check.issues.join('; '),
          action: 'Address these specific requirements before applying.'
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate next steps based on eligibility
   * @param {Object} eligibilityResults - Eligibility check results
   * @returns {Array} Array of next steps
   */
  generateNextSteps(eligibilityResults) {
    const steps = [];

    if (eligibilityResults.overallEligibility) {
      steps.push(
        '1. Find a local Certified Development Company (CDC)',
        '2. Gather required financial documents (3 years tax returns, financial statements)',
        '3. Prepare business plan and project details',
        '4. Submit pre-application to CDC',
        '5. Work with CDC to complete full application'
      );
    } else {
      steps.push(
        '1. Address eligibility issues identified above',
        '2. Consider alternative SBA loan programs (7(a), Express, etc.)',
        '3. Consult with SBA resource partner (SCORE, SBDC)',
        '4. Review business structure and qualifications',
        '5. Reassess eligibility after making improvements'
      );
    }

    return steps;
  }

  /**
   * Initialize SBA size standards (simplified version)
   * In production, this would be loaded from SBA API
   */
  initializeSizeStandards() {
    return {
      // This would contain comprehensive NAICS-based size standards
      defaultEmployees: 500,
      defaultRevenue: 7500000
    };
  }

  /**
   * Initialize eligibility criteria
   */
  initializeEligibilityCriteria() {
    return {
      maxNetWorth: 15000000,
      maxAvgNetIncome: 5000000,
      minProjectAmount: 125000,
      jobCreationRatio: 75000,
      manufacturingJobRatio: 120000,
      ownerOccupancyRequired: 0.51
    };
  }

  /**
   * Find local CDCs (Certified Development Companies)
   * @param {string} location - Business location
   * @returns {Promise<Array>} List of nearby CDCs
   */
  async findLocalCDCs(location) {
    // This would integrate with SBA's CDC locator API
    // For now, return placeholder data
    return [
      {
        name: 'Local Development Company',
        phone: '(555) 123-4567',
        website: 'www.localcdc.com',
        specialties: ['Real Estate', 'Manufacturing']
      }
    ];
  }
}

export default SBA504Service;

// Usage example:
/*
const sba504Service = new SBA504Service();

const businessData = {
  businessName: 'ABC Manufacturing Inc.',
  industry: 'manufacturing',
  naicsCode: '333120',
  annualRevenue: 3000000,
  employeeCount: 25,
  netWorth: 2000000,
  avgNetIncome: 500000,
  loanAmount: 2000000,
  businessAge: 5,
  useOfFunds: 'real_estate',
  location: 'Detroit, MI',
  ownerOccupancy: true,
  jobsCreated: 15,
  jobsRetained: 10
};

sba504Service.checkSBA504Eligibility(businessData)
  .then(result => {
    if (result.success) {
      console.log('Eligibility:', result.eligibility.overallEligibility);
      console.log('Recommendations:', result.recommendations);
    } else {
      console.error('Check failed:', result.error);
    }
  });
*/