import React, { useState } from 'react';
import { Clause, RiskLevel } from '../types';
import { RiskBadge } from './RiskBadge';
import { AlertTriangle, HelpCircle, MessageCircle, ChevronDown, ChevronUp, User, Scale } from 'lucide-react';
import { askClauseQuestion } from '../services/geminiService';

interface ClauseCardProps {
  clause: Clause;
  onUpdate?: (updatedClause: Clause) => void;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // Helper to highlight keywords
  const getHighlightedText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    // Create a regex from the keywords (escaping regex chars)
    const regex = new RegExp(`(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    const highlightClass = clause.riskLevel === RiskLevel.HIGH 
        ? 'bg-red-500/20 text-red-200 border-b-2 border-red-500/50' 
        : clause.riskLevel === RiskLevel.MEDIUM 
            ? 'bg-amber-500/20 text-amber-200 border-b-2 border-amber-500/50' 
            : 'bg-emerald-500/20 text-emerald-200 border-b-2 border-emerald-500/50';

    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <span key={i} className={`${highlightClass} font-semibold px-0.5 rounded-sm`}>{part}</span> : part
    );
  };

  const getContainerStyles = () => {
     switch (clause.riskLevel) {
         case RiskLevel.HIGH: return 'bg-red-950/20 border-red-900/30';
         case RiskLevel.MEDIUM: return 'bg-amber-950/20 border-amber-900/30';
         default: return 'bg-slate-950 border-slate-800';
     }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoadingAnswer(true);
    
    const currentQuestion = question;
    const result = await askClauseQuestion(clause.text, currentQuestion);
    
    setLoadingAnswer(false);
    setQuestion('');

    if (onUpdate) {
        const newHistoryItem = {
            question: currentQuestion,
            answer: result,
            timestamp: Date.now()
        };

        const updatedClause = {
            ...clause,
            conversationHistory: [...(clause.conversationHistory || []), newHistoryItem]
        };

        onUpdate(updatedClause);
    }
  };

  return (
    <div className={`bg-slate-900 rounded-xl shadow-sm border transition-all duration-200 ${expanded ? 'ring-2 ring-indigo-500/20 border-indigo-500/30' : 'border-slate-800 hover:border-indigo-500/50'}`}>
      <div 
        className="p-5 cursor-pointer flex justify-between items-start"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <RiskBadge level={clause.riskLevel} size="sm" />
            <div className="text-slate-500">
               {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
          <h4 className="font-semibold text-slate-100 mb-2">{clause.explanation}</h4>
          
          {/* Preview Text */}
          <div className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
             <span className="italic">"</span>
             {getHighlightedText(clause.text, clause.riskyKeywords)}
             <span className="italic">"</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-800 pt-4 bg-slate-950/30 rounded-b-xl">
          {/* Detailed Content */}
          <div className="mb-4">
            <h5 className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">Original Clause</h5>
            <div className={`p-4 rounded-lg border text-sm leading-relaxed text-slate-300 italic ${getContainerStyles()}`}>
               "{getHighlightedText(clause.text, clause.riskyKeywords)}"
            </div>
          </div>

          <div className="mb-6">
             <div className="flex items-start bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm">
                <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                    clause.riskLevel === RiskLevel.HIGH ? 'text-red-500' : 
                    clause.riskLevel === RiskLevel.MEDIUM ? 'text-amber-500' : 'text-emerald-500'
                }`} />
                <div>
                   <h5 className="font-semibold text-sm text-slate-200">Risk Analysis</h5>
                   <p className="text-slate-400 text-sm mt-1">{clause.reason}</p>
                </div>
             </div>
          </div>

          {/* Q&A Section */}
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <h5 className="text-sm font-semibold text-slate-200 mb-3 flex items-center">
              <HelpCircle className="w-4 h-4 mr-2 text-indigo-500" />
              Ask about this clause
            </h5>
            
            {/* History */}
            {clause.conversationHistory && clause.conversationHistory.length > 0 && (
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {clause.conversationHistory.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-start gap-2 justify-end">
                                <div className="bg-indigo-900/50 text-indigo-200 px-3 py-2 rounded-lg rounded-tr-none text-sm max-w-[85%] border border-indigo-500/20">
                                    {item.question}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                                   <User className="w-3 h-3 text-slate-400" />
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                   <MessageCircle className="w-3 h-3 text-white" />
                                </div>
                                <div className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg rounded-tl-none text-sm max-w-[85%] border border-slate-700">
                                    {item.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
              <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What does this mean in simple terms?"
                className="flex-1 text-sm px-3 py-2 bg-slate-950 text-slate-100 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <button 
                onClick={handleAsk}
                disabled={loadingAnswer || !question.trim()}
                className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>

            {loadingAnswer && (
              <p className="text-xs text-slate-500 mt-2 animate-pulse flex items-center">
                 <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1 animate-bounce"></span>
                 <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1 animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              </p>
            )}
          </div>

          {/* Legal Suggestion Banner */}
          <div className="mt-4 p-3 bg-indigo-900/20 text-indigo-300 text-sm rounded-lg flex items-start border border-indigo-500/20">
             <Scale className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
             <span className="font-medium">Suggestion: If this looks serious, consult a lawyer.</span>
          </div>

        </div>
      )}
    </div>
  );
};