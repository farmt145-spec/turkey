import React from 'react';

interface RiskScoreCardProps {
  label: string;
  score: number;
  color: 'emerald' | 'blue' | 'red' | 'violet';
  inverse?: boolean;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ label, score, color, inverse }) => {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
    violet: 'bg-violet-100 text-violet-800',
  };

  const displayScore = inverse ? 100 - score : score;

  return (
    <div className={`p-4 rounded-lg ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{displayScore}</p>
      <div className="w-full bg-white/50 rounded-full h-2 mt-2">
        <div
          className="bg-current h-2 rounded-full transition-all"
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  );
};
