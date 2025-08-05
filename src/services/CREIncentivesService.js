// src/services/CREIncentivesService.js
import OpportunityZonesService from './api/OpportunityZonesService.js';
import HistoricTaxCreditsService from './api/HistoricTaxCreditsService.js';
import NMTCService from './api/NMTCService.js';
import CPACEService from './api/CPACEService.js';
import SBAService from './api/SBAService.js';
import { APIError, ValidationError } from './errors/index.js';

class CREIncentivesService {
  constructor() {
    this.ozService = new OpportunityZonesService();
    this.htcService = new HistoricTaxCreditsService();
    this.nmtcService = new NMTCService();
    this.cpaceService = new CPACEService();
    this.sbaService = new SBAService();
  }

  async analyzeProperty(address, projectDetails = {}) {
    try {
      const startTime = Date.now();
      
      // Validate input
      if (!address || typeof address !== 'string') {
        throw new ValidationError('Valid address is required');
      }

      // Run all analyses in parallel for better performance
      const [ozResults, htcResults, nmtcResults, cpaceResults, sbaResults] = await Promise.allSettled([
        this.ozService.checkOpportunityZone(address),
        this.htcService.checkHistoricTaxCredits(address),
        this.nmtcService.checkNMTCEligibility(address),
        this.cpaceService.checkCPACEAvailability(address),
        this.sbaService.checkSBA504Eligibility(address, projectDetails.business || {})
      ]);

      // Process results and handle any failures gracefully
      const analysis = {
        address,
        analysisDate: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        location: this.extractLocationInfo(ozResults),
        incentives: {
          opportunityZones: this.processResult(ozResults, 'Opportunity Zones'),
          historicTaxCredits: this.processResult(htcResults, 'Historic Tax Credits'),
          newMarketsTC: this.processResult(nmtcResults, 'New Markets Tax Credits'),
          cpace: this.processResult(cpaceResults, 'C-PACE Financing'),
          sba504: this.processResult(sbaResults, 'SBA 504 Loans')
        },
        summary: null, // Will be populated below
        recommendations: null // Will be populated below
      };

      // Generate summary and recommendations
      analysis.summary = this.generateSummary(analysis.incentives);
      analysis.recommendations = this.generateRecommendations(analysis.incentives, projectDetails);
      analysis.stackingOpportunities = this.identifyStackingOpportunities(analysis.incentives);

      return analysis;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Analysis failed: ${error.message}`, 500);
    }
  }

  extractLocationInfo(ozResults) {
    if (ozResults.status === 'fulfilled' && ozResults.value) {
      return {
        coordinates: ozResults.value.coordinates,
        censusData: ozResults.value.censusData,
        formattedAddress: ozResults.value.address
      };
    }
    return null;
  }

  processResult(result, programName) {
    if (result.status === 'fulfilled') {
      return {
        status: 'success',
        data: result.value,
        available: this.determineAvailability(result.value, programName)
      };
    } else {
      return {
        status: 'error',
        error: result.reason.message,
        available: false,
        data: null
      };
    }
  }

  determineAvailability(data, programName) {
    switch (programName) {
      case 'Opportunity Zones':
        return data?.isOpportunityZone || false;
      case 'Historic Tax Credits':
        return data?.federalHTC?.eligible || false;
      case 'New Markets Tax Credits':
        return data?.nmtcEligible || false;
      case 'C-PACE Financing':
        return data?.cpaceAvailable || false;
      case 'SBA 504 Loans':
        return data?.eligible || false;
      default:
        return false;
    }
  }

  generateSummary(incentives) {
    const availablePrograms = [];
    const potentialPrograms = [];
    let totalEstimatedValue = 0;

    // Check each incentive program
    Object.entries(incentives).forEach(([key, program]) => {
      if (program.status === 'success' && program.available) {
        const programInfo = this.getProgramSummaryInfo(key, program.data);
        availablePrograms.push(programInfo);
        totalEstimatedValue += programInfo.estimatedValue || 0;
      } else if (program.status === 'success' && !program.available) {
        potentialPrograms.push(this.getProgramSummaryInfo(key, program.data));
      }
    });

    return {
      totalProgramsAvailable: availablePrograms.length,
      availablePrograms,
      potentialPrograms,
      estimatedTotalValue: totalEstimatedValue,
      primaryRecommendation: availablePrograms.length > 0 ? 
        availablePrograms[0].name : 'Explore alternative financing options',
      riskLevel: this.assessRiskLevel(availablePrograms)
    };
  }

  getProgramSummaryInfo(key, data) {
    const programMap = {
      opportunityZones: {
        name: 'Opportunity Zones',
        shortDescription: 'Tax deferral and elimination on capital gains',
        estimatedValue: 150000, // Estimated based on typical project
        timeframe: '10 years for maximum benefit',
        complexity: 'Medium'
      },
      historicTaxCredits: {
        name: 'Historic Tax Credits',
        shortDescription: '20% federal tax credit on rehabilitation costs',
        estimatedValue: 200000, // 20% of typical $1M rehab
        timeframe: '5 years to claim credits',
        complexity: 'High'
      },
      newMarketsTC: {
        name: 'New Markets Tax Credits',
        shortDescription: '39% tax credit over 7 years',
        estimatedValue: 390000, // 39% of $1M investment
        timeframe: '7 years',
        complexity: 'High'
      },
      cpace: {
        name: 'C-PACE Financing',
        shortDescription: '100% financing for energy improvements',
        estimatedValue: 50000, // Estimated interest savings
        timeframe: 'Up to 25 years',
        complexity: 'Low'
      },
      sba504: {
        name: 'SBA 504 Loans',
        shortDescription: 'Low down payment, fixed-rate financing',
        estimatedValue: 75000, // Estimated interest savings vs conventional
        timeframe: '10-20 years',
        complexity: 'Medium'
      }
    };

    return programMap[key] || {
      name: 'Unknown Program',
      shortDescription: 'Program details not available',
      estimatedValue: 0,
      timeframe: 'Unknown',
      complexity: 'Unknown'
    };
  }

  assessRiskLevel(availablePrograms) {
    if (availablePrograms.length === 0) return 'High';
    if (availablePrograms.length >= 3) return 'Low';
    return 'Medium';
  }

  generateRecommendations(incentives, projectDetails) {
    const recommendations = [];
    const availableIncentives = Object.entries(incentives)
      .filter(([, program]) => program.available)
      .map(([key]) => key);

    // Priority-based recommendations
    if (availableIncentives.includes('opportunityZones')) {
      recommendations.push({
        priority: 'High',
        program: 'Opportunity Zones',
        action: 'Structure investment through Qualified Opportunity Fund',
        timeline: 'Must invest within 180 days of capital gain',
        benefit: 'Up to 15% reduction in deferred gains + tax-free appreciation',
        requirements: ['Substantial improvement of existing buildings', 'Hold investment for 10+ years']
      });
    }

    if (availableIncentives.includes('historicTaxCredits')) {
      recommendations.push({
        priority: 'High',
        program: 'Historic Tax Credits',
        action: 'Apply for Part 1 certification before starting work',
        timeline: 'Begin application process immediately',
        benefit: '20% federal tax credit on qualified rehabilitation costs',
        requirements: ['Meet Secretary of Interior Standards', 'Substantial rehabilitation required']
      });
    }

    if (availableIncentives.includes('newMarketsTC')) {
      recommendations.push({
        priority: 'Medium',
        program: 'New Markets Tax Credits',
        action: 'Contact local CDEs for funding availability',
        timeline: '6-12 months for structuring and closing',
        benefit: '39% tax credit over 7 years',
        requirements: ['Located in Low-Income Community', 'Meet CDE investment criteria']
      });
    }

    if (availableIncentives.includes('sba504')) {
      recommendations.push({
        priority: 'Medium',
        program: 'SBA 504 Loans',
        action: 'Contact Certified Development Company',
        timeline: '3-6 months for approval and closing',
        benefit: 'Fixed-rate financing with only 10% down payment',
        requirements: ['Owner occupancy', 'Job creation/retention', '2+ years in business']
      });
    }

    if (availableIncentives.includes('cpace')) {
      recommendations.push({
        priority: 'Low',
        program: 'C-PACE Financing',
        action: 'Conduct energy audit to identify eligible improvements',
        timeline: '2-4 months for approval and implementation',
        benefit: '100% financing for energy improvements',
        requirements: ['Energy savings analysis', 'Permanently affixed improvements']
      });
    }

    // Add general recommendations if no specific programs available
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'Medium',
        program: 'Alternative Financing',
        action: 'Explore conventional financing and local incentives',
        timeline: 'Ongoing',
        benefit: 'Market-rate financing options',
        requirements: ['Standard underwriting criteria']
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  identifyStackingOpportunities(incentives) {
    const available = Object.entries(incentives)
      .filter(([, program]) => program.available)
      .map(([key]) => key);

    const stackingOpportunities = [];

    // Historic Tax Credits + Opportunity Zones
    if (available.includes('historicTaxCredits') && available.includes('opportunityZones')) {
      stackingOpportunities.push({
        programs: ['Historic Tax Credits', 'Opportunity Zones'],
        compatibility: 'High',
        combinedBenefit: 'Federal HTC + OZ capital gains benefits',
        considerations: ['Ensure OZ compliance with historic standards', 'Timing coordination required'],
        estimatedValue: 'Very High'
      });
    }

    // NMTC + Historic Tax Credits
    if (available.includes('newMarketsTC') && available.includes('historicTaxCredits')) {
      stackingOpportunities.push({
        programs: ['New Markets Tax Credits', 'Historic Tax Credits'],
        compatibility: 'Medium',
        combinedBenefit: 'NMTC + HTC can exceed 50% of project cost',
        considerations: ['Complex structuring required', 'Professional expertise essential'],
        estimatedValue: 'Very High'
      });
    }

    // SBA 504 + Other Programs
    if (available.includes('sba504')) {
      const otherPrograms = available.filter(p => p !== 'sba504');
      if (otherPrograms.length > 0) {
        stackingOpportunities.push({
          programs: ['SBA 504', ...otherPrograms.map(p => this.getProgramName(p))],
          compatibility: 'High',
          combinedBenefit: 'Low-cost debt + tax credit benefits',
          considerations: ['SBA approval of other incentives may be required'],
          estimatedValue: 'High'
        });
      }
    }

    // C-PACE with any other program
    if (available.includes('cpace') && available.length > 1) {
      const otherPrograms = available.filter(p => p !== 'cpace');
      stackingOpportunities.push({
        programs: ['C-PACE', ...otherPrograms.map(p => this.getProgramName(p))],
        compatibility: 'High',
        combinedBenefit: 'Energy financing + tax benefits',
        considerations: ['C-PACE generally compatible with other programs'],
        estimatedValue: 'Medium'
      });
    }

    return stackingOpportunities;
  }

  getProgramName(key) {
    const nameMap = {
      opportunityZones: 'Opportunity Zones',
      historicTaxCredits: 'Historic Tax Credits',
      newMarketsTC: 'New Markets Tax Credits',
      cpace: 'C-PACE',
      sba504: 'SBA 504'
    };
    return nameMap[key] || key;
  }

  async generateFinancialReport(analysis, projectDetails = {}) {
    const report = {
      executiveSummary: this.generateExecutiveSummary(analysis),
      locationAnalysis: this.generateLocationAnalysis(analysis),
      incentiveDetails: this.generateIncentiveDetails(analysis),
      financialProjections: this.generateFinancialProjections(analysis, projectDetails),
      implementationPlan: this.generateImplementationPlan(analysis),
      riskAssessment: this.generateRiskAssessment(analysis),
      nextSteps: this.generateNextSteps(analysis),
      appendices: this.generateAppendices(analysis),
      reportMetadata: {
        generatedDate: new Date().toISOString(),
        analysisDate: analysis.analysisDate,
        reportVersion: '1.0',
        disclaimer: 'This report is for informational purposes only and does not constitute financial or legal advice.'
      }
    };

    return report;
  }

  generateExecutiveSummary(analysis) {
    const availableCount = analysis.summary.totalProgramsAvailable;
    const totalValue = analysis.summary.estimatedTotalValue;
    
    return {
      propertyAddress: analysis.address,
      analysisDate: new Date(analysis.analysisDate).toLocaleDateString(),
      availableIncentives: availableCount,
      estimatedValue: `${totalValue.toLocaleString()}`,
      primaryRecommendation: analysis.summary.primaryRecommendation,
      keyFindings: [
        `${availableCount} incentive programs available for this location`,
        `Estimated total value: ${totalValue.toLocaleString()}`,
        `Risk level: ${analysis.summary.riskLevel}`,
        analysis.stackingOpportunities.length > 0 ? 
          `${analysis.stackingOpportunities.length} program stacking opportunities identified` :
          'Limited program stacking opportunities'
      ],
      implementationComplexity: this.assessImplementationComplexity(analysis),
      timeToRealization: this.estimateTimeToRealization(analysis)
    };
  }

  generateLocationAnalysis(analysis) {
    return {
      address: analysis.address,
      coordinates: analysis.location?.coordinates,
      censusData: analysis.location?.censusData,
      marketContext: {
        demographicProfile: 'Based on census tract analysis',
        economicIndicators: 'Derived from available data sources',
        developmentTrends: 'Consider local market conditions'
      },
      proximityAnalysis: {
        transportationAccess: 'Analyze based on location',
        amenities: 'Consider nearby facilities',
        competitiveProperties: 'Review comparable properties'
      }
    };
  }

  generateIncentiveDetails(analysis) {
    const details = {};
    
    Object.entries(analysis.incentives).forEach(([key, program]) => {
      if (program.available && program.data) {
        details[key] = {
          programName: this.getProgramName(key),
          status: 'Available',
          benefits: program.data.benefits,
          requirements: program.data.requirements || [],
          timeline: program.data.timeline || {},
          estimatedValue: this.calculateProgramValue(key, program.data),
          applicationProcess: this.getApplicationProcess(key),
          contacts: this.getRelevantContacts(key, program.data)
        };
      }
    });

    return details;
  }

  generateFinancialProjections(analysis, projectDetails) {
    const projectCost = projectDetails.projectCost || 2000000; // Default $2M project
    const projections = {
      baseCase: this.calculateBaseCase(projectCost),
      withIncentives: this.calculateWithIncentives(projectCost, analysis),
      comparison: null
    };

    projections.comparison = this.compareScenarios(projections.baseCase, projections.withIncentives);
    
    return projections;
  }

  calculateBaseCase(projectCost) {
    // Conventional financing scenario
    const downPayment = projectCost * 0.25; // 25% down
    const loanAmount = projectCost * 0.75;
    const interestRate = 0.07; // 7% conventional rate
    const term = 20; // 20 years

    const monthlyRate = interestRate / 12;
    const payments = term * 12;
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, payments)) / 
      (Math.pow(1 + monthlyRate, payments) - 1);

    return {
      projectCost,
      downPayment,
      loanAmount,
      interestRate,
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round((monthlyPayment * payments) - loanAmount),
      totalCost: Math.round(downPayment + (monthlyPayment * payments))
    };
  }

  calculateWithIncentives(projectCost, analysis) {
    // This is a simplified calculation - in practice, each incentive would need detailed modeling
    let adjustedCost = projectCost;
    let taxCredits = 0;
    let interestSavings = 0;

    Object.entries(analysis.incentives).forEach(([key, program]) => {
      if (program.available) {
        switch (key) {
          case 'historicTaxCredits':
            taxCredits += projectCost * 0.20; // 20% HTC
            break;
          case 'newMarketsTC':
            taxCredits += (projectCost * 0.25) * 0.39; // 39% of 25% equity
            break;
          case 'sba504':
            interestSavings += 50000; // Estimated annual savings
            break;
          case 'cpace':
            interestSavings += 25000; // Estimated annual savings
            break;
        }
      }
    });

    return {
      projectCost,
      taxCredits,
      interestSavings,
      netProjectCost: adjustedCost - taxCredits,
      estimatedROI: ((taxCredits + (interestSavings * 10)) / projectCost * 100).toFixed(1) + '%'
    };
  }

  compareScenarios(baseCase, withIncentives) {
    const savings = baseCase.totalCost - withIncentives.netProjectCost;
    const savingsPercentage = (savings / baseCase.totalCost * 100).toFixed(1);

    return {
      totalSavings: Math.round(savings),
      savingsPercentage: savingsPercentage + '%',
      paybackPeriod: savings > 0 ? Math.round((withIncentives.taxCredits || 0) / 50000) : 'N/A',
      recommendation: savings > 100000 ? 'Strongly Recommended' : 
                     savings > 50000 ? 'Recommended' : 'Consider Carefully'
    };
  }

  assessImplementationComplexity(analysis) {
    const complexPrograms = ['historicTaxCredits', 'newMarketsTC'];
    const availablePrograms = Object.entries(analysis.incentives)
      .filter(([, program]) => program.available)
      .map(([key]) => key);

    const hasComplexPrograms = availablePrograms.some(p => complexPrograms.includes(p));
    
    if (hasComplexPrograms && availablePrograms.length > 2) return 'High';
    if (hasComplexPrograms || availablePrograms.length > 1) return 'Medium';
    return 'Low';
  }

  estimateTimeToRealization(analysis) {
    const availablePrograms = Object.entries(analysis.incentives)
      .filter(([, program]) => program.available)
      .map(([key]) => key);

    const timeframes = {
      opportunityZones: 12,
      historicTaxCredits: 18,
      newMarketsTC: 12,
      cpace: 6,
      sba504: 6
    };

    const maxTime = Math.max(...availablePrograms.map(p => timeframes[p] || 6));
    
    if (maxTime >= 18) return '18+ months';
    if (maxTime >= 12) return '12-18 months';
    if (maxTime >= 6) return '6-12 months';
    return '3-6 months';
  }

  generateImplementationPlan(analysis) {
    return {
      phase1: 'Initial Planning and Applications (Months 1-3)',
      phase2: 'Approvals and Structuring (Months 4-9)',
      phase3: 'Implementation and Compliance (Months 10-18)',
      criticalPath: analysis.recommendations.slice(0, 3),
      keyMilestones: [
        'Complete initial applications',
        'Secure preliminary approvals',
        'Finalize financing structure',
        'Begin project implementation',
        'Achieve compliance milestones'
      ]
    };
  }

  generateRiskAssessment(analysis) {
    return {
      overallRisk: analysis.summary.riskLevel,
      specificRisks: [
        'Regulatory changes affecting incentive programs',
        'Market conditions impacting project viability',
        'Compliance requirements and ongoing obligations',
        'Timing coordination across multiple programs'
      ],
      mitigationStrategies: [
        'Engage experienced professionals early',
        'Maintain compliance documentation',
        'Monitor regulatory changes',
        'Build contingency plans'
      ]
    };
  }

  generateNextSteps(analysis) {
    const nextSteps = [];
    
    analysis.recommendations.forEach((rec, index) => {
      nextSteps.push({
        step: index + 1,
        priority: rec.priority,
        action: rec.action,
        timeline: rec.timeline,
        responsible: 'Property Owner/Development Team',
        dependencies: rec.requirements
      });
    });

    return nextSteps;
  }

  generateAppendices(analysis) {
    return {
      dataSourcesAndMethods: 'List of APIs and data sources used',
      regulatoryReferences: 'Links to relevant regulations and guidance',
      contactDirectory: 'Key contacts for each program',
      calculationMethodologies: 'Detailed calculation explanations',
      disclaimer: 'Important limitations and assumptions'
    };
  }

  // Helper methods for detailed calculations
  calculateProgramValue(key, data) {
    // Simplified value calculations - would be more sophisticated in production
    const estimates = {
      opportunityZones: 150000,
      historicTaxCredits: 200000,
      newMarketsTC: 390000,
      cpace: 50000,
      sba504: 75000
    };
    return estimates[key] || 0;
  }

  getApplicationProcess(key) {
    // Return program-specific application processes
    return `Detailed application process for ${this.getProgramName(key)}`;
  }

  getRelevantContacts(key, data) {
    // Return relevant contacts based on program and location
    return {
      primaryContact: 'Program administrator',
      secondaryContacts: ['Local agencies', 'Professional advisors']
    };
  }
}

export default CREIncentivesService;