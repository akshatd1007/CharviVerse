"use client";

import { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import { PageElement } from "@/lib/types";
import { Type, X, Bold, Minus, Plus, ChevronDown } from "lucide-react";

interface EditableTextProps {
    element: PageElement;
    onChange: (updated: Partial<PageElement>) => void;
    onRemove: () => void;
    isPreview?: boolean;
}

const FONTS = [
    { label: "Sans", value: "font-sans" },
    { label: "Serif", value: "font-serif" },
    { label: "Mono", value: "font-mono" },
    { label: "Bodoni", value: "font-[family-name:var(--font-bodoni)]" },
];

const WEIGHTS = [
    { label: "Thin", value: "100" },
    { label: "Normal", value: "400" },
    { label: "Bold", value: "700" },
    { label: "Black", value: "900" },
];

const PRESET_COLORS = [
    "#ffffff", "#000000", "#f87171", "#fb923c", "#facc15",
    "#4ade80", "#38bdf8", "#a78bfa", "#f472b6", "#e2e8f0",
    "#22d3ee", "#818cf8",
];

export function EditableText({ element, onChange, onRemove, isPreview = false }: EditableTextProps) {
    const [isSelected, setIsSelected] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [showWeightMenu, setShowWeightMenu] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);
    const fontSize = parseInt(element.styles?.fontSize || "18");
    const fontFamily = element.styles?.fontFamily || "font-sans";
    const fontWeight = element.styles?.fontWeight || "400";
    const color = element.styles?.color || "#ffffff";

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (textRef.current && !textRef.current.contains(target)) {
                setIsSelected(false);
                setIsEditing(false);
                setShowToolbar(false);
                setShowFontMenu(false);
                setShowWeightMenu(false);
            }
        };
        window.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isPreview) {
        return (
            <div
                style={{
                    position: "absolute",
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    fontFamily: undefined,
                    fontSize: element.styles?.fontSize,
                    fontWeight: element.styles?.fontWeight,
                    color: element.styles?.color,
                    whiteSpace: "pre-wrap",
                    userSelect: "none",
                    pointerEvents: "none",
                }}
                className={`${element.styles?.fontFamily || ""} drop-shadow-lg`}
            >
                {element.content}
            </div>
        );
    }

    return (
        <Rnd
            default={{ x: element.x, y: element.y, width: element.width as number, height: "auto" }}
            onDragStop={(_, d) => onChange({ x: d.x, y: d.y })}
            onResizeStop={(_, __, ref, ___, pos) =>
                onChange({ width: ref.style.width, height: ref.style.height, x: pos.x, y: pos.y })
            }
            bounds="parent"
            disableDragging={isEditing}
            enableResizing={{ right: true, left: true, bottomRight: true }}
            className="group"
            style={{ zIndex: isSelected ? 50 : 30 }}
        >
            <div
                ref={textRef}
                className="relative w-full h-full"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsSelected(true);
                    setShowToolbar(true);
                }}
            >
                {/* Glow border when selected */}
                {isSelected && (
                    <div className="absolute -inset-2 rounded-md border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.3)] pointer-events-none" />
                )}

                {/* Floating Toolbar */}
                {showToolbar && (
                    <div
                        className="absolute -top-14 left-0 flex items-center gap-1 rounded-xl shadow-2xl px-2 py-1.5 z-50 bg-black/90 border border-white/10 backdrop-blur-xl text-white"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Font Family */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-white/10 transition-colors"
                                onClick={() => { setShowFontMenu(!showFontMenu); setShowWeightMenu(false); }}
                            >
                                <Type size={12} />
                                <span>{FONTS.find(f => f.value === fontFamily)?.label || "Font"}</span>
                                <ChevronDown size={10} />
                            </button>
                            {showFontMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-black/95 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden min-w-[90px]">
                                    {FONTS.map(f => (
                                        <button
                                            key={f.value}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${fontFamily === f.value ? "text-cyan-400" : "text-white"}`}
                                            onClick={() => { onChange({ styles: { ...element.styles, fontFamily: f.value } }); setShowFontMenu(false); }}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-px h-5 bg-white/20" />

                        {/* Font Weight */}
                        <div className="relative">
                            <button
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-white/10 transition-colors"
                                onClick={() => { setShowWeightMenu(!showWeightMenu); setShowFontMenu(false); }}
                            >
                                <Bold size={12} />
                                <ChevronDown size={10} />
                            </button>
                            {showWeightMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-black/95 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden min-w-[90px]">
                                    {WEIGHTS.map(w => (
                                        <button
                                            key={w.value}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${fontWeight === w.value ? "text-cyan-400" : "text-white"}`}
                                            style={{ fontWeight: w.value }}
                                            onClick={() => { onChange({ styles: { ...element.styles, fontWeight: w.value } }); setShowWeightMenu(false); }}
                                        >
                                            {w.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="w-px h-5 bg-white/20" />

                        {/* Font Size */}
                        <div className="flex items-center gap-1">
                            <button
                                className="rounded-md p-1 hover:bg-white/10 transition-colors"
                                onClick={() => onChange({ styles: { ...element.styles, fontSize: `${Math.max(8, fontSize - 2)}px` } })}
                            ><Minus size={11} /></button>
                            <span className="text-xs font-mono w-6 text-center">{fontSize}</span>
                            <button
                                className="rounded-md p-1 hover:bg-white/10 transition-colors"
                                onClick={() => onChange({ styles: { ...element.styles, fontSize: `${Math.min(120, fontSize + 2)}px` } })}
                            ><Plus size={11} /></button>
                        </div>

                        <div className="w-px h-5 bg-white/20" />

                        {/* Color Swatches */}
                        <div className="flex items-center gap-0.5">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    title={c}
                                    className={`w-4 h-4 rounded-full border transition-all ${color === c ? "border-white scale-110" : "border-white/20 hover:scale-110"}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => onChange({ styles: { ...element.styles, color: c } })}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange({ styles: { ...element.styles, color: e.target.value } })}
                                className="w-4 h-4 rounded-full border-0 cursor-pointer overflow-hidden"
                                title="Custom color"
                            />
                        </div>

                        <div className="w-px h-5 bg-white/20" />

                        {/* Remove */}
                        <button
                            className="rounded-md p-1 hover:bg-red-500/20 text-red-400 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {/* Editable Content */}
                <div
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setIsEditing(true)}
                    onBlur={(e) => { setIsEditing(false); onChange({ content: e.currentTarget.innerText }); }}
                    className={`outline-none cursor-text min-w-[60px] w-full ${fontFamily} drop-shadow-lg`}
                    style={{
                        fontSize: element.styles?.fontSize || "18px",
                        fontWeight: element.styles?.fontWeight || "400",
                        color: element.styles?.color || "#ffffff",
                        whiteSpace: "pre-wrap",
                        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    }}
                >
                    {element.content}
                </div>
            </div>
        </Rnd>
    );
}
