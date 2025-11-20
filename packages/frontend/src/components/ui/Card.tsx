import type { ReactNode, HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  gradient?: boolean;
  hover?: boolean;
  glow?: boolean;
  animated?: boolean;
};

export function Card({ 
  className = '', 
  children, 
  gradient = false, 
  hover = true, 
  glow = false,
  animated = false,
  ...props 
}: CardProps) {
  const baseClasses = 'glass-card rounded-xl transition-all duration-500 ease-out';
  const hoverClasses = hover ? 'hover:scale-[1.02] hover:-translate-y-1' : '';
  const gradientClasses = gradient ? 'gradient-card' : '';
  const glowClasses = glow ? 'shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-purple-500/30' : '';
  const animatedClasses = animated ? 'scale-in' : '';
  
  return (
    <div 
      className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${glowClasses} ${animatedClasses} ${className}`} 
      {...props}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
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
