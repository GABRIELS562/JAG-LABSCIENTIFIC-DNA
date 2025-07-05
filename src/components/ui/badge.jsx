import React from 'react';

export const Badge = ({ children, className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  return (
    <span className={`${baseClasses} ${className}`} {...props}>
      {children}
    </span>
  );
};