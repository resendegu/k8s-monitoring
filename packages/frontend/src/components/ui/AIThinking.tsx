interface AIThinkingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pulse' | 'orbit' | 'wave' | 'dots';
}

export function AIThinking({ size = 'md', variant = 'orbit' }: AIThinkingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  if (variant === 'orbit') {
    return (
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Center core */}
        <div className="absolute w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full ai-thinking shadow-lg shadow-blue-500/50" />
        
        {/* Orbiting particles */}
        {[0, 120, 240].map((rotation, i) => (
          <div
            key={i}
            className="absolute w-full h-full"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="ai-orbit">
              <div className={`w-2 h-2 rounded-full ${
                i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-purple-400' : 'bg-pink-400'
              } shadow-lg`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <div className={`flex items-center justify-center gap-1 ${sizeClasses[size]}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2 h-8 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full ai-wave"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center gap-2 ${sizeClasses[size]}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 ai-thinking"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    );
  }

  // Default pulse variant
  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full ai-thinking blur-md" />
      <div className="absolute inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full ai-thinking" />
      <div className="absolute inset-4 bg-gray-900 rounded-full" />
    </div>
  );
}
