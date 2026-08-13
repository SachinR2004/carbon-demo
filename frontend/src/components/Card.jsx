import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-neutral-card rounded-2xl shadow-md border border-neutral-border p-6 ${className}`}>
      {children}
    </div>
  );
}
