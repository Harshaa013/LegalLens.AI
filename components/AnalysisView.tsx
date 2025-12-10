import React, { useState, useEffect } from 'react';
import { Contract, Clause } from '../types';
import { ClauseCard } from './ClauseCard';
import { RiskBadge } from './RiskBadge';
import { FileText, ArrowLeft, PieChart, AlertOctagon, Download, Eye, ShieldAlert, FileDown } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { jsPDF } from 'jspdf';

interface AnalysisViewProps {
  contract: Contract;
  onBack: () => void;
  onContractUpdate?: (contract: Contract) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ contract, onBack, onContractUpdate }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'text'>('analysis');
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    if (contract.analysis?.riskScore !== undefined) {
      const target = contract.analysis.riskScore;
      const duration = 1500;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setDisplayedScore(target);
          clearInterval(timer);
        } else {
          setDisplayedScore(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [contract.analysis?.riskScore]);

  if (!contract.analysis) return <div>No analysis available.</div>;

  const { summary, overallRisk, riskScore, clauses, fullText } = contract.analysis;
  
  // Calculate stats for chart
  const riskCounts = {
    High: clauses.filter(c => c.riskLevel === 'High').length,
    Medium: clauses.filter(c => c.riskLevel === 'Medium').length,
    Low: clauses.filter(c => c.riskLevel === 'Low').length,
  };
  
  const chartData = [
    { name: 'High Risk', value: riskCounts.High, color: '#ef4444' },
    { name: 'Medium Risk', value: riskCounts.Medium, color: '#f59e0b' },
    { name: 'Low Risk', value: riskCounts.Low, color: '#10b981' },
  ].filter(d => d.value > 0);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getScoreBg = (score: number) => {
      if (score >= 70) return 'bg-red-600';
      if (score >= 40) return 'bg-amber-500';
      return 'bg-emerald-600';
  };

  const handleDownloadOriginal = () => {
    if (!contract.fileData || !contract.mimeType) return;
    
    const link = document.createElement('a');
    link.href = `data:${contract.mimeType};base64,${contract.fileData}`;
    link.download = contract.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = () => {
    if (!contract.analysis) return;

    const { summary, overallRisk, riskScore, clauses, fullText } = contract.analysis;
    const doc = new jsPDF();
    
    // PDF Config
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let y = 20;
    
    // Helper to add text with auto-paging
    const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [60, 60, 60]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(color[0], color[1], color[2]);
        
        // Clean text to avoid PDF errors
        const cleanText = text.replace(/[^\x00-\x7F]/g, ""); // Basic ASCII check/strip for this demo
        
        const lines = doc.splitTextToSize(cleanText, maxLineWidth);
        const lineHeight = fontSize * 0.45; // mm approx
        
        lines.forEach((line: string) => {
            if (y + lineHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight + 1.5; // line spacing
        });
        y += 2; // Paragraph spacing
    };

    // --- PDF Content Generation ---

    // Title & Meta
    addText("LegalLens Analysis Report", 22, true, [79, 70, 229]); // Indigo
    y += 5;
    addText(`File Name: ${contract.fileName}`, 10, false, [100, 116, 139]);
    addText(`Analyzed on: ${new Date(contract.uploadDate).toLocaleDateString()}`, 10, false, [100, 116, 139]);
    y += 10;

    // Executive Summary
    addText("Executive Summary", 14, true, [30, 41, 59]);
    y += 2;
    addText(summary, 10);
    y += 8;

    // Risk Assessment
    addText("Risk Assessment", 14, true, [30, 41, 59]);
    y += 2;
    addText(`Overall Risk: ${overallRisk}`, 11, true);
    addText(`Risk Score: ${riskScore}/100`, 11, true);
    y += 8;

    // Clauses
    addText("Detailed Clause Analysis", 14, true, [30, 41, 59]);
    y += 4;
    
    clauses.forEach((clause, index) => {
        // Prevent orphaned headers at bottom of page
        if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
        }

        // Clause Header
        addText(`${index + 1}. ${clause.explanation} (${clause.riskLevel} Risk)`, 11, true, [30, 41, 59]);
        
        // Original Text (Italic)
        doc.setFont("helvetica", "italic");
        addText(`"${clause.text}"`, 9, false, [71, 85, 105]);
        doc.setFont("helvetica", "normal");
        
        // Risk Reason (Red)
        addText(`Risk Reason: ${clause.reason}`, 9, false, [220, 38, 38]);
        
        // Q&A History
        if (clause.conversationHistory && clause.conversationHistory.length > 0) {
             y += 1;
             addText("Q&A Notes:", 9, true, [79, 70, 229]);
             clause.conversationHistory.forEach(qa => {
                 addText(`Q: ${qa.question}`, 8, false, [100, 100, 100]);
                 addText(`A: ${qa.answer}`, 8, false, [60, 60, 60]);
             });
        }
        y += 6; // Spacing between clauses
    });

    // Full Text
    if (fullText) {
        doc.addPage();
        y = margin;
        addText("Full Document Text (OCR)", 14, true, [30, 41, 59]);
        y += 4;
        doc.setFont("courier", "normal");
        addText(fullText, 9);
    }

    // Save
    doc.save(`${contract.fileName.replace(/\s+/g, '_')}_Analysis.pdf`);
  };

  const handleClauseUpdate = (updatedClause: Clause) => {
    if (!onContractUpdate || !contract.analysis) return;

    // Create a new contract object with the updated clause
    const updatedContract: Contract = {
        ...contract,
        analysis: {
            ...contract.analysis,
            clauses: contract.analysis.clauses.map(c => 
                c.id === updatedClause.id ? updatedClause : c
            )
        }
    };

    onContractUpdate(updatedContract);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-down">
        <button 
            onClick={onBack}
            className="flex items-center text-slate-400 hover:text-indigo-400 transition-colors font-medium hover:-translate-x-1 duration-200"
        >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-800/80 backdrop-blur-sm rounded-xl self-center md:self-auto shadow-inner">
            <button
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'analysis' 
                    ? 'bg-slate-900 text-indigo-400 shadow-sm transform scale-100' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Risk Analysis
            </button>
            <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'text' 
                    ? 'bg-slate-900 text-indigo-400 shadow-sm transform scale-100' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
                <Eye className="w-4 h-4 mr-2" />
                Document Text
            </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
        <>
        {/* Header Card */}
        <div 
            className="bg-slate-900/80 backdrop-blur rounded-2xl shadow-sm border border-slate-800 p-6 md:p-8 animate-scale-in hover-lift"
            style={{ animationDelay: '100ms' }}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2 tracking-tight">{contract.fileName}</h1>
                <div className="flex items-center gap-4 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Uploaded on {new Date(contract.uploadDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    {contract.fileData && (
                        <>
                            <div className="h-4 w-px bg-slate-700 mx-1"></div>
                            <button 
                            onClick={handleDownloadOriginal}
                            className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-colors font-medium text-sm"
                            title="Download original uploaded file"
                            >
                            <FileDown className="w-4 h-4" />
                            <span className="hidden sm:inline">Original File</span>
                            <span className="sm:hidden">File</span>
                            </button>
                        </>
                    )}

                    <button 
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-all font-bold text-sm bg-indigo-900/30 hover:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-500/30 shadow-sm hover:shadow-md ml-2"
                        title="Download full analysis report (PDF)"
                    >
                        <Download className="w-4 h-4" />
                        <span>Download Report (PDF)</span>
                    </button>
                </div>

                </div>
            </div>
            
            <div className="flex flex-col items-end">
                <span 
                    className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 animate-fade-in"
                    style={{ animationDelay: '200ms' }}
                >
                    Overall Assessment
                </span>
                <div className="flex items-center gap-5">
                    {/* Score Display */}
                    {typeof riskScore === 'number' && (
                    <div 
                        className="flex flex-col items-end group relative animate-slide-in-right"
                        style={{ animationDelay: '300ms' }}
                    >
                        <div className={`text-5xl font-extrabold leading-none ${getScoreColor(displayedScore)} transition-colors duration-500`}>
                        {displayedScore}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">Risk Score</div>
                        
                        {/* Progress Bar under score */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${getScoreBg(displayedScore)} transition-all duration-1000 ease-out`} 
                            style={{ width: `${displayedScore}%` }}
                        />
                        </div>
                    </div>
                    )}
                    
                    {typeof riskScore === 'number' && (
                    <div className="h-10 w-px bg-slate-800 animate-fade-in" style={{ animationDelay: '350ms' }}></div>
                    )}

                    {/* Badge Display */}
                    <div className="animate-scale-in" style={{ animationDelay: '400ms' }}>
                        <RiskBadge level={overallRisk} size="lg" />
                    </div>
                </div>
            </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 border-t border-slate-800 pt-6">
            <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-slate-200 animate-fade-in" style={{ animationDelay: '500ms' }}>Executive Summary</h3>
                <div 
                    className="bg-slate-800/50 hover:bg-slate-800 p-4 rounded-xl border border-transparent hover:border-slate-700 transition-all duration-300 hover:shadow-sm animate-slide-up group"
                    style={{ animationDelay: '600ms' }}
                >
                    <p className="text-slate-300 leading-relaxed text-justify group-hover:text-slate-100 transition-colors">
                    {summary}
                    </p>
                </div>
            </div>
            <div 
                className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center animate-scale-in border border-slate-800"
                style={{ animationDelay: '700ms' }}
            >
                <h4 className="text-sm font-semibold text-slate-400 mb-4">Risk Distribution</h4>
                <div className="w-full h-32">
                    <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'}} 
                            itemStyle={{fontSize: '12px', color: '#f1f5f9'}}
                        />
                    </RePieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs mt-2">
                    {chartData.map(d => (
                    <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                        <span className="text-slate-400">{d.value} {d.name}</span>
                    </div>
                    ))}
                </div>
            </div>
            </div>
        </div>

        {/* Clauses Section */}
        <div>
            <div 
                className="flex items-center gap-2 mb-6 animate-fade-in"
                style={{ animationDelay: '800ms' }}
            >
            <AlertOctagon className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-100">Risk Analysis Details</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {clauses.map((clause, index) => (
                <div 
                    key={clause.id} 
                    className="animate-slide-up hover-lift"
                    style={{ animationDelay: `${900 + (index * 100)}ms` }}
                >
                    <ClauseCard 
                        clause={clause} 
                        onUpdate={handleClauseUpdate} 
                    />
                </div>
            ))}
            </div>
        </div>
        </>
      ) : (
        /* Text View */
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 md:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">Document Text</h2>
                <div className="text-sm text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                    AI extracted text
                </div>
            </div>
            
            <div className="prose prose-invert prose-slate max-w-none">
                {fullText ? (
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300 bg-slate-950 p-6 rounded-xl border border-slate-800 h-[70vh] overflow-y-auto">
                        {fullText}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <FileText className="w-12 h-12 mb-3 opacity-50" />
                        <p>No text content available for this document.</p>
                        <p className="text-sm mt-1">Re-analyze the document to extract text.</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};