import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle = "inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary-light",
    secondary: "bg-primary-light text-white hover:bg-primary focus:ring-primary",
    outline: "border-2 border-primary text-primary hover:bg-neutral-bg focus:ring-primary",
    danger: "bg-danger text-white hover:opacity-90 focus:ring-danger",
    ghost: "text-neutral-textMuted hover:text-neutral-textMain hover:bg-neutral-bg"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
