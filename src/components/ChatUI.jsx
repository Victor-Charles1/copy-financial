import React, { useState, useRef, useEffect } from 'react';
import { Send, Building2, TrendingUp, MapPin, FileText } from 'lucide-react';

const ChatUI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hello! I'm your CRE Financial Incentives Assistant. I can help you discover tax credits, opportunity zones, and financing programs for commercial real estate properties. Just provide an address to get started!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate API processing delay
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput) => {
    // Simple address detection for demo
    const addressPattern = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|lane|ln|court|ct|place|pl)/i;
    const isAddress = addressPattern.test(userInput);

    let response = "";
    
    if (isAddress) {
      response = `🔍 Analyzing property at: ${userInput}

I'm checking for:
• Opportunity Zone eligibility
• Historic Tax Credits (HTC)
• New Markets Tax Credits (NMTC)
• C-PACE financing availability
• SBA-504 loan programs
• State and local incentives

⏳ Processing location data... This may take a moment.

*Note: This is a demo - in the full version, I would connect to live APIs to provide real incentive data and generate a comprehensive financial report.*`;
    } else {
      response = `I'd be happy to help you find financial incentives for commercial real estate! 

Please provide a specific property address, such as:
• "123 Main Street, Chicago, IL"
• "456 Business Ave, Austin, TX 78701"
• "789 Commerce Blvd, Miami, FL"

I can then analyze the location for various tax credits, financing programs, and incentives that might apply to your project.`;
    }

    return {
      id: Date.now() + 1,
      type: 'bot',
      content: response,
      timestamp: new Date()
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRE Financial Incentives</h1>
            <p className="text-sm text-gray-600">AI-powered commercial real estate analysis</p>
          </div>
          <div className="ml-auto flex space-x-2">
            <div className="flex items-center text-xs text-gray-500 bg-green-100 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'bot' && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">CRE Assistant</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                </div>
              )}
              
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">CRE Assistant</span>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Analyzing property data...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-200 bg-white">
        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setInputValue('123 Main Street, Chicago, IL 60601')}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>Sample Chicago Address</span>
          </button>
          <button
            onClick={() => setInputValue('What incentives are available for manufacturing facilities?')}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Manufacturing Incentives</span>
          </button>
          <button
            onClick={() => setInputValue('Tell me about Opportunity Zones')}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Opportunity Zones</span>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a commercial property address to analyze incentives..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 text-sm"
              rows={1}
              style={{
                minHeight: '44px',
                height: Math.min(Math.max(44, inputValue.split('\n').length * 20), 128) + 'px'
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatUI;