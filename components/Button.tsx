import React from 'react';
import { TOKENS, FOCUS_RING } from '../constants';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'iconPink';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'square';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = `inline-flex items-center justify-center font-bold transition-all ${TOKENS.animation.durations.fast} ${TOKENS.animation.curves.default} ${FOCUS_RING} disabled:opacity-50 disabled:cursor-not-allowed`;

  const variants = {
    primary: 'bg-[#ed3b91] text-white hover:bg-[#d6257a] shadow-sm',
    secondary: 'bg-[#08b8fb] text-white hover:bg-[#07a2dd] shadow-sm',
    outline: 'border border-[#e2e8f0] bg-white text-[#091e42] hover:bg-[#f8fafc] hover:border-[#cbd5e1]',
    ghost: 'text-[#6882a9] hover:text-[#091e42] hover:bg-[#f8fafc]',
    success: 'bg-[#22c55e] text-white hover:bg-[#16a34a]',
    warning: 'bg-[#f59e0b] text-white hover:bg-[#d97706]',
    iconPink: 'bg-white border-[1px] border-[#ed3b91] text-[#ed3b91] hover:bg-[#ed3b91]/5 shadow-glow rounded-xl active:scale-90',
  };

  const sizes = {
    sm: `${TOKENS.typography.sm} px-3 py-1.5 ${TOKENS.radius.sm}`,
    md: `${TOKENS.typography.base} px-4 py-2 ${TOKENS.radius.md}`,
    lg: `${TOKENS.typography.lg} px-6 py-3 ${TOKENS.radius.lg}`,
    xl: `${TOKENS.typography.xl} px-10 py-4 ${TOKENS.radius.xl}`,
    square: 'w-[3.5rem] h-[3.5rem] p-0 flex items-center justify-center',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
