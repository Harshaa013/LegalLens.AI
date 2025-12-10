import React, { useCallback, useState } from 'react';
import { Upload, File as FileIcon, Loader2, AlertCircle, Trash2, Play, Sparkles, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { analyzeContract } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Contract, User, RecentAnalysis } from '../types';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15);

interface ContractUploadProps {
  user: User;
  onUploadComplete: (contract: Contract) => void;
  onClose: () => void;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  contract?: Contract;
}

export const ContractUpload: React.FC<ContractUploadProps> = ({ user, onUploadComplete, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const validateAndAddFiles = (fileList: FileList | File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const newFiles: FileUploadState[] = [];
    let fileError = null;

    Array.from(fileList).forEach(file => {
      if (!validTypes.includes(file.type)) {
        fileError = `File "${file.name}" has an invalid format. Please upload PDF or Images.`;
        return;
      }
      // Simple size check (e.g. 20MB limit which roughly fits many base64 payloads before API limits)
      if (file.size > 20 * 1024 * 1024) {
          fileError = `File "${file.name}" is too large (>20MB).`;
          return;
      }
      newFiles.push({ file, status: 'pending' });
    });

    if (fileError) {
        setGlobalError(fileError);
    } else {
        setGlobalError(null);
    }

    if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const processFile = async (fileState: FileUploadState): Promise<FileUploadState> => {
      try {
          // Convert to Base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                  const base64String = reader.result as string;
                  resolve(base64String.split(',')[1]);
              };
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.readAsDataURL(fileState.file);
          });

          const base64Data = await base64Promise;
          
          // Analyze
          const analysis = await analyzeContract(base64Data, fileState.file.type);
          
          const newContract: Contract = {
            id: generateId(),
            userId: user.id,
            fileName: fileState.file.name,
            uploadDate: Date.now(),
            status: 'analyzed',
            analysis: analysis,
            fileData: base64Data,
            mimeType: fileState.file.type,
          };

          // Save
          try {
            await storageService.saveContract(newContract);
          } catch (storageError: any) {
             console.error("Storage error", storageError);
             // We still consider this a partial success as the user can see results, but we warn them
             throw new Error("Analyzed successfully but failed to save to browser storage. Check available disk space.");
          }

          // Cache
          const recentAnalysis: RecentAnalysis = {
            id: newContract.id,
            name: newContract.fileName,
            createdAt: new Date(newContract.uploadDate).toISOString(),
            sourceType: 'file',
            fileName: newContract.fileName,
            rawText: analysis.fullText || '',
            riskScore: analysis.riskScore || 0,
            riskSummary: analysis.overallRisk,
            summary: [analysis.summary],
            clauses: analysis.clauses
          };
          storageService.saveRecentAnalysis(recentAnalysis);

          return { ...fileState, status: 'success', contract: newContract };
      } catch (e: any) {
          console.error("Error processing file", fileState.file.name, e);
          return { 
              ...fileState, 
              status: 'error', 
              error: e.message || 'Failed to analyze due to an unexpected error.' 
          };
      }
  };

  const retryFile = async (index: number) => {
      const fileToRetry = files[index];
      if (!fileToRetry) return;
      
      // Update state to processing to show spinner immediately
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'processing', error: undefined } : f));
      
      const result = await processFile({ ...fileToRetry, status: 'pending', error: undefined });
      
      setFiles(prev => prev.map((f, i) => i === index ? result : f));
  };

  const handleAnalyzeAll = async () => {
    // If single file pending, normal flow
    // If multiple, batch flow
    
    // Mark pending as processing
    setFiles(prev => prev.map(f => f.status === 'pending' || f.status === 'error' ? { ...f, status: 'processing', error: undefined } : f));

    // Only process files that are not already successful
    const filesToProcess = files.map((f, index) => ({ file: f, index })).filter(item => item.file.status !== 'success');
    
    // Process in parallel
    const promises = filesToProcess.map(async (item) => {
        const result = await processFile(item.file);
        return { index: item.index, result };
    });

    const results = await Promise.all(promises);
    
    // Update state with results
    setFiles(prev => {
        const next = [...prev];
        results.forEach(({ index, result }) => {
            next[index] = result;
        });
        return next;
    });

    // Navigation Logic
    // If only 1 file total and it was successful, go to it
    if (files.length === 1 && results.length === 1 && results[0].result.status === 'success' && results[0].result.contract) {
        onUploadComplete(results[0].result.contract);
    } 
    // Otherwise stay on page showing success marks
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length <= 1) setGlobalError(null);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, []);

  const hasProcessing = files.some(f => f.status === 'processing');
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success');
  const hasErrors = files.some(f => f.status === 'error');

  return (
    <div className="w-full max-w-3xl mx-auto animate-scale-in">
      {/* Upload Area */}
      <div className="relative group mb-8">
            <div 
              className={`border-2 border-dashed rounded-3xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer
                ${isDragging 
                  ? 'border-indigo-500 bg-indigo-900/20 scale-[1.02] shadow-xl' 
                  : 'border-slate-700 bg-slate-900 hover:border-indigo-500/50 hover:bg-slate-800 hover:shadow-lg'
                }
              `}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input 
                type="file" 
                accept=".pdf,image/*" 
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => e.target.files && validateAndAddFiles(e.target.files)}
                disabled={hasProcessing}
              />
              <div className={`p-4 rounded-full mb-4 text-indigo-400 transition-all duration-500 ${isDragging ? 'bg-indigo-900/40 animate-bounce' : 'bg-indigo-900/20 group-hover:scale-110'}`}>
                 <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                Drop your contracts here
              </h3>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
                Upload multiple PDFs or Images to analyze them individually or compare them.
              </p>
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-900/30 pointer-events-none text-sm">
                Select Files
              </button>
            </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-700 overflow-hidden animate-slide-up">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                  <h4 className="font-semibold text-slate-300">Selected Documents ({files.length})</h4>
                  {files.some(f => f.status !== 'processing') && (
                      <button 
                        onClick={() => setFiles([])}
                        disabled={hasProcessing}
                        className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                      >
                          Clear All
                      </button>
                  )}
              </div>
              
              <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto">
                  {files.map((fileState, index) => (
                      <div key={`${fileState.file.name}-${index}`} className={`p-4 flex items-start gap-4 transition-colors ${fileState.status === 'error' ? 'bg-red-900/5' : 'hover:bg-slate-800'}`}>
                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1
                                ${fileState.status === 'error' ? 'bg-red-900/20 text-red-400' : 'bg-indigo-900/30 text-indigo-400'}
                           `}>
                               <FileIcon className="w-5 h-5" />
                           </div>
                           
                           <div className="flex-grow min-w-0">
                               <div className="flex justify-between items-start">
                                    <div className="font-medium text-slate-200 truncate pr-2">{fileState.file.name}</div>
                               </div>
                               <div className="text-xs text-slate-500 mt-0.5">{(fileState.file.size / 1024 / 1024).toFixed(2)} MB</div>
                               
                               {fileState.error && (
                                   <div className="mt-2 text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-900/30 flex items-start">
                                       <AlertCircle className="w-3 h-3 mr-1.5 mt-0.5 shrink-0" />
                                       <span>{fileState.error}</span>
                                   </div>
                               )}
                           </div>

                           <div className="shrink-0 flex items-center pt-2">
                               {fileState.status === 'pending' && (
                                   <button onClick={() => handleRemoveFile(index)} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700">
                                       <Trash2 className="w-4 h-4" />
                                   </button>
                               )}
                               {fileState.status === 'processing' && (
                                   <div className="flex items-center text-indigo-400 text-sm font-medium">
                                       <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                                   </div>
                               )}
                               {fileState.status === 'success' && (
                                   <div className="flex items-center text-emerald-400 text-sm font-medium bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-900/30">
                                       <CheckCircle className="w-4 h-4 mr-1.5" /> Done
                                   </div>
                               )}
                               {fileState.status === 'error' && (
                                   <div className="flex flex-col items-end gap-2">
                                       <button 
                                            onClick={() => retryFile(index)}
                                            className="flex items-center text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 px-2 py-1 rounded hover:bg-indigo-900/40 border border-indigo-900/30 transition-all"
                                       >
                                           <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
                                       </button>
                                       <button onClick={() => handleRemoveFile(index)} className="text-slate-600 hover:text-red-400 text-xs">
                                           Remove
                                       </button>
                                   </div>
                               )}
                           </div>
                      </div>
                  ))}
              </div>

              {/* Action Bar */}
              <div className="p-5 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
                   {allSuccess ? (
                       <button
                         onClick={onClose}
                         className="flex items-center bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50"
                       >
                           Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                       </button>
                   ) : (
                       <button 
                        onClick={handleAnalyzeAll}
                        disabled={hasProcessing || (files.length > 0 && files.every(f => f.status === 'success')) || files.length === 0}
                        className={`flex items-center px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg 
                            ${hasProcessing || files.length === 0 || (files.every(f => f.status === 'success'))
                                ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:-translate-y-1'
                            }`}
                       >
                           {hasProcessing ? (
                               <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                           ) : (
                               <>
                                {hasErrors ? (
                                    <><RefreshCw className="w-5 h-5 mr-2" /> Retry Failed</>
                                ) : (
                                    <><Sparkles className="w-5 h-5 mr-2" /> Analyze {files.filter(f => f.status !== 'success').length} Documents</>
                                )}
                               </>
                           )}
                       </button>
                   )}
              </div>
          </div>
      )}

      {globalError && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-900/30 rounded-xl flex items-center text-red-400 animate-slide-up shadow-sm">
           <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
           <span className="font-medium">{globalError}</span>
        </div>
      )}
    </div>
  );
};