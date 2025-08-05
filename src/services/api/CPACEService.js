// src/services/api/CPACEService.js
import BaseAPIService from './BaseAPIService.js';

class CPACEService extends BaseAPIService {
  constructor() {
    super('https://pacenation.org');
  }

  async checkCPACEAvailability(address) {
    const normalized = this.validateAddress(address);
    
    const coordinates = await this.geocodeAddress(normalized);
    if (!coordinates) {
      throw new Error('Unable to geocode address');
    }

    const state = await this.determineState(coordinates);
    const county = await this.determineCounty(coordinates);
    
    const stateProgram = this.getStatePACEProgram(state);
    const localProgram = await this.getLocalPACEProgram(state, county);
    
    const available = stateProgram.available || localProgram.available;
    
    return {
      address: normalized,
      coordinates,
      state,
      county,
      cpaceAvailable: available,
      stateProgram,
      localProgram,
      benefits: available ? this.getCPACEBenefits() : null,
      eligibleImprovements: available ? this.getEligibleImprovements() : null
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

  async determineCounty(coordinates) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lon}&zoom=8`
      );
      const data = await response.json();
      return data?.address?.county || 'Unknown County';
    } catch {
      return 'Unknown County';
    }
  }

  getStatePACEProgram(state) {
    const statePrograms = {
      'California': {
        available: true,
        program: 'HERO Program & CaliforniaFIRST',
        administrator: 'Multiple administrators',
        coverage: 'Statewide',
        maxFinancing: 'Up to 20-30% of property value',
        terms: 'Up to 25 years',
        rateRange: '4-8%',
        specialFeatures: ['Open Market', 'Contractor networks']
      },
      'New York': {
        available: true,
        program: 'Energize NY',
        administrator: 'Energy Improvement Corporation',
        coverage: 'Most counties participating',
        maxFinancing: 'Up to 10% of property value',
        terms: 'Up to 20 years',
        rateRange: '4-7%',
        specialFeatures: ['Green jobs focus', 'Solar emphasis']
      },
      'Texas': {
        available: true,
        program: 'Multiple local programs',
        administrator: 'Various local authorities',
        coverage: 'Major metro areas',
        maxFinancing: 'Varies by locality',
        terms: 'Up to 20 years',
        rateRange: '5-8%',
        specialFeatures: ['Local control', 'Varied eligibility']
      },
      'Florida': {
        available: true,
        program: 'Florida PACE',
        administrator: 'Ygrene Energy Fund',
        coverage: 'Most counties',
        maxFinancing: 'Up to 20% of property value',
        terms: 'Up to 30 years',
        rateRange: '4-8%',
        specialFeatures: ['Hurricane resilience', 'Water efficiency']
      },
      'Colorado': {
        available: true,
        program: 'C-PACE programs',
        administrator: 'Multiple administrators',
        coverage: 'Denver, Boulder, other metros',
        maxFinancing: 'Varies by program',
        terms: 'Up to 25 years',
        rateRange: '4-7%',
        specialFeatures: ['Renewable energy focus']
      }
    };

    return statePrograms[state] || {
      available: false,
      program: 'Not available',
      note: `Check with ${state} energy office for potential future programs`,
      alternatives: 'Consider utility rebates or federal programs'
    };
  }

  async getLocalPACEProgram(state, county) {
    // Simulate local program lookup
    const hasLocalProgram = Math.random() > 0.7; // 30% chance of local program
    
    if (!hasLocalProgram) {
      return {
        available: false,
        program: 'No local program',
        note: 'Check with local economic development office'
      };
    }

    return {
      available: true,
      program: `${county} C-PACE Program`,
      administrator: `${county} Economic Development Authority`,
      maxFinancing: 'Up to $5M per project',
      terms: 'Up to 25 years',
      rateRange: '4-6%',
      specialFeatures: ['Local economic development focus', 'Expedited approvals']
    };
  }

  getCPACEBenefits() {
    return {
      program: 'Commercial Property Assessed Clean Energy (C-PACE)',
      financingType: 'Property tax assessment',
      benefits: [
        {
          type: '100% Financing',
          description: 'Finance 100% of eligible improvement costs',
          value: 'No upfront capital required'
        },
        {
          type: 'Long-Term Fixed Rates',
          description: 'Fixed interest rates for up to 25-30 years',
          value: 'Predictable payments, typically 4-8%'
        },
        {
          type: 'Non-Recourse',
          description: 'Assessment stays with property, not borrower',
          value: 'Transferable to new owner upon sale'
        },
        {
          type: 'No Personal Guarantees',
          description: 'Secured by property assessment, not personal credit',
          value: 'Preserves other credit lines'
        },
        {
          type: 'Off-Balance Sheet',
          description: 'Not considered traditional debt',
          value: 'May not impact debt-to-equity ratios'
        }
      ],
      paymentMethod: {
        structure: 'Paid through property tax bill',
        frequency: 'Annual or semi-annual',
        collection: 'Same priority as property taxes',
        transferability: 'Transfers with property ownership'
      }
    };
  }

  getEligibleImprovements() {
    return {
      energyEfficiency: [
        'HVAC system upgrades',
        'LED lighting retrofits',
        'Building envelope improvements',
        'Energy management systems',
        'High-efficiency windows and doors',
        'Insulation upgrades'
      ],
      renewableEnergy: [
        'Solar photovoltaic systems',
        'Solar thermal systems',
        'Geothermal systems',
        'Wind energy systems',
        'Combined heat and power',
        'Energy storage systems'
      ],
      waterEfficiency: [
        'Low-flow fixtures',
        'Smart irrigation systems',
        'Water recycling systems',
        'Drought-resistant landscaping',
        'Water-efficient cooling systems'
      ],
      resilienceImprovements: [
        'Seismic retrofits',
        'Hurricane/wind resistance upgrades',
        'Flood mitigation measures',
        'Backup power systems',
        'Fire-resistant materials'
      ],
      requirements: {
        eligibilityCriteria: [
          'Improvements must be permanently affixed to property',
          'Must provide measurable energy or water savings',
          'Savings should equal or exceed annual assessment',
          'Must meet program technical standards'
        ],
        documentation: [
          'Energy audit or engineering study',
          'Contractor licensing verification',
          'Property owner consent',
          'Lender consent (if existing mortgage)'
        ]
      }
    };
  }

  calculateCPACESavings(improvementCost, annualSavings, term = 20, interestRate = 0.06) {
    const monthlyRate = interestRate / 12;
    const totalPayments = term * 12;
    
    // Calculate monthly payment
    const monthlyPayment = improvementCost * 
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    
    const annualPayment = monthlyPayment * 12;
    const totalInterest = (annualPayment * term) - improvementCost;
    const netAnnualSavings = annualSavings - annualPayment;
    const paybackPeriod = improvementCost / annualSavings;
    
    return {
      improvementCost,
      annualSavings,
      annualPayment: Math.round(annualPayment),
      netAnnualSavings: Math.round(netAnnualSavings),
      totalInterest: Math.round(totalInterest),
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      cashFlowPositive: netAnnualSavings > 0,
      term,
      interestRate: (interestRate * 100) + '%'
    };
  }

  async getCPACEProviders(state) {
    const providers = {
      'California': [
        { name: 'CaliforniaFIRST', website: 'californiafirst.org', focus: 'Statewide coverage' },
        { name: 'HERO Program', website: 'heroprogram.com', focus: 'Residential & Commercial' },
        { name: 'Ygrene', website: 'ygrene.com', focus: 'Clean energy financing' }
      ],
      'National': [
        { name: 'Petros PACE Finance', website: 'petrospace.com', focus: 'C-PACE nationwide' },
        { name: 'Nuveen Green Capital', website: 'nuveengreencapital.com', focus: 'Large projects' },
        { name: 'Sustainable Real Estate Solutions', website: 'sres-pace.com', focus: 'Commercial focus' }
      ]
    };

    return providers[state] || providers['National'];
  }

  async getPACEProjectExamples() {
    return {
      typicalProjects: [
        {
          type: 'Office Building LED Retrofit',
          size: '100,000 sq ft',
          cost: '$250,000',
          savings: '$35,000/year',
          payback: '7.1 years',
          improvements: 'LED lighting, controls, emergency lighting'
        },
        {
          type: 'Retail Solar Installation',
          size: '50,000 sq ft',
          cost: '$500,000',
          savings: '$65,000/year',
          payback: '7.7 years',
          improvements: '200kW rooftop solar system'
        },
        {
          type: 'Industrial HVAC Upgrade',
          size: '200,000 sq ft',
          cost: '$750,000',
          savings: '$95,000/year',
          payback: '7.9 years',
          improvements: 'High-efficiency chillers, controls, VFDs'
        },
        {
          type: 'Multi-Family Energy Retrofit',
          size: '150 units',
          cost: '$1,200,000',
          savings: '$140,000/year',
          payback: '8.6 years',
          improvements: 'HVAC, insulation, windows, lighting'
        }
      ],
      successFactors: [
        'Strong energy savings projections',
        'Experienced contractor selection',
        'Proper measurement and verification',
        'Ongoing maintenance planning'
      ]
    };
  }
}

export default CPACEService;