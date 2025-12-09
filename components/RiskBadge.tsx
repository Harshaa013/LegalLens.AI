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
        return 'bg-red-100 text-red-800 border-red-200';
      case RiskLevel.MEDIUM:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case RiskLevel.LOW:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
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