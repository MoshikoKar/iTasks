'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content?: string;
  description?: string; // For backward compatibility with SLA page
  children?: ReactNode;
  showIcon?: boolean;
}

export function Tooltip({ content, description, children, showIcon = true }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const tooltipContent = description || content || '';

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const updatePosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          // Position tooltip above the trigger element
          const top = rect.top + scrollY - 8; // 8px margin above
          const left = rect.left + scrollX + (rect.width / 2);
          
          setPosition({ top, left });
        }
      };

      // Update position immediately
      updatePosition();

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(updatePosition);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          const top = rect.top + scrollY - 8;
          const left = rect.left + scrollX + (rect.width / 2);
          
          setPosition({ top, left });
        }
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isVisible]);

  const tooltipElement = isVisible && tooltipContent ? (
    <div
      ref={tooltipRef}
      className="fixed px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap pointer-events-none z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
      }}
      role="tooltip"
    >
      {tooltipContent}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700"></div>
    </div>
  ) : null;

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative inline-flex items-center"
      >
        <div
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          className="inline-flex items-center cursor-help"
        >
          {children || (showIcon && <Info size={14} className="text-muted-foreground hover:text-foreground transition-colors" />)}
        </div>
      </div>
      {typeof window !== 'undefined' && createPortal(tooltipElement, document.body)}
    </>
  );
}
