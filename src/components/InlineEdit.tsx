"use client";

import { useRef, useEffect } from "react";

interface InlineEditProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    style?: React.CSSProperties;
    tag?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";
}

/**
 * InlineEdit — makes any text block directly editable on click.
 * Stops mousedown propagation so react-pageflip doesn't trigger a page flip.
 */
export function InlineEdit({ value, onChange, className = "", style, tag: Tag = "span" }: InlineEditProps) {
    const ref = useRef<HTMLElement>(null);

    // Sync external value changes (e.g. template swap) without losing cursor
    useEffect(() => {
        if (ref.current && ref.current.innerText !== value) {
            ref.current.innerText = value;
        }
    }, [value]);

    return (
        <Tag
            ref={ref as any}
            contentEditable
            suppressContentEditableWarning
            className={`outline-none cursor-text ${className}`}
            style={{ ...style, WebkitUserModify: "read-write-plaintext-only" as any }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
            onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
            onBlur={(e: React.FocusEvent<HTMLElement>) => onChange(e.currentTarget.innerText)}
            dangerouslySetInnerHTML={undefined}
        />
    );
}
