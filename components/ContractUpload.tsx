import React, { useCallback, useState } from 'react';
import { Upload, File as FileIcon, Loader2, AlertCircle, Trash2, Play, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
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

    Array.from(fileList).forEach(file => {
      if (!validTypes.includes(file.type)) {
        setGlobalError(`File "${file.name}" has an invalid format. Please upload PDF or Images.`);
        return;
      }
      newFiles.push({ file, status: 'pending' });
    });

    if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
        setGlobalError(null);
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
              reader.onerror = reject;
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
          await storageService.saveContract(newContract);

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
      } catch (e) {
          console.error("Error processing file", fileState.file.name, e);
          return { ...fileState, status: 'error', error: 'Failed to analyze' };
      }
  };

  const handleAnalyzeAll = async () => {
    // If single file pending, normal flow
    // If multiple, batch flow
    
    // Mark pending as processing
    setFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'processing' } : f));

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Process sequentially to avoid rate limits on demo keys, or parallel if robust
    // Using simple Promise.all for parallel (careful with rate limits)
    // Let's do parallel for UX speed in demo
    
    const results = await Promise.all(pendingFiles.map(processFile));
    
    // Update state with results
    setFiles(prev => {
        const next = [...prev];
        results.forEach(res => {
            const idx = next.findIndex(f => f.file === res.file);
            if (idx !== -1) next[idx] = res;
        });
        return next;
    });

    // Navigation Logic
    // If only 1 file total and it was successful, go to it
    if (files.length === 1 && results[0].status === 'success' && results[0].contract) {
        onUploadComplete(results[0].contract);
    } 
    // Otherwise stay on page showing success marks
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div className="w-full max-w-3xl mx-auto animate-scale-in">
      {/* Upload Area */}
      <div className="relative group mb-8">
            <div 
              className={`border-2 border-dashed rounded-3xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer
                ${isDragging 
                  ? 'border-indigo-500 bg-indigo-50 scale-[1.02] shadow-xl' 
                  : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50 hover:shadow-lg'
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
              <div className={`p-4 rounded-full mb-4 text-indigo-600 transition-all duration-500 ${isDragging ? 'bg-indigo-200 animate-bounce' : 'bg-indigo-50 group-hover:scale-110'}`}>
                 <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Drop your contracts here
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                Upload multiple PDFs or Images to analyze them individually or compare them.
              </p>
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 pointer-events-none text-sm">
                Select Files
              </button>
            </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-slide-up">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-semibold text-slate-700">Selected Documents ({files.length})</h4>
                  {files.some(f => f.status === 'pending') && (
                      <button 
                        onClick={() => setFiles([])}
                        disabled={hasProcessing}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                          Clear All
                      </button>
                  )}
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {files.map((fileState, index) => (
                      <div key={`${fileState.file.name}-${index}`} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                           <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                               <FileIcon className="w-5 h-5" />
                           </div>
                           
                           <div className="flex-grow min-w-0">
                               <div className="font-medium text-slate-900 truncate">{fileState.file.name}</div>
                               <div className="text-xs text-slate-500">{(fileState.file.size / 1024 / 1024).toFixed(2)} MB</div>
                           </div>

                           <div className="shrink-0 flex items-center">
                               {fileState.status === 'pending' && (
                                   <button onClick={() => handleRemoveFile(index)} className="text-slate-400 hover:text-red-500 p-2">
                                       <Trash2 className="w-4 h-4" />
                                   </button>
                               )}
                               {fileState.status === 'processing' && (
                                   <div className="flex items-center text-indigo-600 text-sm font-medium">
                                       <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                                   </div>
                               )}
                               {fileState.status === 'success' && (
                                   <div className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                       <CheckCircle className="w-4 h-4 mr-1.5" /> Done
                                   </div>
                               )}
                               {fileState.status === 'error' && (
                                   <div className="flex items-center text-red-600 text-sm font-medium" title={fileState.error}>
                                       <AlertCircle className="w-4 h-4 mr-1.5" /> Failed
                                   </div>
                               )}
                           </div>
                      </div>
                  ))}
              </div>

              {/* Action Bar */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                   {allSuccess ? (
                       <button
                         onClick={onClose}
                         className="flex items-center bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300"
                       >
                           Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                       </button>
                   ) : (
                       <button 
                        onClick={handleAnalyzeAll}
                        disabled={hasProcessing || files.every(f => f.status === 'success')}
                        className={`flex items-center px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg 
                            ${hasProcessing || files.every(f => f.status === 'success')
                                ? 'bg-slate-300 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1'
                            }`}
                       >
                           {hasProcessing ? (
                               <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                           ) : (
                               <><Sparkles className="w-5 h-5 mr-2" /> Analyze {files.filter(f => f.status === 'pending').length} Documents</>
                           )}
                       </button>
                   )}
              </div>
          </div>
      )}

      {globalError && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 animate-slide-up shadow-sm">
           <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
           <span className="font-medium">{globalError}</span>
        </div>
      )}
    </div>
  );
};