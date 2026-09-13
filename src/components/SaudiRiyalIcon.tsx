import React from 'react';

interface SaudiRiyalIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SaudiRiyalIcon: React.FC<SaudiRiyalIconProps> = ({ className = "w-5 h-5", style }) => {
  return (
    <svg 
      viewBox="0 0 355 400" 
      className={className} 
      style={style}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left Column with curved/bent tail */}
      <path d="M125 24 L167 0 L167 285 L125 315 L32 339 L0 358 L12 390 L42 371 L125 348 L125 24 Z" />
      
      {/* Right Column */}
      <path d="M208 54 L250 30 L250 312 L208 325 L208 54 Z" />
      
      {/* Top/Middle Slanted Crossing Bar */}
      <path d="M35 245 L350 152 L350 188 L20 280 Z" />
      
      {/* Middle-Right Slanted Bar */}
      <path d="M208 260 L350 219 L350 255 L208 296 Z" />
      
      {/* Bottom-Right Slanted Bar */}
      <path d="M208 350 L350 309 L350 345 L208 386 Z" />
    </svg>
  );
};
