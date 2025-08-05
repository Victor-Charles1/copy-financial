// src/services/utils/validation.js

export function validateAddress(address) {
    const errors = [];
    const warnings = [];
  
    if (typeof address !== 'string') {
      errors.push('Address must be a string');
      return { isValid: false, errors, warnings, normalized: null };
    }
  
    const trimmed = address.trim();
    
    if (trimmed.length === 0) {
      errors.push('Address cannot be empty');
      return { isValid: false, errors, warnings, normalized: null };
    }
  
    if (trimmed.length < 10) {
      warnings.push('Address appears to be incomplete');
    }
  
    // Basic US address pattern check
    const hasNumber = /\d/.test(trimmed);
    const hasStreetName = /[a-zA-Z]/.test(trimmed);
    
    if (!hasNumber) {
      warnings.push('Address should include a street number');
    }
    
    if (!hasStreetName) {
      errors.push('Address should include a street name');
    }
  
    // Normalize the address
    const normalized = normalizeAddress(trimmed);
  
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalized
    };
  }
  
  function normalizeAddress(address) {
    return address
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|place|pl)\b/gi, (match) => {
        const abbrevMap = {
          'street': 'St',
          'avenue': 'Ave',
          'boulevard': 'Blvd',
          'road': 'Rd',
          'drive': 'Dr',
          'lane': 'Ln',
          'court': 'Ct',
          'place': 'Pl'
        };
        return abbrevMap[match.toLowerCase()] || match;
      });
  }
  
  export function validateBusinessInfo(businessInfo) {
    const errors = [];
    const warnings = [];
  
    if (typeof businessInfo !== 'object' || businessInfo === null) {
      return { isValid: true, errors: [], warnings: [], normalized: {} };
    }
  
    const {
      employeeCount,
      averageAnnualReceipts,
      industry,
      businessAge,
      ownerEquity,
      projectCost,
      ownerOccupancy
    } = businessInfo;
  
    // Validate numeric fields
    if (employeeCount !== undefined) {
      if (typeof employeeCount !== 'number' || employeeCount < 0) {
        errors.push('Employee count must be a non-negative number');
      }
    }
  
    if (averageAnnualReceipts !== undefined) {
      if (typeof averageAnnualReceipts !== 'number' || averageAnnualReceipts < 0) {
        errors.push('Average annual receipts must be a non-negative number');
      }
    }
  
    if (businessAge !== undefined) {
      if (typeof businessAge !== 'number' || businessAge < 0) {
        errors.push('Business age must be a non-negative number');
      }
      if (businessAge < 2) {
        warnings.push('Many programs require 2+ years of business history');
      }
    }
  
    if (ownerEquity !== undefined) {
      if (typeof ownerEquity !== 'number' || ownerEquity < 0) {
        errors.push('Owner equity must be a non-negative number');
      }
    }
  
    if (projectCost !== undefined) {
      if (typeof projectCost !== 'number' || projectCost <= 0) {
        errors.push('Project cost must be a positive number');
      }
    }
  
    if (ownerOccupancy !== undefined) {
      if (typeof ownerOccupancy !== 'number' || ownerOccupancy < 0 || ownerOccupancy > 100) {
        errors.push('Owner occupancy must be a percentage between 0 and 100');
      }
      if (ownerOccupancy < 51) {
        warnings.push('Many programs require 51%+ owner occupancy');
      }
    }
  
    // Validate industry
    const validIndustries = [
      'retail', 'manufacturing', 'construction', 'professional_services',
      'real_estate', 'hospitality', 'healthcare', 'technology', 'other'
    ];
  
    if (industry && !validIndustries.includes(industry)) {
      warnings.push(`Industry "${industry}" not recognized, using "other"`);
    }
  
    // Cross-field validations
    if (ownerEquity && projectCost) {
      const equityPercentage = (ownerEquity / projectCost) * 100;
      if (equityPercentage < 10) {
        warnings.push('Owner equity below 10% may limit financing options');
      }
    }
  
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalized: {
        employeeCount: employeeCount || 0,
        averageAnnualReceipts: averageAnnualReceipts || 0,
        industry: validIndustries.includes(industry) ? industry : 'other',
        businessAge: businessAge || 0,
        ownerEquity: ownerEquity || 0,
        projectCost: projectCost || 0,
        ownerOccupancy: ownerOccupancy || 51
      }
    };
  }
  
  export function validateProjectDetails(projectDetails) {
    const errors = [];
    const warnings = [];
  
    if (typeof projectDetails !== 'object' || projectDetails === null) {
      return { isValid: true, errors: [], warnings: [], normalized: {} };
    }
  
    const { projectType, constructionType, timeline, budget } = projectDetails;
  
    // Validate project type
    const validProjectTypes = [
      'new_construction', 'renovation', 'acquisition', 'mixed_use',
      'office', 'retail', 'industrial', 'hospitality', 'healthcare'
    ];
  
    if (projectType && !validProjectTypes.includes(projectType)) {
      warnings.push(`Project type "${projectType}" not recognized`);
    }
  
    // Validate construction type
    const validConstructionTypes = [
      'ground_up', 'substantial_rehab', 'adaptive_reuse', 'tenant_improvement'
    ];
  
    if (constructionType && !validConstructionTypes.includes(constructionType)) {
      warnings.push(`Construction type "${constructionType}" not recognized`);
    }
  
    // Validate timeline
    if (timeline) {
      if (typeof timeline.start !== 'string' && !(timeline.start instanceof Date)) {
        warnings.push('Project start date should be provided');
      }
      if (typeof timeline.completion !== 'string' && !(timeline.completion instanceof Date)) {
        warnings.push('Project completion date should be provided');
      }
    }
  
    // Validate budget
    if (budget) {
      if (typeof budget.total !== 'number' || budget.total <= 0) {
        errors.push('Total budget must be a positive number');
      }
      if (budget.construction && (typeof budget.construction !== 'number' || budget.construction < 0)) {
        errors.push('Construction budget must be a non-negative number');
      }
      if (budget.softCosts && (typeof budget.softCosts !== 'number' || budget.softCosts < 0)) {
        errors.push('Soft costs must be a non-negative number');
      }
    }
  
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalized: {
        projectType: validProjectTypes.includes(projectType) ? projectType : 'other',
        constructionType: validConstructionTypes.includes(constructionType) ? constructionType : 'other',
        timeline: timeline || {},
        budget: budget || {}
      }
    };
  }
  
  export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .substring(0, 1000); // Limit length
  }
  
  export function validateCoordinates(lat, lon) {
    const errors = [];
    
    if (typeof lat !== 'number' || isNaN(lat)) {
      errors.push('Latitude must be a valid number');
    } else if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    
    if (typeof lon !== 'number' || isNaN(lon)) {
      errors.push('Longitude must be a valid number');
    } else if (lon < -180 || lon > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }