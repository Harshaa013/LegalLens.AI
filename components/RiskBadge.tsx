import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const getColors = () => {
    switch (level) {
      case RiskLevel.HIGH:
        return 'bg-red-500/10 text-red-300 border-red-500/20';
      case RiskLevel.MEDIUM:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case RiskLevel.LOW:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'text-xs px-2 py-0.5';
      case 'lg': return 'text-lg px-4 py-1.5 font-bold';
      default: return 'text-sm px-2.5 py-0.5 font-medium';
    }
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${getColors()} ${getSizeClasses()}`}>
      {level} Risk
    </span>
  );
};