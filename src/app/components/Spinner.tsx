import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerColor = 'indigo' | 'white' | 'gray';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'indigo' }) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses: Record<SpinnerColor, string> = {
    indigo: 'border-indigo-600',
    white: 'border-white',
    gray: 'border-gray-300'
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-4 border-t-transparent`}
      />
    </div>
  );
};

export default Spinner; 