// src/hooks/usePropertyAnalysis.js
import { useState, useCallback, useRef } from 'react';
import CREIncentivesService from '../services/CREIncentivesService.js';
import { ValidationError, APIError, NetworkError } from '../services/errors/index.js';

export function usePropertyAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  
  const serviceRef = useRef(new CREIncentivesService());
  const abortControllerRef = useRef(null);

  const analyzeProperty = useCallback(async (address, projectDetails = {}) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setReport(null);

    try {
      const result = await serviceRef.current.analyzeProperty(address, projectDetails);
      
      if (abortControllerRef.current.signal.aborted) {
        return; // Request was cancelled
      }

      setAnalysis(result);
      
      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        address,
        projectDetails,
        result,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]); // Keep last 10 analyses

      return result;
    } catch (err) {
      if (abortControllerRef.current.signal.aborted) {
        return; // Request was cancelled
      }

      const errorMessage = formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const generateReport = useCallback(async (analysisData = null, projectDetails = {}) => {
    const analysisToUse = analysisData || analysis;
    
    if (!analysisToUse) {
      throw new ValidationError('No analysis data available for report generation');
    }

    setLoading(true);
    setError(null);

    try {
      const reportData = await serviceRef.current.generateFinancialReport(analysisToUse, projectDetails);
      setReport(reportData);
      return reportData;
    } catch (err) {
      const errorMessage = formatError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [analysis]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResults = useCallback(() => {
    setAnalysis(null);
    setReport(null);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getHistoryItem = useCallback((id) => {
    return history.find(item => item.id === id);
  }, [history]);

  const rerunAnalysis = useCallback(async (historyId) => {
    const historyItem = getHistoryItem(historyId);
    if (!historyItem) {
      throw new ValidationError('History item not found');
    }

    return analyzeProperty(historyItem.address, historyItem.projectDetails);
  }, [getHistoryItem, analyzeProperty]);

  // Utility function to get summary statistics
  const getSummaryStats = useCallback(() => {
    if (!analysis) return null;

    const { incentives, summary } = analysis;
    const availablePrograms = Object.values(incentives).filter(p => p.available).length;
    const totalEstimatedValue = summary?.estimatedTotalValue || 0;

    return {
      availablePrograms,
      totalEstimatedValue,
      riskLevel: summary?.riskLevel || 'Unknown',
      primaryRecommendation: summary?.primaryRecommendation || 'None available',
      hasStackingOpportunities: (analysis.stackingOpportunities?.length || 0) > 0
    };
  }, [analysis]);

  // Export data functions
  const exportAnalysis = useCallback((format = 'json') => {
    if (!analysis) return null;

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(analysis, null, 2);
      case 'csv':
        return convertToCSV(analysis);
      default:
        return JSON.stringify(analysis, null, 2);
    }
  }, [analysis]);

  const exportReport = useCallback((format = 'json') => {
    if (!report) return null;

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(report, null, 2);
      default:
        return JSON.stringify(report, null, 2);
    }
  }, [report]);

  return {
    // State
    loading,
    error,
    analysis,
    report,
    history,

    // Actions
    analyzeProperty,
    generateReport,
    cancelRequest,
    clearError,
    clearResults,
    clearHistory,
    rerunAnalysis,

    // Utilities
    getSummaryStats,
    getHistoryItem,
    exportAnalysis,
    exportReport,

    // Computed values
    hasResults: !!analysis,
    hasReport: !!report,
    hasError: !!error,
    canGenerateReport: !!analysis && !loading,
    historyCount: history.length
  };
}

// Helper function to format errors for display
function formatError(error) {
  if (error instanceof ValidationError) {
    return {
      type: 'validation',
      message: error.message,
      field: error.field,
      severity: 'warning'
    };
  }

  if (error instanceof APIError) {
    return {
      type: 'api',
      message: error.message,
      status: error.status,
      url: error.url,
      severity: 'error'
    };
  }

  if (error instanceof NetworkError) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection and try again.',
      severity: 'error'
    };
  }

  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    severity: 'error'
  };
}

// Helper function to convert analysis to CSV
function convertToCSV(analysis) {
  const rows = [];
  
  // Header
  rows.push('Program,Available,Status,Estimated Value,Notes');
  
  // Data rows
  Object.entries(analysis.incentives).forEach(([key, program]) => {
    const programName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    const available = program.available ? 'Yes' : 'No';
    const status = program.status;
    const estimatedValue = program.data?.benefits ? 'Available' : 'N/A';
    const notes = program.error || 'See detailed analysis';
    
    rows.push(`"${programName}","${available}","${status}","${estimatedValue}","${notes}"`);
  });

  return rows.join('\n');
}

export default usePropertyAnalysis;