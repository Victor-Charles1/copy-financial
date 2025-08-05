import React, { useState, useRef, useEffect } from 'react';
import { usePropertyAnalysis } from '../hooks/usePropertyAnalysis';
import { 
  MessageCircle, 
  Send, 
  MapPin, 
  DollarSign, 
  FileText, 
  Download,
  AlertCircle,
  CheckCircle,
  Building,
  TrendingUp,
  Clock,
  Users,
  X,
  RefreshCw
} from 'lucide-react';

const ChatUI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your Commercial Real Estate Financial Incentives Assistant. I can help you analyze properties for available tax credits, financing programs, and other financial incentives. Please provide a property address to get started.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [projectDetails, setProjectDetails] = useState({
    projectCost: '',
    business: {
      employeeCount: '',
      averageAnnualReceipts: '',
      industry: '',
      businessAge: '',
      ownerEquity: '',
      ownerOccupancy: ''
    }
  });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    loading,
    error,
    analysis,
    report,
    analyzeProperty,
    generateReport,
    clearError,
    getSummaryStats,
    exportAnalysis,
    exportReport
  } = usePropertyAnalysis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (analysis) {
      addAssistantMessage(formatAnalysisResults(analysis));
    }
  }, [analysis]);

  useEffect(() => {
    if (error) {
      addAssistantMessage(formatErrorMessage(error));
    }
  }, [error]);

  const addUserMessage = (content) => {
    const newMessage = {
      id: Date.now(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addAssistantMessage = (content) => {
    setIsTyping(true);
    setTimeout(() => {
      const newMessage = {
        id: Date.now(),
        type: 'assistant',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userInput = inputValue.trim();
    addUserMessage(userInput);
    setInputValue('');
    clearError();

    // Check if input looks like an address
    if (isAddressLike(userInput)) {
      try {
        await analyzeProperty(userInput, convertProjectDetails(projectDetails));
      } catch (error) {
        console.error('Analysis failed:', error);
      }
    } else {
      // Handle other types of queries
      handleGeneralQuery(userInput);
    }
  };

  const isAddressLike = (input) => {
    const addressPattern = /\d+.*[a-zA-Z].*[a-zA-Z]/;
    return addressPattern.test(input) && input.length > 10;
  };

  const convertProjectDetails = (details) => {
    return {
      projectCost: parseFloat(details.projectCost) || 0,
      business: {
        employeeCount: parseInt(details.business.employeeCount) || 0,
        averageAnnualReceipts: parseFloat(details.business.averageAnnualReceipts) || 0,
        industry: details.business.industry || 'other',
        businessAge: parseInt(details.business.businessAge) || 0,
        ownerEquity: parseFloat(details.business.ownerEquity) || 0,
        ownerOccupancy: parseFloat(details.business.ownerOccupancy) || 51
      }
    };
  };

  const handleGeneralQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('help') || lowerQuery.includes('how')) {
      addAssistantMessage({
        type: 'help',
        content: 'I can help you analyze commercial real estate properties for financial incentives. Here\'s what I can do:\n\n• **Opportunity Zones** - Check if a property qualifies for OZ tax benefits\n• **Historic Tax Credits** - Identify properties eligible for 20% federal tax credits\n• **New Markets Tax Credits** - Find NMTC opportunities in low-income communities\n• **C-PACE Financing** - Locate energy efficiency financing programs\n• **SBA 504 Loans** - Assess eligibility for low down payment SBA financing\n\nTo get started, simply provide a property address like "123 Main St, City, State" and I\'ll analyze all available programs.'
      });
    } else if (lowerQuery.includes('report') && analysis) {
      handleGenerateReport();
    } else if (lowerQuery.includes('example') || lowerQuery.includes('sample')) {
      addAssistantMessage({
        type: 'example',
        content: 'Here are some example addresses you can try:\n\n• "1600 Pennsylvania Avenue, Washington, DC"\n• "123 Main Street, Detroit, MI"\n• "456 Market Street, San Francisco, CA"\n\nJust paste any U.S. commercial property address and I\'ll analyze it for available incentives!'
      });
    } else {
      addAssistantMessage({
        type: 'clarification',
        content: 'I\'m not sure I understand. Could you please provide a property address for analysis, or ask me about specific incentive programs? You can also type "help" for more information about what I can do.'
      });
    }
  };

  const handleGenerateReport = async () => {
    if (!analysis) return;
    
    try {
      addAssistantMessage({
        type: 'info',
        content: 'Generating comprehensive financial report...'
      });
      
      await generateReport(analysis, convertProjectDetails(projectDetails));
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  };

  const formatAnalysisResults = (analysisData) => {
    const stats = getSummaryStats();
    
    return {
      type: 'analysis',
      data: analysisData,
      stats,
      content: `Analysis complete for **${analysisData.address}**! Found ${stats.availablePrograms} available incentive programs.`
    };
  };

  const formatErrorMessage = (errorData) => {
    return {
      type: 'error',
      content: `❌ ${errorData.message}`,
      severity: errorData.severity
    };
  };

  const handleDownload = (type, format = 'json') => {
    let data, filename;
    
    if (type === 'analysis' && analysis) {
      data = exportAnalysis(format);
      filename = `property-analysis-${new Date().toISOString().split('T')[0]}.${format}`;
    } else if (type === 'report' && report) {
      data = exportReport(format);
      filename = `financial-report-${new Date().toISOString().split('T')[0]}.${format}`;
    }
    
    if (data) {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CRE Financial Incentives Assistant</h1>
              <p className="text-sm text-gray-600">Commercial Real Estate Financing & Tax Credits Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Project Details
            </button>
            {analysis && (
              <button
                onClick={() => handleDownload('analysis')}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Project Details Form */}
      {showProjectForm && (
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Project Details (Optional)</h3>
              <button
                onClick={() => setShowProjectForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Cost ($)
                </label>
                <input
                  type="number"
                  value={projectDetails.projectCost}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    projectCost: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Count
                </label>
                <input
                  type="number"
                  value={projectDetails.business.employeeCount}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    business: { ...prev.business, employeeCount: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Revenue ($)
                </label>
                <input
                  type="number"
                  value={projectDetails.business.averageAnnualReceipts}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    business: { ...prev.business, averageAnnualReceipts: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={projectDetails.business.industry}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    business: { ...prev.business, industry: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Industry</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="construction">Construction</option>
                  <option value="professional_services">Professional Services</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="technology">Technology</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Age (years)
                </label>
                <input
                  type="number"
                  value={projectDetails.business.businessAge}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    business: { ...prev.business, businessAge: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Occupancy (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={projectDetails.business.ownerOccupancy}
                  onChange={(e) => setProjectDetails(prev => ({
                    ...prev,
                    business: { ...prev.business, ownerOccupancy: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="51"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isTyping && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter a property address (e.g., '123 Main St, City, State') or ask a question..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>{loading ? 'Analyzing...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-lg px-4 py-3 shadow-sm`}>
        {typeof message.content === 'string' ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <MessageContent content={message.content} />
        )}
        
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

const MessageContent = ({ content }) => {
  if (content.type === 'analysis') {
    return <AnalysisResults data={content.data} stats={content.stats} />;
  }
  
  if (content.type === 'error') {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span>{content.content}</span>
      </div>
    );
  }
  
  if (content.type === 'help' || content.type === 'example' || content.type === 'clarification') {
    return (
      <div className="prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{
          __html: content.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        }} />
      </div>
    );
  }
  
  return <div>{content.content}</div>;
};

const AnalysisResults = ({ data, stats }) => {
  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <h3 className="font-semibold text-lg flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span>Property Analysis Results</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">{data.address}</p>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Available Programs</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">{stats.availablePrograms}</div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Est. Value</span>
          </div>
          <div className="text-lg font-bold text-blue-900 mt-1">
            ${stats.totalEstimatedValue.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Risk Level</span>
          </div>
          <div className="text-lg font-bold text-yellow-900 mt-1">{stats.riskLevel}</div>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Stacking</span>
          </div>
          <div className="text-lg font-bold text-purple-900 mt-1">
            {stats.hasStackingOpportunities ? 'Available' : 'Limited'}
          </div>
        </div>
      </div>
      
      {/* Available Programs */}
      <div>
        <h4 className="font-medium mb-2">Available Incentive Programs:</h4>
        <div className="space-y-2">
          {Object.entries(data.incentives).map(([key, program]) => (
            <ProgramCard key={key} program={program} programKey={key} />
          ))}
        </div>
      </div>
      
      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Top Recommendations:</h4>
          <div className="space-y-2">
            {data.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority} Priority
                  </span>
                  <span className="font-medium">{rec.program}</span>
                </div>
                <p className="text-sm text-gray-600">{rec.action}</p>
                <p className="text-xs text-gray-500 mt-1">Timeline: {rec.timeline}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="pt-3 border-t">
        <p className="text-sm text-gray-600">
          💡 Type "report" to generate a comprehensive financial analysis report, or ask me about specific programs for more details.
        </p>
      </div>
    </div>
  );
};

const ProgramCard = ({ program, programKey }) => {
  const programNames = {
    opportunityZones: 'Opportunity Zones',
    historicTaxCredits: 'Historic Tax Credits',
    newMarketsTC: 'New Markets Tax Credits',
    cpace: 'C-PACE Financing',
    sba504: 'SBA 504 Loans'
  };
  
  const name = programNames[programKey] || programKey;
  const available = program.available;
  const status = program.status;
  
  return (
    <div className={`p-3 rounded-lg border-l-4 ${
      available ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {available ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <X className="h-4 w-4 text-gray-400" />
          )}
          <span className="font-medium">{name}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {available ? 'Available' : 'Not Available'}
        </span>
      </div>
      
      {program.error && (
        <p className="text-sm text-red-600 mt-1">{program.error}</p>
      )}
    </div>
  );
};

export default ChatUI;