'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading, className, disabled, ...props }, ref) => {
    const sizeStyles = {
      sm: { fontSize: '14px', padding: '6px 16px' },
      md: { fontSize: '16px', padding: '10px 30px' },
      lg: { fontSize: '18px', padding: '15px 40px' },
    };

    // Mobile/tablet responsive adjustments for touch targets
    const responsiveSizeStyles = {
      sm: 'max-md:px-4 max-md:py-3',
      md: 'max-md:px-6 max-md:py-4',
      lg: 'max-md:px-8 max-md:py-5',
    };

    // Semantic text colors based on variant
    const textColorClass = {
      primary: 'text-primary',
      secondary: 'text-muted-foreground',
      danger: 'text-destructive',
      ghost: 'text-primary',
    }[variant];

    return (
      <motion.button
        ref={ref}
        className={clsx('neu-button inline-flex items-center justify-center font-medium', textColorClass, responsiveSizeStyles[size], className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        style={{
          ...sizeStyles[size],
          opacity: disabled || isLoading ? 0.4 : 1,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          transform: disabled || isLoading ? 'none' : undefined,
        }}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        style={sizeStyles[size]}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">Loading</span>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
