
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* Central Robot Face */}
    <g transform="translate(50, 50)">
        {/* Head */}
        <rect x="-12" y="-10" width="24" height="18" rx="5" stroke="currentColor" strokeWidth="4" fill="none" />
        {/* Eyes */}
        <circle cx="-5" cy="-2" r="2" fill="currentColor" />
        <circle cx="5" cy="-2" r="2" fill="currentColor" />
        {/* Antenna */}
        <path d="M0 -10 L0 -15" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="0" cy="-17" r="2" fill="currentColor" />
    </g>

    {/* Abstract Flower/Network Lines (6-fold symmetry) */}
    {/* Rotating a petal shape 6 times */}
    {[0, 60, 120, 180, 240, 300].map((angle, i) => (
      <g key={i} transform={`rotate(${angle} 50 50)`}>
         <path 
           d="M50 20 C 65 20, 75 35, 75 50" 
           stroke="currentColor" 
           strokeWidth="4" 
           strokeLinecap="round"
           fill="none"
         />
         <path 
           d="M75 50 C 75 65, 65 80, 50 80"
           stroke="currentColor" 
           strokeWidth="4" 
           strokeLinecap="round"
           fill="none"
           opacity="0.6"
         />
      </g>
    ))}
    
    {/* Outer Hexagon hints */}
     <path 
        d="M50 5 L 89 27 L 89 72 L 50 95 L 11 72 L 11 27 Z" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinejoin="round" 
        opacity="0.3"
     />
  </svg>
);

export default Logo;
