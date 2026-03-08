"use client";

import { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { PageElement } from "@/lib/types";
import { X, RotateCcw, RotateCw } from "lucide-react";

interface StickerElementProps {
    element: PageElement;
    onChange: (updated: Partial<PageElement>) => void;
    onRemove: () => void;
    isPreview?: boolean;
}

export function StickerElement({ element, onChange, onRemove, isPreview = false }: StickerElementProps) {
    const [isSelected, setIsSelected] = useState(false);
    const [rotation, setRotation] = useState<number>(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsSelected(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const w = typeof element.width === "number" ? element.width : 80;
    const h = typeof element.height === "number" ? element.height : 80;

    if (isPreview) {
        return (
            <div
                style={{
                    position: "absolute",
                    left: element.x,
                    top: element.y,
                    width: w,
                    height: h,
                    transform: `rotate(${rotation}deg)`,
                    fontSize: Math.min(w, h) * 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                {element.content}
            </div>
        );
    }

    return (
        <Rnd
            default={{ x: element.x, y: element.y, width: w, height: h }}
            onDragStop={(_, d) => onChange({ x: d.x, y: d.y })}
            onResizeStop={(_, __, ref, ___, pos) =>
                onChange({
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                    x: pos.x,
                    y: pos.y,
                })
            }
            bounds="parent"
            lockAspectRatio
            style={{ zIndex: isSelected ? 50 : 30 }}
        >
            <div
                ref={ref}
                className="relative w-full h-full flex items-center justify-center cursor-pointer select-none group"
                style={{ transform: `rotate(${rotation}deg)` }}
                onMouseDown={(e) => { e.stopPropagation(); setIsSelected(true); }}
            >
                {/* Selection ring */}
                {isSelected && (
                    <div className="absolute inset-0 rounded-lg border border-fuchsia-400/70 shadow-[0_0_15px_rgba(217,70,239,0.4)] pointer-events-none" />
                )}

                {/* Quick Actions */}
                {isSelected && (
                    <div
                        className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/90 border border-white/10 rounded-xl px-2 py-1 z-50 backdrop-blur-xl"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button
                            className="rounded-md p-1 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            onClick={() => setRotation(r => r - 15)}
                        ><RotateCcw size={12} /></button>
                        <button
                            className="rounded-md p-1 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            onClick={() => setRotation(r => r + 15)}
                        ><RotateCw size={12} /></button>
                        <div className="w-px h-4 bg-white/20" />
                        <button
                            className="rounded-md p-1 hover:bg-red-500/20 text-red-400 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        ><X size={12} /></button>
                    </div>
                )}

                {/* Sticker */}
                <span
                    className="select-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-transform group-hover:scale-110 duration-200"
                    style={{ fontSize: Math.min(w, h) * 0.72 }}
                >
                    {element.content}
                </span>
            </div>
        </Rnd>
    );
}
