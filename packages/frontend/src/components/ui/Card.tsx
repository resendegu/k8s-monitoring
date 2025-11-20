import type { ReactNode, HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  gradient?: boolean;
  hover?: boolean;
};

export function Card({ className = '', children, gradient = false, hover = true, ...props }: CardProps) {
  const baseClasses = 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl transition-all duration-300';
  const hoverClasses = hover ? 'hover:border-gray-600/50 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1' : '';
  const gradientClasses = gradient ? 'bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-900/50 relative overflow-hidden' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`} {...props}>
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`p-6 relative z-10 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: CardProps) {
  return (
    <h3 className={`text-xl font-semibold text-gray-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}
