type CircularProgressProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  label?: string;
};

export function CircularProgress({ 
  value, 
  size = 120, 
  strokeWidth = 8, 
  className = '',
  color = '#3b82f6',
  label
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-100">{value}%</span>
        {label && <span className="text-xs text-gray-400 mt-1">{label}</span>}
      </div>
    </div>
  );
}
