// src/services/api/SBAService.js
import BaseAPIService from './BaseAPIService.js';

class SBAService extends BaseAPIService {
  constructor() {
    super('https://www.sba.gov');
  }

  async checkSBA504Eligibility(address, businessInfo = {}) {
    const normalized = this.validateAddress(address);
    
    const coordinates = await this.geocodeAddress(normalized);
    if (!coordinates) {
      throw new Error('Unable to geocode address');
    }

    const state = await this.determineState(coordinates);
    const localCDCs = await this.findNearbyCDCs(coordinates, state);
    
    // Check basic eligibility criteria
    const eligibility = this.assessSBA504Eligibility(businessInfo);
    
    return {
      address: normalized,
      coordinates,
      state,
      eligible: eligibility.eligible,
      eligibilityDetails: eligibility,
      localCDCs,
      benefits: eligibility.eligible ? this.getSBA504Benefits() : null,
      requirements: this.getSBA504Requirements(),
      process: this.getSBA504Process()
    };
  }

  async determineState(coordinates) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lon}&zoom=6`
      );
      const data = await response.json();
      return data?.address?.state || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  assessSBA504Eligibility(businessInfo) {
    const {
      employeeCount = 0,
      averageAnnualReceipts = 0,
      industry = 'other',
      businessAge = 0,
      ownerEquity = 0,
      projectCost = 0,
      ownerOccupancy = 51
    } = businessInfo;

    const eligibilityChecks = {
      sizeStandards: this.checkSizeStandards(employeeCount, averageAnnualReceipts, industry),
      businessAge: businessAge >= 2,
      ownerEquity: ownerEquity >= (projectCost * 0.10), // 10% minimum equity
      ownerOccupancy: ownerOccupancy >= 51, // 51% owner occupancy required
      creditworthiness: true, // Would require actual credit check
      jobCreation: true // Generally presumed for real estate projects
    };

    const eligible = Object.values(eligibilityChecks).every(check => check === true);

    return {
      eligible,
      checks: eligibilityChecks,
      details: {
        sizeStandardsMet: eligibilityChecks.sizeStandards,
        sufficientBusinessHistory: eligibilityChecks.businessAge,
        adequateEquity: eligibilityChecks.ownerEquity,
        ownerOccupancyMet: eligibilityChecks.ownerOccupancy,
        estimatedApprovalProbability: eligible ? 'High' : 'Needs improvement'
      },
      recommendations: this.getEligibilityRecommendations(eligibilityChecks, businessInfo)
    };
  }

  checkSizeStandards(employees, receipts, industry) {
    // SBA size standards vary by NAICS code
    const sizeStandards = {
      'retail': { employees: 500, receipts: 8000000 }, // $8M
      'manufacturing': { employees: 1500, receipts: null },
      'construction': { employees: null, receipts: 42000000 }, // $42M
      'professional_services': { employees: null, receipts: 8500000 }, // $8.5M
      'real_estate': { employees: null, receipts: 8000000 }, // $8M
      'hospitality': { employees: null, receipts: 8500000 }, // $8.5M
      'other': { employees: 500, receipts: 8000000 } // Default
    };

    const standard = sizeStandards[industry] || sizeStandards['other'];
    
    if (standard.employees && employees > standard.employees) return false;
    if (standard.receipts && receipts > standard.receipts) return false;
    
    return true;
  }

  getEligibilityRecommendations(checks, businessInfo) {
    const recommendations = [];

    if (!checks.sizeStandards) {
      recommendations.push('Business exceeds SBA size standards for this industry');
    }
    if (!checks.businessAge) {
      recommendations.push('Business needs 2+ years operating history');
    }
    if (!checks.ownerEquity) {
      recommendations.push('Increase owner equity to at least 10% of project cost');
    }
    if (!checks.ownerOccupancy) {
      recommendations.push('Ensure owner will occupy at least 51% of property');
    }

    if (recommendations.length === 0) {
      recommendations.push('Business appears to meet basic SBA 504 eligibility criteria');
    }

    return recommendations;
  }

  getSBA504Benefits() {
    return {
      program: 'SBA 504 Loan Program',
      financingStructure: 'Three-part financing',
      benefits: [
        {
          type: 'Long-Term Fixed Rates',
          description: 'SBA portion has fixed rates for 10 or 20 years',
          value: 'Currently 5-7% fixed rates (varies with Treasury rates)'
        },
        {
          type: 'Low Down Payment',
          description: 'Only 10% owner equity required',
          value: '90% financing available'
        },
        {
          type: 'No Personal Real Estate Required',
          description: 'Property being purchased serves as primary collateral',
          value: 'Preserves personal assets'
        },
        {
          type: 'Long Amortization',
          description: '10 or 20-year terms available',
          value: 'Lower monthly payments'
        }
      ],
      financingStructure: {
        bankLoan: {
          portion: '50%',
          rate: 'Market rate (variable or fixed)',
          term: 'Typically 10 years',
          description: 'First mortgage from participating bank'
        },
        sbaDebenture: {
          portion: '40%',
          rate: 'Fixed rate based on Treasury bonds + spread',
          term: '10 or 20 years',
          description: 'SBA debenture through Certified Development Company'
        },
        ownerEquity: {
          portion: '10%',
          rate: 'N/A',
          term: 'N/A',
          description: 'Owner equity injection'
        }
      },
      maximums: {
        standardProject: '$5,500,000 SBA portion ($13.75M total project)',
        manufacturingProject: '$5,500,000 SBA portion',
        energyProject: '$5,500,000 SBA portion',
        smallManufacturer: '$6,500,000 SBA portion (businesses under $15M revenue)'
      }
    };
  }

  getSBA504Requirements() {
    return {
      businessRequirements: [
        'For-profit business (no non-profits)',
        'Meet SBA size standards',
        'Operate for 2+ years (or equivalent experience)',
        'Demonstrate good credit and management capability',
        'Create or retain jobs (1 job per $65,000 SBA funding)',
        'Owner must occupy 51% of property'
      ],
      projectRequirements: [
        'Purchase land and construct new facility, OR',
        'Purchase existing building and equipment, OR',
        'Expand/renovate existing facility',
        'Project must create or retain jobs',
        'Property must be owner-occupied (51% minimum)'
      ],
      useOfFunds: [
        'Land acquisition',
        'Building construction or renovation',
        'Machinery and equipment (limited amount)',
        'Soft costs (architects, engineers, legal)',
        'Furniture and fixtures (limited)'
      ],
      prohibited: [
        'Working capital',
        'Inventory',
        'Debt refinancing (with limited exceptions)',
        'Speculation or investment',
        'Lending or investing activities'
      ]
    };
  }

  getSBA504Process() {
    return {
      steps: [
        {
          step: 1,
          title: 'Initial Consultation',
          description: 'Meet with CDC and bank to discuss project',
          timeframe: '1-2 weeks',
          participants: ['Business owner', 'CDC', 'Bank']
        },
        {
          step: 2,
          title: 'Application Preparation',
          description: 'Gather financial documents and complete applications',
          timeframe: '2-4 weeks',
          requirements: ['3 years tax returns', 'Financial statements', 'Business plan']
        },
        {
          step: 3,
          title: 'Bank Approval',
          description: 'Bank reviews and approves first mortgage',
          timeframe: '2-6 weeks',
          note: 'Bank approval typically comes first'
        },
        {
          step: 4,
          title: 'SBA Application',
          description: 'CDC submits application to SBA',
          timeframe: '4-8 weeks',
          requirements: ['Bank commitment letter', 'Complete application package']
        },
        {
          step: 5,
          title: 'SBA Review',
          description: 'SBA reviews application and orders appraisal',
          timeframe: '4-12 weeks',
          note: 'Timeline varies by SBA office workload'
        },
        {
          step: 6,
          title: 'Authorization',
          description: 'SBA issues authorization to proceed',
          timeframe: '1-2 weeks',
          triggers: 'Can begin construction/purchase process'
        },
        {
          step: 7,
          title: 'Closing',
          description: 'Loan closing and fund disbursement',
          timeframe: '2-4 weeks',
          requirements: ['Final conditions met', 'Title work complete']
        }
      ],
      totalTimeframe: '3-8 months typical',
      tips: [
        'Start process early - timing can vary significantly',
        'Maintain good communication with CDC and bank',
        'Have all financial documentation ready',
        'Consider pre-qualification to gauge viability'
      ]
    };
  }

  async findNearbyCDCs(coordinates, state) {
    // Simulate CDC lookup - in production, use SBA's CDC directory
    const cdcs = [
      {
        name: 'Regional Development Corporation',
        coverage: `${state} statewide`,
        specialties: ['Real estate', 'Manufacturing', 'Healthcare'],
        contact: {
          phone: '(555) 123-4567',
          email: 'info@regionaldevelopment.org',
          website: 'www.regionaldevelopment.org'
        },
        experience: '25+ years',
        volume: '$50M+ annually',
        distance: '2.1 miles'
      },
      {
        name: 'Community Business Development Corp',
        coverage: 'Multi-state region',
        specialties: ['Small business', 'Retail', 'Professional services'],
        contact: {
          phone: '(555) 234-5678',
          email: 'loans@communitybdc.com',
          website: 'www.communitybdc.com'
        },
        experience: '15+ years',
        volume: '$25M+ annually',
        distance: '5.7 miles'
      },
      {
        name: 'Metro Economic Development CDC',
        coverage: 'Metropolitan area',
        specialties: ['Technology', 'Mixed-use', 'Urban development'],
        contact: {
          phone: '(555) 345-6789',
          email: 'development@metrocdc.org',
          website: 'www.metrocdc.org'
        },
        experience: '20+ years',
        volume: '$75M+ annually',
        distance: '8.3 miles'
      }
    ];

    return cdcs;
  }

  calculateSBA504Payments(projectCost, bankRate = 0.065, sbaRate = 0.055) {
    const ownerEquity = projectCost * 0.10;
    const bankLoan = projectCost * 0.50;
    const sbaLoan = projectCost * 0.40;

    // Bank loan (10-year amortization typical)
    const bankMonthlyRate = bankRate / 12;
    const bankPayments = 10 * 12;
    const bankPayment = bankLoan * 
      (bankMonthlyRate * Math.pow(1 + bankMonthlyRate, bankPayments)) / 
      (Math.pow(1 + bankMonthlyRate, bankPayments) - 1);

    // SBA loan (20-year amortization)
    const sbaMonthlyRate = sbaRate / 12;
    const sbaPayments = 20 * 12;
    const sbaPayment = sbaLoan * 
      (sbaMonthlyRate * Math.pow(1 + sbaMonthlyRate, sbaPayments)) / 
      (Math.pow(1 + sbaMonthlyRate, sbaPayments) - 1);

    const totalMonthlyPayment = bankPayment + sbaPayment;
    const totalAnnualPayment = totalMonthlyPayment * 12;

    return {
      projectCost,
      ownerEquity,
      bankLoan,
      sbaLoan,
      bankPayment: Math.round(bankPayment),
      sbaPayment: Math.round(sbaPayment),
      totalMonthlyPayment: Math.round(totalMonthlyPayment),
      totalAnnualPayment: Math.round(totalAnnualPayment),
      effectiveRate: ((totalAnnualPayment / (bankLoan + sbaLoan)) * 100).toFixed(2) + '%',
      bankRate: (bankRate * 100).toFixed(2) + '%',
      sbaRate: (sbaRate * 100).toFixed(2) + '%'
    };
  }

  async getSBA504ProjectExamples() {
    return {
      commonProjects: [
        {
          type: 'Manufacturing Facility Purchase',
          projectCost: '$2,000,000',
          ownerEquity: '$200,000',
          bankLoan: '$1,000,000',
          sbaLoan: '$800,000',
          monthlyPayment: '$12,450',
          jobsCreated: 15
        },
        {
          type: 'Office Building Purchase',
          projectCost: '$1,500,000',
          ownerEquity: '$150,000',
          bankLoan: '$750,000',
          sbaLoan: '$600,000',
          monthlyPayment: '$9,340',
          jobsCreated: 8
        },
        {
          type: 'Retail Center Development',
          projectCost: '$3,500,000',
          ownerEquity: '$350,000',
          bankLoan: '$1,750,000',
          sbaLoan: '$1,400,000',
          monthlyPayment: '$21,790',
          jobsCreated: 25
        }
      ],
      successFactors: [
        'Strong business financial performance',
        'Experienced management team',
        'Realistic job creation projections',
        'Well-prepared loan application',
        'Good relationship with CDC and bank'
      ]
    };
  }
}

export default SBAService;