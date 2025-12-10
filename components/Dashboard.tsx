import React, { useEffect, useState } from 'react';
import { Contract, User, RecentAnalysis, RiskLevel } from '../types';
import { storageService } from '../services/storageService';
import { FileText, Plus, ChevronRight, Clock, Search, ArrowUpDown, History, Trash2, CheckSquare, Square, SplitSquareHorizontal } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface DashboardProps {
  user: User;
  onNewUpload: () => void;
  onSelectContract: (contract: Contract) => void;
  onCompare: (contracts: Contract[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNewUpload, onSelectContract, onCompare }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const MAX_COMPARE = 3;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Load user contracts
      const data = await storageService.getContracts(user.id);
      setContracts(data);
      
      // Load recent analyses cache
      const recent = storageService.getRecentAnalyses();
      setRecentAnalyses(recent);
      
      setLoading(false);
    };
    loadData();
  }, [user.id]);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your local analysis history?')) {
        storageService.clearRecentAnalyses();
        setRecentAnalyses([]);
    }
  };

  const handleSelectRecent = (recent: RecentAnalysis) => {
    const contract: Contract = {
        id: recent.id,
        userId: user.id,
        fileName: recent.fileName || recent.name,
        uploadDate: new Date(recent.createdAt).getTime(),
        status: 'analyzed',
        analysis: {
            summary: Array.isArray(recent.summary) ? recent.summary.join('\n') : recent.summary,
            overallRisk: recent.riskSummary as RiskLevel,
            riskScore: recent.riskScore,
            clauses: recent.clauses,
            fullText: recent.rawText
        },
    };
    onSelectContract(contract);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
        setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
        if (selectedIds.length < MAX_COMPARE) {
            setSelectedIds(prev => [...prev, id]);
        }
    }
  };

  const handleCompareClick = () => {
      if (selectedIds.length >= 2) {
          const selectedContracts = contracts.filter(c => selectedIds.includes(c.id));
          if (selectedContracts.length >= 2) {
              onCompare(selectedContracts);
          }
      }
  };

  const filteredContracts = contracts
    .filter(contract => 
      contract.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.analysis && contract.analysis.summary.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.uploadDate - a.uploadDate;
        case 'oldest':
          return a.uploadDate - b.uploadDate;
        case 'risk_high':
          return (b.analysis?.riskScore || 0) - (a.analysis?.riskScore || 0);
        case 'risk_low':
          return (a.analysis?.riskScore || 0) - (b.analysis?.riskScore || 0);
        case 'name_asc':
          return a.fileName.localeCompare(b.fileName);
        case 'name_desc':
          return b.fileName.localeCompare(a.fileName);
        default:
          return b.uploadDate - a.uploadDate;
      }
    });

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 animate-slide-down">
        <div>
           <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Your Contracts</h1>
           <p className="text-slate-400 mt-1 font-medium">Manage, review, and compare your documents.</p>
        </div>
        <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
                 <button 
                    onClick={handleCompareClick}
                    disabled={selectedIds.length < 2}
                    className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed animate-scale-in"
                 >
                    <SplitSquareHorizontal className="w-5 h-5 mr-2" /> 
                    Compare ({selectedIds.length}/{MAX_COMPARE})
                 </button>
            )}
            <button 
            onClick={onNewUpload}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:-translate-y-0.5 shrink-0"
            >
            <Plus className="w-5 h-5 mr-2" /> New Analysis
            </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {/* Search Bar */}
        <div className="relative flex-grow group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-all hover:border-slate-600"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort Filter */}
        <div className="relative min-w-[180px]">
           <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none w-full bg-slate-900 border border-slate-700 text-slate-300 py-3 pl-4 pr-10 rounded-xl leading-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm cursor-pointer hover:border-slate-600 transition-colors"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="risk_high">Risk: High to Low</option>
              <option value="risk_low">Risk: Low to High</option>
              <option value="name_asc">Name: A-Z</option>
              <option value="name_desc">Name: Z-A</option>
           </select>
           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ArrowUpDown className="h-4 w-4" />
           </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-xl animate-pulse shadow-sm"></div>
           ))}
        </div>
      ) : (
        <div className="space-y-10">
            {/* Recent Analyses Section (Local Cache) */}
            {recentAnalyses.length > 0 && (
                <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center justify-between mb-4">
                         <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-slate-200 flex items-center">
                                <History className="w-5 h-5 mr-2 text-indigo-500" />
                                Recent Analyses
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Stored locally. Clearing cache will remove this history.</p>
                         </div>
                         <button 
                            onClick={handleClearHistory}
                            className="text-xs text-red-500 hover:text-red-400 flex items-center font-medium px-3 py-1.5 rounded-lg hover:bg-red-900/10 transition-colors"
                         >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear history
                         </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentAnalyses.map((recent, index) => (
                            <div 
                                key={recent.id}
                                onClick={() => handleSelectRecent(recent)}
                                className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-4 hover:border-indigo-500/50 hover:shadow-md cursor-pointer transition-all group hover-lift animate-scale-in"
                                style={{animationDelay: `${index * 50}ms`}}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${recent.sourceType === 'file' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                                        {recent.sourceType === 'file' ? 'From File' : 'From Text'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                        {new Date(recent.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <h3 className="font-semibold text-slate-200 truncate mb-1" title={recent.name}>{recent.name}</h3>
                                <div className="flex items-center gap-2 mt-3">
                                    <RiskBadge level={recent.riskSummary as RiskLevel} size="sm" />
                                    <div className="text-xs font-semibold text-slate-500">Score: {recent.riskScore}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Saved Contracts */}
            <div className="animate-slide-up" style={{animationDelay: '0.3s'}}>
                <h2 className="text-lg font-bold text-slate-200 mb-4">Saved Documents</h2>
                {filteredContracts.length === 0 ? (
                    contracts.length === 0 ? (
                        <div className="text-center py-16 bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/30 transition-colors">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500 group-hover:text-indigo-400 transition-colors">
                            <FileText className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-200">No contracts yet</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Upload your first contract to get AI-powered insights and risk analysis.</p>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-slate-200 font-medium">No results found</h3>
                            <p className="text-slate-500 mt-1">No contracts match "{searchQuery}"</p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContracts.map((contract, index) => {
                        const isSelected = selectedIds.includes(contract.id);
                        return (
                        <div 
                            key={contract.id} 
                            onClick={() => onSelectContract(contract)}
                            className={`bg-slate-900 p-6 rounded-xl shadow-sm border cursor-pointer group flex flex-col h-full hover-lift animate-slide-up relative
                                ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-indigo-500/30'}
                            `}
                            style={{animationDelay: `${index * 50 + 200}ms`}}
                        >
                        {/* Checkbox for Compare */}
                        <div 
                            onClick={(e) => toggleSelection(e, contract.id)}
                            className={`absolute top-4 right-4 z-10 transition-opacity duration-200 
                                ${selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                        >
                            {isSelected ? (
                                <CheckSquare className="w-6 h-6 text-indigo-500" fill="currentColor" color="white" />
                            ) : (
                                <Square className="w-6 h-6 text-slate-600 hover:text-indigo-400" />
                            )}
                        </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-indigo-900/30 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-indigo-500/30">
                                <FileText className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                            </div>
                            {contract.analysis && (
                            <RiskBadge level={contract.analysis.overallRisk} size="sm" />
                            )}
                        </div>
                        
                        <h3 className="font-semibold text-slate-100 mb-2 truncate pr-8" title={contract.fileName}>
                            {contract.fileName}
                        </h3>
                        
                        {contract.analysis && (
                            <p className="text-slate-400 text-sm line-clamp-2 flex-grow">
                            {contract.analysis.summary}
                            </p>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(contract.uploadDate).toLocaleDateString()}
                            </span>
                            <span className="group-hover:translate-x-1 transition-transform duration-300 text-indigo-400 opacity-0 group-hover:opacity-100 flex items-center font-medium">
                                View Analysis <ChevronRight className="w-4 h-4 ml-1" />
                            </span>
                        </div>
                        </div>
                    )})}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};