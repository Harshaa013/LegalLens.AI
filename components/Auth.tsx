import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (email: string, name?: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }

    if (!isLogin && !name.trim()) {
        setError('Please enter your full name.');
        return;
    }
    
    // Simulate auth logic
    onLogin(normalizedEmail, isLogin ? 'User' : name.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-700/50">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <h2 className="text-3xl font-bold text-white mb-2 relative z-10 animate-slide-down">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-indigo-200 relative z-10 animate-fade-in" style={{animationDelay: '0.2s'}}>
            {isLogin ? 'Sign in to access your contracts.' : 'Create an account to analyze contracts.'}
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-900/20 text-red-300 text-sm rounded-lg flex items-center border border-red-900/30 animate-fade-in">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="animate-slide-up" style={{animationDelay: '0.1s'}}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-slate-700 placeholder-slate-500"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            
            <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-slate-700 placeholder-slate-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="animate-slide-up" style={{animationDelay: '0.3s'}}>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-slate-700 placeholder-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/50 hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
              style={{animationDelay: '0.4s'}}
            >
              {isLogin ? (
                <>
                  <LogIn className="w-5 h-5 mr-2" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" /> Create Account
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center animate-fade-in" style={{animationDelay: '0.5s'}}>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};