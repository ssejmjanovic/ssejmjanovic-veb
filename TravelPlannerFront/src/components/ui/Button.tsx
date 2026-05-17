import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-2.5 font-display font-bold text-sm rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary: "btn-aero focus:ring-sky-aero text-white",
    secondary: "bg-white/70 backdrop-blur text-ink border border-sky-aero/40 shadow-chrome hover:bg-white focus:ring-sky-aero/50",
    danger: "bg-gradient-to-b from-red-400 to-red-600 text-white border border-white/30 shadow-md hover:from-red-300 hover:to-red-500 focus:ring-red-400",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};