// src/services/CREIncentivesService.js
import OpportunityZonesService from './api/OpportunityZonesService.js';
import HistoricTaxCreditsService from './api/HistoricTaxCreditsService.js';
import SBA504Service from './api/SBA504Service.js';

export default class CREIncentivesService {
   
        constructor() {
          this.ozService = new OpportunityZonesService();
          this.htcService = new HistoricTaxCreditsService();
          this.sba504Service = new SBA504Service();
          
          // Service health tracking
          this.serviceHealth = new Map();
          this.lastHealthCheck = null;
        }
      
        async analyzeProperty(address,businessData) {
          const startTime = Date.now();
          const sba504Result = await this.sba504Service.checkSBA504Eligibility(businessData);
          console.log(`🏢 Starting comprehensive property analysis: ${address}`);
          
          try {
            const validatedAddress = this.ozService.validateAddress(address);
            
            // Run analyses in parallel where possible
            const [ozResult, htcResult] = await Promise.allSettled([
              this.ozService.checkOpportunityZone(validatedAddress),
              this.htcService.checkHistoricStatus(validatedAddress)
            ]);
      
            const analysis = {
              success: true,
              address: validatedAddress,
              analysisTime: Date.now() - startTime,
              opportunityZone: ozResult.status === 'fulfilled' ? ozResult.value : { success: false, error: ozResult.reason },
              historicTaxCredits: htcResult.status === 'fulfilled' ? htcResult.value : { success: false, error: htcResult.reason },
              recommendations: this.generateRecommendations(ozResult.value, htcResult.value),
              timestamp: new Date().toISOString()
            };
      
            console.log(`✅ Analysis completed in ${analysis.analysisTime}ms`);
            return analysis;
      
          } catch (error) {
            console.error('Property analysis failed:', error);
            
            return {
              success: false,
              address: address,
              error: {
                type: error.name,
                message: error.message,
                timestamp: new Date().toISOString()
              },
              analysisTime: Date.now() - startTime
            };
          }
        }
      
        generateRecommendations(ozResult, htcResult) {
          const recommendations = [];
          
          if (ozResult?.success && ozResult.isOpportunityZone) {
            recommendations.push({
              type: 'opportunity_zone',
              priority: 'high',
              title: 'Opportunity Zone Investment',
              description: 'This property qualifies for significant tax benefits through Opportunity Zone investment.',
              potentialSavings: 'Up to 15% capital gains reduction + tax-free growth',
              nextSteps: ['Establish Qualified Opportunity Fund', 'Structure investment within 180 days']
            });
          }
          
          if (htcResult?.success && htcResult.isHistoric) {
            recommendations.push({
              type: 'historic_tax_credits',
              priority: 'high',
              title: 'Historic Tax Credits',
              description: 'Property may qualify for Historic Rehabilitation Tax Credits.',
              potentialSavings: `${htcResult.creditPercentage}% federal tax credit`,
              nextSteps: ['Obtain historic certification', 'Develop rehabilitation plan']
            });
          }
          
          return recommendations;
        }
      
        async healthCheck() {
          const healthResults = {
            overall: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
          };
      
          try {
            // Test each service with a simple request
            const testAddress = '1600 Pennsylvania Avenue, Washington, DC 20500';
            
            // Check OZ Service
            try {
              await this.ozService.makeRequest(`${this.ozService.censusGeocodeApi}?address=${encodeURIComponent(testAddress)}&format=json&benchmark=Public_AR_Current&vintage=Current_Current`);
              healthResults.services.opportunityZones = 'healthy';
            } catch (error) {
              healthResults.services.opportunityZones = 'unhealthy';
              healthResults.overall = 'degraded';
            }
      
            // Check HTC Service (would check actual endpoint)
            healthResults.services.historicTaxCredits = 'healthy'; // Simulated
            
          } catch (error) {
            healthResults.overall = 'unhealthy';
          }
      
          this.lastHealthCheck = healthResults;
          return healthResults;
        }
      
        clearAllCaches() {
          this.ozService.clearCache();
          this.htcService.clearCache();
          console.log('🗑️ All service caches cleared');
        }
      }
      
      // Export the main service
      //export default CREIncentivesAPIService;
