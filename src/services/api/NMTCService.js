// src/services/api/NMTCService.js
import BaseAPIService from './BaseAPIService.js';
import { CACHE_TTL } from '../utils/constants.js';

class NMTCService extends BaseAPIService {
  constructor() {
    super('https://www.cdfifund.gov');
  }

  async checkNMTCEligibility(address) {
    const normalized = this.validateAddress(address);
    
    // Get coordinates for the address
    const coordinates = await this.geocodeAddress(normalized);
    if (!coordinates) {
      throw new Error('Unable to geocode address');
    }

    // Get census tract data
    const censusData = await this.getCensusTract(coordinates.lat, coordinates.lon);
    if (!censusData) {
      throw new Error('Unable to determine census tract');
    }

    // Check NMTC eligibility criteria
    const eligibilityData = await this.checkLowIncomeEligibility(censusData);
    
    return {
      address: normalized,
      coordinates,
      censusData,
      nmtcEligible: eligibilityData.eligible,
      eligibilityReason: eligibilityData.reason,
      qualificationCriteria: eligibilityData.criteria,
      benefits: eligibilityData.eligible ? this.getNMTCBenefits() : null,
      nearbyOpportunities: await this.findNearbyCDEs(coordinates)
    };
  }

  async checkLowIncomeEligibility(censusData) {
    // NMTC Low-Income Community (LIC) qualification criteria
    try {
      // In production, this would query the CDFI Fund's database
      // For now, we'll simulate based on general demographic patterns
      
      const demographics = await this.simulateCensusDemographics(censusData.geoid);
      
      // LIC qualification criteria:
      // 1. Poverty rate ≥ 20%, OR
      // 2. Median family income ≤ 80% of area/statewide median, OR  
      // 3. Located in federally designated empowerment zone/enterprise community
      
      const qualifiesByPoverty = demographics.povertyRate >= 20;
      const qualifiesByIncome = demographics.medianIncomeRatio <= 0.8;
      const qualifiesByDesignation = demographics.inEmpowermentZone;
      
      const eligible = qualifiesByPoverty || qualifiesByIncome || qualifiesByDesignation;
      
      const reasons = [];
      if (qualifiesByPoverty) reasons.push(`Poverty rate: ${demographics.povertyRate}% (≥20% required)`);
      if (qualifiesByIncome) reasons.push(`Median income: ${Math.round(demographics.medianIncomeRatio * 100)}% of area median (≤80% required)`);
      if (qualifiesByDesignation) reasons.push('Located in designated empowerment zone');
      
      return {
        eligible,
        reason: eligible ? reasons.join('; ') : 'Does not meet Low-Income Community criteria',
        criteria: {
          povertyRate: demographics.povertyRate,
          medianIncomeRatio: demographics.medianIncomeRatio,
          inEmpowermentZone: demographics.inEmpowermentZone,
          qualifications: {
            poverty: qualifiesByPoverty,
            income: qualifiesByIncome,
            designation: qualifiesByDesignation
          }
        }
      };
    } catch (error) {
      console.warn('NMTC eligibility check failed:', error);
      return {
        eligible: false,
        reason: 'Unable to verify Low-Income Community status',
        criteria: null
      };
    }
  }

  async simulateCensusDemographics(geoid) {
    // Simulate census demographics - in production, use real ACS data
    const random = this.seededRandom(geoid);
    
    return {
      povertyRate: 5 + random() * 35, // 5-40% range
      medianIncomeRatio: 0.4 + random() * 0.6, // 40-100% of area median
      inEmpowermentZone: random() < 0.1, // 10% chance
      population: Math.floor(1000 + random() * 9000),
      medianIncome: Math.floor(25000 + random() * 75000)
    };
  }

  seededRandom(seed) {
    // Simple seeded random for consistent results
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return function() {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }

  getNMTCBenefits() {
    return {
      program: 'New Markets Tax Credits (NMTC)',
      creditRate: '39%',
      creditPeriod: '7 years',
      benefits: [
        {
          type: 'Federal Tax Credit',
          description: '39% of Qualified Equity Investment (QEI) over 7 years',
          value: '5% in years 1-3, 6% in years 4-7',
          timing: 'Annual credits for 7 years'
        },
        {
          type: 'Leverage Opportunity',
          description: 'Typically leveraged 2:1 or 3:1 with senior debt',
          value: 'Access to patient capital at below-market rates'
        }
      ],
      investmentStructure: {
        minimum: '$1M typical minimum',
        maximum: 'No statutory maximum',
        leverage: '2:1 to 3:1 debt-to-equity typical',
        irr: '8-12% target returns for investors'
      },
      timeline: {
        application: 'CDE must apply to CDFI Fund',
        commitment: '5-year commitment period',
        deployment: '12 months to deploy 85% of allocation',
        compliance: '7-year compliance period'
      }
    };
  }

  async findNearbyCDEs(coordinates) {
    // Find nearby Community Development Entities
    // In production, this would query the CDFI Fund database
    
    return [
      {
        name: 'Urban Development CDE',
        allocation: '$50M available',
        focus: 'Mixed-use development, community facilities',
        contact: 'contact@urbancde.org',
        distance: '2.3 miles',
        specialties: ['Real Estate', 'Community Facilities', 'Healthcare']
      },
      {
        name: 'Community Investment Partners',
        allocation: '$75M available', 
        focus: 'Commercial real estate, small business',
        contact: 'info@cipinvest.com',
        distance: '5.7 miles',
        specialties: ['Grocery Stores', 'Manufacturing', 'Office Buildings']
      },
      {
        name: 'Regional Development Fund',
        allocation: '$100M available',
        focus: 'Large-scale community development',
        contact: 'development@rdf.org',
        distance: '8.1 miles',
        specialties: ['Mixed-Use', 'Charter Schools', 'Health Centers']
      }
    ];
  }

  async getNMTCProjectTypes() {
    return {
      eligibleProjects: [
        'Community facilities (health centers, schools)',
        'Mixed-use real estate development',
        'Manufacturing facilities',
        'Commercial real estate (offices, retail)',
        'Community services facilities',
        'Charter schools and educational facilities',
        'Grocery stores and food access projects'
      ],
      businessRequirements: {
        location: 'Must be located in Low-Income Community',
        employment: '40% of employees must be LIC residents, OR',
        services: '40% of services must benefit LIC residents, OR',
        customers: '40% of customers must be LIC residents'
      },
      typicalProjectSizes: {
        small: '$1M - $5M',
        medium: '$5M - $25M',
        large: '$25M - $100M+',
        note: 'Projects often combined with other financing sources'
      }
    };
  }

  async getCDEDirectory() {
    // Simplified CDE directory - in production would be comprehensive database
    return {
      nationalCDEs: [
        {
          name: 'Enterprise Community Partners',
          allocation: '$500M+',
          geographic: 'National',
          focus: 'Housing, mixed-use, community facilities'
        },
        {
          name: 'Stonehenge Community Development',
          allocation: '$300M+',
          geographic: 'National',
          focus: 'Healthcare, education, mixed-use'
        },
        {
          name: 'National Development Council',
          allocation: '$200M+',
          geographic: 'National',
          focus: 'Real estate, economic development'
        }
      ],
      searchTips: [
        'Contact multiple CDEs for competitive terms',
        'Consider CDE specialization and track record',
        'Evaluate ongoing compliance support',
        'Compare pricing and fee structures'
      ]
    };
  }

  calculateNMTCValue(projectCost, equityPercentage = 0.25) {
    const equityInvestment = projectCost * equityPercentage;
    const nmtcValue = equityInvestment * 0.39; // 39% credit
    const netEquityCost = equityInvestment - nmtcValue;
    const effectiveRate = (projectCost - netEquityCost) / projectCost;

    return {
      projectCost,
      equityInvestment,
      nmtcCredits: nmtcValue,
      netEquityCost,
      effectiveSubsidy: nmtcValue,
      effectiveRate: Math.round(effectiveRate * 100) + '%',
      savings: nmtcValue
    };
  }
}

export default NMTCService;