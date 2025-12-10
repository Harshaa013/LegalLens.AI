import React, { useState, useEffect } from 'react';
import { User, Contract } from '../types';
import { storageService } from '../services/storageService';
import { User as UserIcon, Mail, Save, BarChart3, Shield, Clock, ArrowLeft } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onBack }) => {
  const [name, setName] = useState(user.name);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userContracts = storageService.getContracts(user.id);
    setContracts(userContracts);
  }, [user.id]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call/save delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const updatedUser = { ...user, name };
    storageService.saveUser(updatedUser);
    storageService.setCurrentUser(updatedUser);
    onUpdateUser(updatedUser);

    setIsSaving(false);
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const stats = {
    total: contracts.length,
    highRisk: contracts.filter(c => c.analysis?.overallRisk === 'High').length,
    lastUpload: contracts.length > 0
        ? new Date(Math.max(...contracts.map(c => c.uploadDate))).toLocaleDateString()
        : 'Never'
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-400 hover:text-indigo-400 transition-colors font-medium hover:-translate-x-1 duration-200"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <h2 className="text-3xl font-bold text-slate-100">My Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-400 text-2xl font-bold border-4 border-slate-800 shadow-sm ring-1 ring-slate-800">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-100">{name}</h3>
                        <p className="text-slate-400">{user.email}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Email address is managed by your identity provider.</p>
                    </div>

                    <div className="pt-4 flex items-center">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim()}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 transform active:scale-95 duration-150"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {message && (
                            <span className="ml-4 text-emerald-400 text-sm font-medium animate-fade-in flex items-center">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></div>
                                {message}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Stats Card */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-full">
                <h4 className="font-semibold text-slate-200 mb-6 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                    Activity Stats
                </h4>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors">
                        <div className="text-sm text-slate-400 mb-1">Total Analyses</div>
                        <div className="text-3xl font-bold text-slate-100">{stats.total}</div>
                    </div>
                    
                    <div className="p-4 bg-red-900/20 rounded-xl border border-red-900/30 hover:bg-red-900/30 transition-colors">
                        <div className="text-sm text-red-400 mb-1 flex items-center">
                             <Shield className="w-4 h-4 mr-1" />
                             High Risk Found
                        </div>
                        <div className="text-3xl font-bold text-red-500">{stats.highRisk}</div>
                    </div>

                    <div className="p-4 bg-indigo-900/20 rounded-xl border border-indigo-900/30 hover:bg-indigo-900/30 transition-colors">
                        <div className="text-sm text-indigo-400 mb-1 flex items-center">
                             <Clock className="w-4 h-4 mr-1" />
                             Last Activity
                        </div>
                        <div className="text-lg font-bold text-indigo-300">{stats.lastUpload}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};