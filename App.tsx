import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ContractUpload } from './components/ContractUpload';
import { AnalysisView } from './components/AnalysisView';
import { ChatBot } from './components/ChatBot';
import { ProfileView } from './components/ProfileView';
import { CompareView } from './components/CompareView';
import { storageService } from './services/storageService';
import { User, Contract } from './types';

// Simple router state
type View = 'auth' | 'dashboard' | 'upload' | 'analysis' | 'profile' | 'compare';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('auth');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [compareContracts, setCompareContracts] = useState<Contract[] | null>(null);

  // Check auth on load
  useEffect(() => {
    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setView('dashboard');
    }
  }, []);

  const handleLogin = (email: string, name: string = 'User') => {
    // In a real app, verify credentials. Here, we mock it.
    const newUser: User = { id: email, email, name };
    storageService.setCurrentUser(newUser);
    storageService.saveUser(newUser); // Ensure user exists in 'DB'
    setUser(newUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    storageService.setCurrentUser(null);
    setUser(null);
    setView('auth');
    setSelectedContract(null);
    setCompareContracts(null);
  };

  const handleUploadComplete = (contract: Contract) => {
    setSelectedContract(contract);
    setView('analysis');
  };

  const handleContractUpdate = async (updatedContract: Contract) => {
    // Optimistically update local state so UI reflects changes immediately
    setSelectedContract(updatedContract);
    
    // Save to persistent storage
    try {
      await storageService.saveContract(updatedContract);
    } catch (err) {
      console.error("Failed to save contract update:", err);
      // Optionally handle error state here
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
      setUser(updatedUser);
  };

  const handleCompare = (contracts: Contract[]) => {
      setCompareContracts(contracts);
      setView('compare');
  };

  const renderContent = () => {
    if (!user) return <Auth onLogin={handleLogin} />;

    switch (view) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            onNewUpload={() => setView('upload')} 
            onSelectContract={(c) => {
              setSelectedContract(c);
              setView('analysis');
            }}
            onCompare={handleCompare}
          />
        );
      case 'upload':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
               <h2 className="text-3xl font-bold text-slate-900">Upload Contracts</h2>
               <p className="text-slate-500 mt-2">We'll scan for hidden risks and summarize the key terms.</p>
            </div>
            <ContractUpload 
                user={user} 
                onUploadComplete={handleUploadComplete} 
                onClose={() => setView('dashboard')}
            />
            <div className="mt-8 text-center">
               <button 
                onClick={() => setView('dashboard')}
                className="text-slate-500 hover:text-slate-800 text-sm font-medium"
               >
                 Cancel and return to dashboard
               </button>
            </div>
          </div>
        );
      case 'analysis':
        return selectedContract ? (
          <AnalysisView 
            contract={selectedContract} 
            onBack={() => setView('dashboard')} 
            onContractUpdate={handleContractUpdate}
          />
        ) : (
          <div>Error: No contract selected</div>
        );
      case 'profile':
        return (
            <ProfileView 
                user={user} 
                onUpdateUser={handleUserUpdate} 
                onBack={() => setView('dashboard')}
            />
        );
      case 'compare':
        return compareContracts ? (
            <CompareView 
                contracts={compareContracts}
                onBack={() => setView('dashboard')}
            />
        ) : (
            <div>Error: Select at least 2 contracts</div>
        );
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout}
      onNavigateHome={() => user && setView('dashboard')}
      onNavigateProfile={() => user && setView('profile')}
    >
      {renderContent()}
      
      {/* Global Chatbot - Only show when authenticated */}
      {user && view !== 'auth' && (
        <ChatBot contract={view === 'analysis' ? selectedContract : null} />
      )}
    </Layout>
  );
};

export default App;