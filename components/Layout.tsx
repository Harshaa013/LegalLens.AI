import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateProfile?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onNavigateHome, onNavigateProfile }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 relative overflow-x-hidden text-slate-100">
        {/* Background Gradients */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent"></div>
            <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-3xl animate-float"></div>
            <div className="absolute top-[20%] -left-[200px] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>

      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer group" 
            onClick={onNavigateHome}
          >
            <div className="relative">
                <ShieldCheck className="h-8 w-8 text-indigo-500 transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <span className="ml-2 text-xl font-bold text-slate-100 tracking-tight group-hover:text-indigo-400 transition-colors">LegalLens.ai</span>
          </div>
          
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-4 animate-fade-in">
              <button 
                onClick={onNavigateProfile}
                className="flex items-center space-x-2 group p-1 pr-3 rounded-full hover:bg-slate-800 transition-all duration-200 border border-transparent hover:border-slate-700"
                title="View Profile"
              >
                  <div className="w-8 h-8 bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all">
                      {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 hidden sm:block font-medium group-hover:text-indigo-400 transition-colors">
                      {user.name}
                  </span>
              </button>
              
              <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

              <button
                onClick={onLogout}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-all duration-200 hover:rotate-90"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </header>
      
      {/* Increased z-index to 20 to sit above the footer (z-10) so fixed children (ChatBot) aren't obscured */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-20">
        {children}
      </main>
      
      <footer className="bg-slate-950/50 backdrop-blur-sm border-t border-slate-800 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} LegalLens.ai. Not a substitute for professional legal advice.</p>
        </div>
      </footer>
    </div>
  );
};