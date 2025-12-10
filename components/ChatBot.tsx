import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2 } from 'lucide-react';
import { ChatMessage, Contract } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatBotProps {
  contract: Contract | null;
}

export const ChatBot: React.FC<ChatBotProps> = ({ contract }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Hi! I'm your LegalLens assistant. I can help you understand legal terms or answer questions about your documents.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Reset chat when contract changes, optionally
  useEffect(() => {
    if (contract) {
        setMessages(prev => [
            ...prev, 
            {
                role: 'model',
                text: `I see you're looking at "${contract.fileName}". Ask me anything about this contract!`,
                timestamp: Date.now()
            }
        ]);
        if (!isOpen) setIsOpen(true);
    }
  }, [contract?.id]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context
    let context = '';
    if (contract && contract.analysis) {
        context = `
        Filename: ${contract.fileName}
        Summary: ${contract.analysis.summary}
        Overall Risk: ${contract.analysis.overallRisk}
        Full Text: ${contract.analysis.fullText ? contract.analysis.fullText.substring(0, 20000) : 'Not available'}
        `;
    }

    // Filter history for API (last 10 messages to save tokens/context)
    const historyForApi = messages.slice(-10);

    const responseText = await sendChatMessage(historyForApi, userMsg.text, context);

    const botMsg: ChatMessage = {
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const toggleOpen = () => {
      setIsOpen(!isOpen);
      setIsMinimized(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-[100] flex items-center justify-center ring-4 ring-indigo-900/50"
        title="Open Support Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div 
        className={`fixed bottom-6 right-6 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-[100] transition-all duration-300 flex flex-col
        ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px] max-h-[80vh]'}
        `}
    >
      {/* Header */}
      <div 
        className="bg-indigo-700 p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center text-white">
          <Bot className="w-5 h-5 mr-2" />
          <span className="font-semibold">LegalLens Assistant</span>
        </div>
        <div className="flex items-center space-x-2 text-indigo-100">
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-slate-900 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a legal question..."
                className="flex-1 px-4 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};