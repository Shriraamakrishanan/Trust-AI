
import React, { useState, useEffect } from 'react';

interface CredibilityScoreProps {
  score: number;
}

const CredibilityScore: React.FC<CredibilityScoreProps> = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setDisplayScore(score));
    return () => cancelAnimationFrame(animation);
  }, [score]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  const getColorClasses = (s: number): { text: string; stroke: string } => {
    if (s < 40) return { text: 'text-[--danger]', stroke: 'stroke-[--danger]' };
    if (s < 70) return { text: 'text-[--warning]', stroke: 'stroke-[--warning]' };
    return { text: 'text-[--success]', stroke: 'stroke-[--success]' };
  };

  const colorClasses = getColorClasses(score);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-[--surface-muted] border border-[--border] rounded-lg h-full">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="stroke-[--border]"
            strokeWidth="8"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
          <circle
            className={`${colorClasses.stroke} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colorClasses.text}`}>
                {Math.round(displayScore)}
            </span>
            <span className="text-xs font-semibold text-[--text-tertiary]">/ 100</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-[--text-primary]">Credibility Score</h3>
    </div>
  );
};

export default CredibilityScore;
