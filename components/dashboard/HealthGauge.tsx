"use client";

import { useEffect, useState } from 'react';

export function HealthGauge({ score }: { score: number }) {
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setCurrentScore(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  let color = '#16a34a'; // green
  if (score < 60) color = '#dc2626'; // red
  else if (score < 80) color = '#d97706'; // amber

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-serif font-bold text-[var(--color-navy)]">{currentScore}%</span>
        </div>
      </div>
      <p className="mt-4 font-medium text-[var(--color-text)]">Overall Compliance Health</p>
    </div>
  );
}
