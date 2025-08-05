// src/services/api/HistoricTaxCreditsService.js
import BaseAPIService from './BaseAPIService.js';
import { CACHE_TTL } from '../utils/constants.js';

class HistoricTaxCreditsService extends BaseAPIService {
  constructor() {
    super('https://www.nps.gov/subjects/taxincentives');
  }

  async checkHistoricTaxCredits(address) {
    const normalized = this.validateAddress(address);
    
    // Get coordinates for the address
    const coordinates = await this.geocodeAddress(normalized);
    if (!coordinates) {
      throw new Error('Unable to geocode address');
    }

    // Check for historic properties and districts
    const historicData = await this.checkHistoricProperties(coordinates);
    const statePrograms = await this.getStateHistoricPrograms(coordinates);
    
    return {
      address: normalized,
      coordinates,
      federalHTC: historicData,
      statePrograms,
      combinedBenefits: this.calculateCombinedBenefits(historicData, statePrograms)
    };
  }

  async checkHistoricProperties(coordinates) {
    try {
      // In production, this would query the National Register of Historic Places API
      // For now, we'll simulate the check
      const isInHistoricDistrict = await this.checkHistoricDistrict(coordinates);
      const nearbyHistoricProperties = await this.findNearbyHistoricProperties(coordinates);
      
      return {
        eligible: isInHistoricDistrict || nearbyHistoricProperties.length > 0,
        type: isInHistoricDistrict ? 'Historic District' : 'Individual Property',
        details: {
          inHistoricDistrict: isInHistoricDistrict,
          nearbyProperties: nearbyHistoricProperties,
          requirements: this.getFederalHTCRequirements()
        },
        benefits: isInHistoricDistrict || nearbyHistoricProperties.length > 0 ? 
          this.getFederalHTCBenefits() : null
      };
    } catch (error) {
      console.warn('Historic property check failed:', error);
      return {
        eligible: false,
        type: null,
        details: { error: 'Unable to verify historic status' },
        benefits: null
      };
    }
  }

  async checkHistoricDistrict(coordinates) {
    // Simulate historic district check
    // In production, this would query NRHP database
    const districtProbability = Math.random();
    return districtProbability > 0.85; // Roughly 15% chance for demo
  }

  async findNearbyHistoricProperties(coordinates) {
    // Simulate nearby historic properties
    const properties = [];
    const propertyCount = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < propertyCount; i++) {
      properties.push({
        name: `Historic Property ${i + 1}`,
        nrhpId: `HP${Date.now()}${i}`,
        distance: `${(Math.random() * 0.5 + 0.1).toFixed(2)} miles`,
        type: ['Building', 'District', 'Site'][Math.floor(Math.random() * 3)],
        yearListed: 1980 + Math.floor(Math.random() * 40)
      });
    }
    
    return properties;
  }

  getFederalHTCRequirements() {
    return {
      propertyRequirements: [
        'Property must be listed on National Register of Historic Places',
        'Or be located in a certified historic district',
        'Or be determined eligible for NRHP listing'
      ],
      projectRequirements: [
        'Must be certified rehabilitation project',
        'Rehabilitation costs must exceed $5,000 or adjusted basis',
        'Must meet Secretary of Interior Standards for Rehabilitation',
        'Building must be substantially rehabilitated'
      ],
      useRequirements: [
        'Must be used for business or income-producing purposes',
        'Cannot be used primarily as personal residence',
        'Must be placed in service before claiming credit'
      ]
    };
  }

  getFederalHTCBenefits() {
    return {
      program: 'Federal Historic Tax Credits',
      creditRate: '20%',
      creditBasis: 'Qualified rehabilitation expenditures',
      benefits: [
        {
          type: 'Federal Tax Credit',
          description: '20% of qualified rehabilitation expenditures',
          value: '20% credit rate',
          timing: 'Claimed over 5 years (20% per year)'
        },
        {
          type: 'Depreciation',
          description: 'Depreciate remaining basis over 27.5 or 39 years',
          value: 'Standard depreciation schedules apply'
        }
      ],
      maximums: {
        noStatutoryLimit: true,
        note: 'Credit limited by tax liability and passive activity rules'
      },
      timeline: {
        application: 'Part 1 application before work begins',
        certification: 'Part 2 during construction, Part 3 at completion',
        creditClaim: 'Year property is placed in service'
      }
    };
  }

  async getStateHistoricPrograms(coordinates) {
    // Get state-specific historic tax credit programs
    const state = await this.determineState(coordinates);
    return this.getStateHTCPrograms(state);
  }

  async determineState(coordinates) {
    // Simple reverse geocoding to determine state
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lon}&zoom=10`
      );
      const data = await response.json();
      return data?.address?.state || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  getStateHTCPrograms(state) {
    // State-specific HTC programs
    const statePrograms = {
      'California': {
        programs: ['Mills Act Property Tax Reduction'],
        benefits: 'Property tax reduction up to 50-75%',
        creditRate: 'N/A (property tax benefit)',
        additionalInfo: 'Local program administered by municipalities'
      },
      'New York': {
        programs: ['NYS Historic Tax Credit'],
        benefits: '20% state tax credit',
        creditRate: '20%',
        additionalInfo: 'Can be combined with federal credits'
      },
      'Texas': {
        programs: ['State Historic Tax Credit'],
        benefits: '25% state tax credit',
        creditRate: '25%',
        additionalInfo: 'For certified rehabilitation projects'
      },
      'Florida': {
        programs: ['Special Assessment for Historic Properties'],
        benefits: 'Property tax assessment cap',
        creditRate: 'N/A (assessment benefit)',
        additionalInfo: 'Limits annual assessment increases'
      }
    };

    return statePrograms[state] || {
      programs: ['Contact State Historic Preservation Office'],
      benefits: 'State programs may be available',
      creditRate: 'Varies by state',
      additionalInfo: 'Check with local SHPO for available programs'
    };
  }

  calculateCombinedBenefits(federalHTC, statePrograms) {
    if (!federalHTC.eligible) {
      return {
        totalCredits: '0%',
        stackable: false,
        note: 'Property not eligible for historic tax credits'
      };
    }

    const federalRate = 20;
    const stateRate = statePrograms.creditRate === '20%' ? 20 : 
                     statePrograms.creditRate === '25%' ? 25 : 0;

    return {
      federalCredit: '20%',
      stateCredit: statePrograms.creditRate,
      totalCredits: federalRate + stateRate + '%',
      stackable: stateRate > 0,
      effectiveRate: `Up to ${federalRate + stateRate}% of qualified expenditures`,
      note: stateRate > 0 ? 
        'Federal and state credits can typically be combined' :
        'Check for additional state or local incentives'
    };
  }

  async getHTCProjectExamples() {
    return {
      eligibleProjects: [
        'Adaptive reuse of historic warehouses',
        'Hotel rehabilitation in historic districts',
        'Office building restoration',
        'Mixed-use historic building conversion',
        'Industrial building adaptive reuse'
      ],
      typicalCosts: {
        minimum: '$5,000 or adjusted basis',
        typical: '$500K - $50M+',
        note: 'Must exceed greater of $5,000 or adjusted basis'
      },
      timeframe: {
        planning: '6-12 months for approvals',
        construction: '12-36 months typical',
        creditRealization: '5 years (20% annually)'
      }
    };
  }
}

export default HistoricTaxCreditsService;