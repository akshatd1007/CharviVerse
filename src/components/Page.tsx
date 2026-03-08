import React, { forwardRef, PropsWithChildren } from 'react';

// react-pageflip requires refs to be forwarded to the child pages
export const Page = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
    ({ children, className }, ref) => {
        return (
            <div
                ref={ref}
                className={`w-full h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] overflow-hidden ${className || ''}`}
                // Adding a drop shadow to the edge of the page gives a 3D effect
                style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05), 0 0 5px rgba(0,0,0,0.1)' }}
            >
                {children}
            </div>
        );
    }
);

Page.displayName = 'Page';
