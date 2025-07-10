// components/ui/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100 사이의 값
  className?: string;
  barColorClass?: string; // 예: 'bg-blue-600', 'bg-purple-600'
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '', barColorClass = 'bg-blue-600' }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 ${className}`}>
      <div
        className={`${barColorClass} h-4 rounded-full transition-all duration-300`}
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} // 0% ~ 100% 범위 유지
      ></div>
    </div>
  );
};

export default ProgressBar;