import React, { useEffect, useState, useRef } from 'react';
import { Contract, ComparisonResult, ChatMessage } from '../types';
import { compareContracts, queryComparisonDifference } from '../services/geminiService';
import { ArrowLeft, Trophy, AlertTriangle, ShieldCheck, Scale, Sparkles, Loader2, MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface CompareViewProps {
  contracts: Contract[];
  onBack: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({ contracts, onBack }) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDifference, setActiveDifference] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const result = await compareContracts(contracts);
        setComparison(result);
      } catch (e) {
        console.error("Comparison failed", e);
      } finally {
        setLoading(false);
      }
    };
    if (contracts.length > 0) {
        fetchComparison();
    }
  }, [contracts]);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative z-10 bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
                   <Scale className="w-12 h-12 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-2">Comparing Contracts</h2>
              <p className="text-slate-500">AI is analyzing {contracts.length} documents...</p>
          </div>
      );
  }

  if (!comparison) return <div>Failed to load comparison.</div>;

  const winner = contracts.find(c => c.id === comparison.recommendedId) || contracts[0];

  return (
    <div className="space-y-8 animate-slide-up relative">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-400 hover:text-indigo-400 transition-colors font-medium hover:-translate-x-1 duration-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Header / Winner Section */}
        <div className="lg:col-span-3 bg-gradient-to-r from-indigo-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
            <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-10 -translate-y-10">
                <Trophy className="w-64 h-64 text-white" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-indigo-300 font-semibold uppercase tracking-wider text-sm">
                    <Sparkles className="w-4 h-4" /> AI Recommendation
                </div>
                <h1 className="text-3xl font-bold mb-4">
                    The Safer Choice: <span className="underline decoration-indigo-400 underline-offset-4">{winner.fileName}</span>
                </h1>
                <p className="text-indigo-100 text-lg max-w-2xl leading-relaxed">
                    {comparison.reasoning}
                </p>
            </div>
        </div>

        {/* Contract Grid */}
        <div className="lg:col-span-3 relative">
            {/* VS Badge - Only show if exactly 2 contracts */}
            {contracts.length === 2 && (
                <div className="absolute left-1/2 top-8 -translate-x-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 bg-slate-900 rounded-full shadow-lg border-4 border-slate-800 font-black text-slate-500">
                    VS
                </div>
            )}
            
            <div className={`grid grid-cols-1 md:grid-cols-2 ${contracts.length > 2 ? 'lg:grid-cols-3' : ''} gap-8`}>
                {contracts.map(contract => (
                    <div 
                        key={contract.id}
                        className={`bg-slate-900 rounded-2xl p-6 border-2 transition-all ${
                            comparison.recommendedId === contract.id 
                            ? 'border-emerald-500/50 shadow-lg ring-4 ring-emerald-900/20' 
                            : 'border-slate-800'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-slate-200 truncate pr-4" title={contract.fileName}>{contract.fileName}</h3>
                            {comparison.recommendedId === contract.id && (
                                <span className="bg-emerald-900/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full flex items-center shrink-0 border border-emerald-900/50">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> Winner
                                </span>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Risk Score</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold text-slate-200">{contract.analysis?.riskScore}</span>
                                    <span className="text-sm text-slate-500 mb-1">/ 100</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${contract.analysis?.riskScore}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Overall Risk</div>
                                {contract.analysis && <RiskBadge level={contract.analysis.overallRisk} />}
                            </div>

                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Summary</div>
                                <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                                    {contract.analysis?.summary}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Key Differences */}
        <div className="lg:col-span-3">
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center">
                    <Scale className="w-5 h-5 mr-2 text-indigo-500" />
                    Key Differences & Insights
                </h3>
                <p className="text-slate-500 text-sm mb-6">Click on any difference below to get a detailed briefing and ask questions.</p>
                <div className="grid md:grid-cols-2 gap-4">
                    {comparison.keyDifferences.map((diff, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setActiveDifference(diff)}
                            className="flex items-start text-left p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:shadow-md hover:bg-slate-800 transition-all group"
                        >
                            <div className="bg-slate-900 p-2 rounded-full border border-slate-700 group-hover:border-indigo-500/30 mr-3 shrink-0 mt-0.5 shadow-sm">
                                <MessageCircle className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed group-hover:text-slate-100">{diff}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Difference Detail Modal */}
      {activeDifference && (
          <DifferenceChatModal 
            difference={activeDifference}
            contracts={contracts}
            onClose={() => setActiveDifference(null)}
          />
      )}
    </div>
  );
};

interface DifferenceChatModalProps {
    difference: string;
    contracts: Contract[];
    onClose: () => void;
}

const DifferenceChatModal: React.FC<DifferenceChatModalProps> = ({ difference, contracts, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasFetchedBrief = useRef(false);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Initial Briefing
    useEffect(() => {
        if (!hasFetchedBrief.current) {
            hasFetchedBrief.current = true;
            setIsLoading(true);
            
            // Initial phantom call to get the briefing
            queryComparisonDifference([], "Please brief me on this difference and what it means for me in simple terms.", contracts, difference)
                .then(response => {
                    setMessages([{
                        role: 'model',
                        text: response,
                        timestamp: Date.now()
                    }]);
                })
                .catch(err => {
                    setMessages([{
                        role: 'model',
                        text: "Sorry, I couldn't generate the briefing right now.",
                        timestamp: Date.now()
                    }]);
                })
                .finally(() => setIsLoading(false));
        }
    }, [difference, contracts]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        const response = await queryComparisonDifference(messages, input, contracts, difference);
        
        setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative z-10 animate-scale-in border border-slate-700/50">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-sm uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4" /> Difference Insight
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 leading-snug">{difference}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900">
                    {messages.length === 0 && isLoading && (
                         <div className="flex flex-col items-center justify-center h-40 text-slate-500 space-y-3">
                             <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                             <p className="text-sm font-medium">Generating briefing...</p>
                         </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 bg-indigo-900/50 rounded-full flex items-center justify-center mr-3 mt-1 shrink-0">
                                    <Bot className="w-5 h-5 text-indigo-400" />
                                </div>
                            )}
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center ml-3 mt-1 shrink-0">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {isLoading && messages.length > 0 && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 bg-indigo-900/50 rounded-full flex items-center justify-center mr-3 shrink-0">
                                <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex space-x-1.5 items-center h-12">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 rounded-b-2xl">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask a follow-up question..."
                            className="flex-1 px-4 py-3 bg-slate-950 text-slate-100 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all placeholder-slate-500"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};