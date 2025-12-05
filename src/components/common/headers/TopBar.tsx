'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  /**
   * The title to display in the top bar.
   */
  title?: string | React.ReactNode;
  /**
   * Function to call when the back button is clicked.
   * If provided, a back button will be rendered on the left.
   */
  onBack?: () => void;
  /**
   * Custom content to render on the left side.
   * If `onBack` is also provided, `leftAction` will be rendered after the back button.
   */
  leftAction?: React.ReactNode;
  /**
   * Custom content to render on the right side.
   */
  rightAction?: React.ReactNode;
  /**
   * Alignment of the title.
   * @default 'center'
   */
  align?: 'left' | 'center';
  /**
   * Additional class names for the container.
   */
  className?: string;
  /**
   * Inline styles for the container.
   */
  style?: React.CSSProperties;
  /**
   * Positioning of the top bar.
   * @default 'sticky'
   */
  position?: 'sticky' | 'fixed' | 'relative' | 'static';
}

export default function TopBar({
  title,
  onBack,
  leftAction,
  rightAction,
  align = 'center',
  className,
  style,
  position = 'sticky',
}: TopBarProps) {
  return (
    <header
      className={cn(
        'z-[50] w-full border-b bg-background/95 backdrop-blur-sm shadow-sm safe-area-header isolate',
        position === 'sticky' && 'sticky top-0',
        position === 'fixed' && 'fixed top-0 left-0 right-0',
        position === 'relative' && 'relative',
        // static is default behavior so no class needed, but we can add it if needed
        className
      )}
      style={style}
    >
      <div className="container mx-auto flex h-16 items-center px-4 relative">
        {/* Left Section */}
        <div className="flex items-center gap-2 z-10 shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 transition-colors -ml-2"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {leftAction}
          
          {/* Title when aligned left */}
          {align === 'left' && title && (
             <div className={cn("text-lg font-bold truncate ml-1", !onBack && !leftAction && "ml-0")}>
               {title}
             </div>
          )}
        </div>

        {/* Center Title */}
        {align === 'center' && title && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="text-lg font-bold truncate max-w-[60%] text-center pointer-events-auto">
               {title}
             </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2 absolute right-4 z-10">
          {rightAction}
        </div>
      </div>

      <style jsx>{`
        .safe-area-header {
          padding-top: env(safe-area-inset-top);
        }

        @supports (padding-top: constant(safe-area-inset-top)) {
          .safe-area-header {
            padding-top: constant(safe-area-inset-top);
          }
        }
      `}</style>
    </header>
  );
}
