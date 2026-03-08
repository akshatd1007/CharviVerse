"use client";

import { useRef, useState, useEffect } from "react";
import { Photo } from "./Uploader";
import { Template } from "@/lib/templates";
import { PageElement } from "@/lib/types";
import { Page } from "./Page";
import { ChevronRight, ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "./EditableText";
import { StickerElement } from "./StickerElement";

// ── Inline-editable text helper ────────────────────────────────────────────────
// Uses ref to set initial content so contentEditable is never
// combined with dangerouslySetInnerHTML (which causes null crashes on blur).
function E({ id, texts, setTexts, fallback = "", className = "", style, isViewerMode }: {
    id: string;
    texts: Record<string, string>;
    setTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    fallback?: string;
    className?: string;
    style?: React.CSSProperties;
    isViewerMode?: boolean;
}) {
    const value = texts[id] ?? fallback;
    const ref = useRef<HTMLSpanElement>(null);
    // Sync on first mount — thereafter the user's keystrokes own the DOM
    const initialised = useRef(false);
    useEffect(() => {
        if (ref.current && !initialised.current) {
            ref.current.innerText = value;
            initialised.current = true;
        }
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <span
            ref={ref}
            contentEditable={!isViewerMode}
            suppressContentEditableWarning
            className={`outline-none ${!isViewerMode ? 'cursor-text select-text' : ''} ${className}`}
            style={style}
            onMouseDown={e => { if (!isViewerMode) e.stopPropagation() }}
            onPointerDown={e => { if (!isViewerMode) e.stopPropagation() }}
            onTouchStart={e => { if (!isViewerMode) e.stopPropagation() }}
            onBlur={e => {
                if (isViewerMode) return;
                const text = ref.current?.innerText ?? "";
                setTexts(prev => ({ ...prev, [id]: text }));
            }}
        />
    );
}

interface MagazinePreviewProps {
    photos: Photo[];
    template: Template;
    elements: PageElement[];
    onElementChange: (id: string, updated: Partial<PageElement>) => void;
    onElementRemove: (id: string) => void;
    texts: Record<string, string>;
    setTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isViewerMode?: boolean;
    isExportMode?: boolean;
}

// Varied inner page layouts to make things eye-catching
type LayoutVariant = "full-bleed" | "hero-text" | "duo-left" | "caption-right" | "polaroid" | "triple-strip";

function getLayout(i: number, total: number): LayoutVariant {
    const layouts: LayoutVariant[] = ["full-bleed", "hero-text", "duo-left", "caption-right", "polaroid", "triple-strip"];
    // Cycle through layouts ensuring variety
    return layouts[i % layouts.length];
}


// ── Media Component ─────────────────────────────────────────────────────────────
function Media({ photo, className = "", style = {}, alt = "", side = "right" }: { photo: Photo, className?: string, style?: React.CSSProperties, alt?: string, side?: "left" | "right" }) {
    const [isMuted, setIsMuted] = useState(true);

    if (!photo) return null;
    if (photo.type === "video") {
        return (
            <div className={`relative group w-full h-full ${className}`} style={{ ...style, overflow: 'hidden' }}>
                <video
                    src={photo.url}
                    className="w-full h-full"
                    style={{ objectFit: "cover" }}
                    playsInline
                    muted={isMuted}
                    loop
                    autoPlay
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                />
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMuted(!isMuted); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`absolute top-4 ${side === 'left' ? 'left-4' : 'right-4'} z-[60] p-2.5 rounded-full bg-black/60 text-white opacity-70 hover:opacity-100 hover:scale-110 transition-all hover:bg-black/90 backdrop-blur-md shadow-2xl flex items-center justify-center pointer-events-auto`}
                    title={isMuted ? "Unmute video" : "Mute video"}
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            </div>
        );
    }
    return <img crossOrigin="anonymous" src={photo.url} alt={alt} className={className} style={style} draggable={false} onDragStart={(e) => e.preventDefault()} />;
}
export function MagazinePreview({ photos, template, elements, onElementChange, onElementRemove, texts, setTexts, isViewerMode, isExportMode }: MagazinePreviewProps) {

    const [isMounted, setIsMounted] = useState(false);
    const [spreadIdx, setSpreadIdx] = useState(0);

    // DOM refs for the turning page elements (Web Animations API — no React overhead)
    const rightFlipEl = useRef<HTMLDivElement>(null);
    const leftFlipEl = useRef<HTMLDivElement>(null);
    // Base layer refs — toggled via style.visibility (zero re-renders)
    const rightBaseRef = useRef<HTMLDivElement>(null);
    const leftBaseRef = useRef<HTMLDivElement>(null);
    // In-progress guards
    const isFlippingRightRef = useRef(false);
    const isFlippingLeftRef = useRef(false);
    type DragState = { active: boolean; startX: number; currentAngle: number };
    const rightDragRef = useRef<DragState>({ active: false, startX: 0, currentAngle: 0 });
    const leftDragRef = useRef<DragState>({ active: false, startX: 0, currentAngle: 0 });
    const hoverTimeouts = useRef<{ left: NodeJS.Timeout | null, right: NodeJS.Timeout | null }>({ left: null, right: null });

    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        isFlippingRightRef.current = false;
        isFlippingLeftRef.current = false;
        rightDragRef.current.active = false;
        leftDragRef.current.active = false;

        if (rightFlipEl.current) rightFlipEl.current.style.transform = 'rotateY(0deg)';
        if (leftFlipEl.current) leftFlipEl.current.style.transform = 'rotateY(0deg)';
        if (rightBaseRef.current) rightBaseRef.current.style.visibility = 'hidden';
        if (leftBaseRef.current) leftBaseRef.current.style.visibility = 'hidden';
    }, [template.id]);

    if (!isMounted) return null;

    const coverPhoto = photos[0];
    const innerPhotos = photos.slice(1);


    if (!coverPhoto) return null;

    const fadeUp = {
        initial: isExportMode ? false as const : { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: "easeOut" as const }
    };

    const pages: React.ReactNode[] = [];

    // ─── FRONT COVER ────────────────────────────────────────────────────────────
    pages.push(
        <Page key="cover-front" className={`${template.coverClass} relative flex flex-col items-center justify-center overflow-hidden group w-full h-full`}>
            <motion.div
                className="absolute inset-0 w-full h-full z-0 overflow-hidden"
                initial={isExportMode ? false : { scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            >
                <Media
                    photo={coverPhoto}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${template.coverLayout === 'fashion' ? 'grayscale opacity-90' : template.coverLayout === 'tech' ? 'opacity-70' : 'opacity-100'}`}
                    alt="Cover background"
                    side="right"
                />
            </motion.div>
            <div className={`absolute inset-0 z-[5] pointer-events-none ${template.coverOverlayClass}`} />

            {template.coverLayout === "fashion" && (
                <div className="z-10 flex flex-col w-full h-full justify-between pt-8 pb-8 px-6">
                    <motion.div className="w-full text-center mt-0 z-20 relative flex flex-col items-center" {...fadeUp} transition={{ delay: 0.1, duration: 0.8 }}>
                        <div className="w-full relative flex items-center justify-center">
                            <h1 className={`${template.fontHeading}`}>
                                <E id="cover-fashion-title" texts={texts} setTexts={setTexts} fallback="VOGUE" isViewerMode={isViewerMode} />
                            </h1>
                            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 uppercase text-[0.45rem] tracking-[0.3em] font-sans font-bold text-white/80 z-20">
                                <E id="cover-fashion-sub" texts={texts} setTexts={setTexts} fallback="INDIA" isViewerMode={isViewerMode} />
                            </div>
                        </div>
                    </motion.div>
                    <div className="flex flex-col h-full justify-center w-full mt-24 px-4 z-20">
                        <motion.div className="flex flex-col text-left text-white/90 mb-12" {...fadeUp} transition={{ delay: 0.3, duration: 0.8 }}>
                            <span className="font-serif text-[0.45rem] leading-[1.2] uppercase tracking-[0.2em]">
                                <E id="cover-fashion-date" texts={texts} setTexts={setTexts} fallback="Mar&#10;Apr&#10;2026&#10;₹400" isViewerMode={isViewerMode} />
                            </span>
                        </motion.div>
                        <motion.div className="flex flex-col text-left text-white mb-24 max-w-[65%]" {...fadeUp} transition={{ delay: 0.4, duration: 0.8 }}>
                            <h2 className="font-[family-name:var(--font-bodoni)] text-2xl lg:text-3xl leading-[1.1] text-white">
                                <E id="cover-fashion-name" texts={texts} setTexts={setTexts} fallback="CHARVI&#10;YOUR&#10;NAME" isViewerMode={isViewerMode} />
                            </h2>
                        </motion.div>
                        <motion.div className="flex flex-col text-left text-white/80 max-w-[50%]" {...fadeUp} transition={{ delay: 0.5, duration: 0.8 }}>
                            <p className="font-sans text-[0.55rem] uppercase tracking-wider leading-[1.4] font-medium">
                                <E id="cover-fashion-quote" texts={texts} setTexts={setTexts} fallback='"Click to edit this quote"' isViewerMode={isViewerMode} />
                            </p>
                        </motion.div>
                    </div>
                </div>
            )}
            {template.coverLayout === "magazine" && (
                <div className="z-10 flex flex-col w-full h-full justify-between p-8">
                    <motion.div className="w-full flex justify-between items-start" {...fadeUp}>
                        <div className="bg-black/80 backdrop-blur-md text-white p-4 max-w-[80%] shadow-2xl">
                            <h1 className={`text-4xl uppercase font-black tracking-tight ${template.fontHeading}`}>
                                <E isViewerMode={isViewerMode} id="cover-mag-title" texts={texts} setTexts={setTexts} fallback="CHARVIVERSE" />
                            </h1>
                            <p className="text-[0.55rem] font-bold text-yellow-500 uppercase tracking-widest mt-1">
                                <E isViewerMode={isViewerMode} id="cover-mag-issue" texts={texts} setTexts={setTexts} fallback="Issue No. 04 / The Discovery" />
                            </p>
                        </div>
                        <div className="bg-yellow-500 text-black p-2 font-bold rotate-12 shadow-xl border-2 border-black ml-2">
                            <E isViewerMode={isViewerMode} id="cover-mag-badge" texts={texts} setTexts={setTexts} fallback="NEW!" className="text-xs" />
                        </div>
                    </motion.div>
                    <motion.div className="flex flex-col gap-2 self-end text-right max-w-[75%] bg-white/95 text-black p-4 border-l-4 border-yellow-500 shadow-2xl" {...fadeUp} transition={{ delay: 0.3 }}>
                        <h2 className="font-black text-lg uppercase leading-tight">
                            <E isViewerMode={isViewerMode} id="cover-mag-h2" texts={texts} setTexts={setTexts} fallback="Unlocking The Future" />
                        </h2>
                        <p className="text-[0.65rem] font-serif italic text-stone-600 mt-1">
                            <E isViewerMode={isViewerMode} id="cover-mag-sub" texts={texts} setTexts={setTexts} fallback="A journey through modern landscapes & digital dreams." />
                        </p>
                    </motion.div>
                </div>
            )}
            {template.coverLayout === "scrapbook" && (
                <div className="z-10 flex flex-col items-center justify-center w-full p-8 relative h-full pointer-events-none">
                    <motion.div className="bg-[#f4ebd0] p-4 pb-12 shadow-2xl rotate-[-3deg] border border-stone-300 relative w-full pointer-events-auto" {...fadeUp}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 backdrop-blur-sm rotate-[2deg] shadow-sm"></div>
                        <div className="w-full aspect-square md:aspect-[4/3] overflow-hidden rounded-sm mb-4 bg-stone-200">
                            <Media photo={coverPhoto} className="w-full h-full object-cover filter sepia-[0.3]" side="right" />
                        </div>
                        <h1 className={`text-3xl text-center text-stone-800 ${template.fontHeading}`}>
                            <E isViewerMode={isViewerMode} id="cover-scrap-title" texts={texts} setTexts={setTexts} fallback="CharviVerse" />
                        </h1>
                        <p className="text-center font-serif text-stone-500 text-xs mt-1 font-bold italic">
                            <E isViewerMode={isViewerMode} id="cover-scrap-sub" texts={texts} setTexts={setTexts} fallback="Memories & Moments" />
                        </p>
                    </motion.div>
                </div>
            )}
            {template.coverLayout === "tech" && (
                <div className="z-10 flex flex-col items-center justify-between h-full w-full p-8 relative">
                    {/* Immersive Dark Gradient for readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />

                    <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-400 opacity-50 z-10"></div>
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-fuchsia-400 opacity-50 z-10"></div>
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-fuchsia-400 opacity-50 z-10"></div>
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-400 opacity-50 z-10"></div>

                    <motion.div className="mt-8 text-center relative z-20" {...fadeUp}>
                        <p className="text-cyan-400 font-mono text-[0.6rem] tracking-[0.5em] mb-2 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                            <E isViewerMode={isViewerMode} id="cover-tech-sys" texts={texts} setTexts={setTexts} fallback="System Init" />
                        </p>
                        <h1 className={`text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-black uppercase tracking-wider drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] w-full text-center break-words px-2`}>
                            <E isViewerMode={isViewerMode} id="cover-tech-title" texts={texts} setTexts={setTexts} fallback="CHARVIVERSE" />
                        </h1>

                    </motion.div>

                    <motion.div className="mb-4 w-full border border-cyan-500/30 bg-black/60 backdrop-blur-md p-3 text-cyan-400 font-mono text-[0.65rem] flex justify-between uppercase relative z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]" {...fadeUp} transition={{ delay: 0.3 }}>
                        <E isViewerMode={isViewerMode} id="cover-tech-status" texts={texts} setTexts={setTexts} fallback="[ ONLINE ]" />
                        <E isViewerMode={isViewerMode} id="cover-tech-version" texts={texts} setTexts={setTexts} fallback="v 2.0.4" />
                    </motion.div>
                </div>
            )}
            {(!template.coverLayout || template.coverLayout === "centered") && (
                <div className="z-10 flex flex-col items-center justify-center text-center p-12 h-full w-full pointer-events-none">
                    <motion.h1 className={`text-6xl mb-4 ${template.fontHeading} tracking-widest uppercase drop-shadow-sm font-light`} {...fadeUp} transition={{ delay: 0.1, duration: 0.8 }}>
                        <E isViewerMode={isViewerMode} id="cover-centered-title" texts={texts} setTexts={setTexts} fallback="CHARVIVERSE" />
                    </motion.h1>
                    <motion.div className="h-px w-24 bg-current opacity-40 mb-6" initial={isExportMode ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.4, duration: 1 }} />
                    <motion.h2 className="text-2xl font-light tracking-widest uppercase opacity-90 drop-shadow-md" {...fadeUp} transition={{ delay: 0.3, duration: 0.8 }}>
                        <E isViewerMode={isViewerMode} id="cover-centered-sub" texts={texts} setTexts={setTexts} fallback={template.name} />
                    </motion.h2>
                    <motion.p className="mt-auto pt-12 text-sm opacity-80 uppercase tracking-[0.3em] drop-shadow-md" {...fadeUp} transition={{ delay: 0.5, duration: 0.8 }}>
                        <E isViewerMode={isViewerMode} id="cover-centered-foot" texts={texts} setTexts={setTexts} fallback="The Premium Collection" />
                    </motion.p>
                </div>
            )}
        </Page>
    );

    // ─── INSIDE FRONT COVER ─────────────────────────────────────────────────────
    pages.push(
        <Page key="cover-inside-front" className={`${template.pageClass} relative flex items-center justify-center overflow-hidden`}>
            {coverPhoto && (
                <div className="absolute inset-0">
                    <Media photo={coverPhoto} className="w-full h-full object-cover blur-2xl opacity-20 scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-transparent" />
                </div>
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-center px-10">
                <div className="w-12 h-px bg-current opacity-20 mb-2" />
                <span className="font-serif italic text-3xl opacity-25 tracking-widest">CharviVerse</span>
                <span className="font-mono text-[0.45rem] uppercase tracking-[0.5em] opacity-15">Premium Magazines</span>
                <div className="w-12 h-px bg-current opacity-20 mt-2" />
            </div>
        </Page>
    );

    // Per-template accent palette for inner page text panels
    const accentMap: Record<string, { bg: string; text: string; tag: string }> = {
        minimal: { bg: "bg-zinc-900", text: "text-white", tag: "bg-white text-zinc-900" },
        wedding: { bg: "bg-[#fbf1ea]", text: "text-[#5a4038]", tag: "bg-rose-200 text-rose-900" },
        travel: { bg: "bg-[#1e293b]", text: "text-slate-100", tag: "bg-yellow-400 text-black" },
        vintage: { bg: "bg-[#e8decb]", text: "text-[#4a3b32]", tag: "bg-stone-700 text-[#e8decb]" },
        cyberpunk: { bg: "bg-black", text: "text-cyan-400", tag: "bg-cyan-400 text-black" },
        glassmorphism: { bg: "bg-white/15", text: "text-white", tag: "bg-white/30 text-white" },
        y2k: { bg: "bg-pink-100", text: "text-blue-600", tag: "bg-blue-500 text-white" },
        editorial: { bg: "bg-black", text: "text-white", tag: "bg-white text-black" },
    };
    const accent = accentMap[template.id] ?? { bg: "bg-zinc-900", text: "text-white", tag: "bg-white text-black" };

    const editorialTitles = [
        "The Golden Hour", "A Still Moment", "Light & Shadow",
        "Soft Focus", "The Untold Story", "Pure Beauty",
        "Beyond Words", "In the Frame", "Timeless"
    ];
    const editorialCaptions = [
        "Captured in a fleeting second, this image holds the quiet power of something extraordinary.",
        "Where ordinary meets remarkable — every pixel a testament to the beauty around us.",
        "A story without words, told entirely through light, form, and the passage of time.",
        "Some moments need no caption. They simply are. And that is more than enough.",
        "The camera sees what the eye forgets — the texture of now, preserved forever.",
    ];

    // ─── INNER PAGES ─────────────────────────────────────────────────────────────
    innerPhotos.forEach((photo, i) => {
        const layout = getLayout(i, innerPhotos.length);
        const isFullBleed = template.layoutType === "fullbleed";
        const pageIndex = i + 1;
        const pageElements = elements.filter(e => e.pageIndex === pageIndex);
        const title = editorialTitles[i % editorialTitles.length];
        const caption = editorialCaptions[i % editorialCaptions.length];
        const pg = String(i + 1).padStart(2, "0");
        const total = String(innerPhotos.length).padStart(2, "0");
        const side = (i + 1) % 2 !== 0 ? "left" : "right";

        pages.push(
            <Page key={photo.id} className={`${template.pageClass} relative overflow-hidden`}>

                {/* ══ LAYOUT 1: FULL BLEED ══════════════════════════════════════ */}
                {(isFullBleed || layout === "full-bleed") && (
                    <div className="absolute inset-0">
                        <motion.div
                            className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                            initial={isExportMode ? false : { scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.9 }} whileHover={{ scale: 1.03 }}
                        >
                            <Media photo={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover object-center" side={side} />
                        </motion.div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30 pointer-events-none" />
                        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-4 pointer-events-none">
                            <span className="font-mono text-white/40 text-[0.45rem] tracking-[0.5em] uppercase">CharviVerse</span>
                            <span className="font-mono text-white/30 text-[0.45rem]">{pg}/{total}</span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 px-6 pb-6">
                            <div className="flex items-end justify-between">
                                <div className="max-w-[72%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-[1.5px] bg-white/60" />
                                        <span className="text-white/50 font-sans text-[0.4rem] uppercase tracking-[0.4em]">Featured</span>
                                    </div>
                                    <h2 className="font-serif text-white text-xl leading-[1.1] font-bold">
                                        <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                                    </h2>
                                    <p className="text-white/50 text-[0.55rem] mt-1.5 leading-relaxed font-sans">
                                        <E isViewerMode={isViewerMode} id={`p${i}-caption`} texts={texts} setTexts={setTexts} fallback={caption} />
                                    </p>
                                </div>
                                <span className="font-mono text-[0.45rem] border border-white/20 px-2 py-1 text-white/40">LOOK {pg}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ LAYOUT 2: HERO + TEXT PANEL ══════════════════════════════ */}
                {!isFullBleed && layout === "hero-text" && (
                    <div className="flex flex-col h-full">
                        <div className="relative overflow-hidden" style={{ height: "62%" }}>
                            <motion.div
                                className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                initial={isExportMode ? false : { scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.8 }} whileHover={{ scale: 1.04 }}
                            >
                                <Media photo={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover object-center" side={side} />
                            </motion.div>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
                            <span className={`absolute top-3 right-3 px-2 py-0.5 text-[0.42rem] font-mono font-bold uppercase tracking-[0.3em] ${accent.tag}`}>{pg}</span>
                        </div>
                        <div className={`flex-1 flex flex-col justify-between px-6 py-5 ${accent.bg} ${accent.text}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <div className="w-5 h-[1.5px] bg-current opacity-30" />
                                    <span className="text-[0.4rem] uppercase tracking-[0.5em] opacity-35 font-sans">Featured Moment</span>
                                    <div className="flex-1 h-px bg-current opacity-8" />
                                </div>
                                <h2 className="font-serif text-xl font-bold leading-[1.15] mt-1">
                                    <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                                </h2>
                                <div className="relative mt-3 pl-3">
                                    <span className="absolute -top-2 -left-0 font-serif text-3xl leading-none opacity-10 select-none">&ldquo;</span>
                                    <p className="text-[0.57rem] leading-relaxed opacity-50 font-sans">
                                        <E isViewerMode={isViewerMode} id={`p${i}-caption`} texts={texts} setTexts={setTexts} fallback={caption} />
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-3 border-t border-current/10">
                                <span className="font-mono text-[0.4rem] tracking-[0.3em] opacity-20 uppercase">CharviVerse</span>
                                <span className="font-mono text-[0.4rem] opacity-20">{pg}/{total}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ LAYOUT 3: PHOTO LEFT, EDITORIAL TEXT RIGHT ════════════════ */}
                {!isFullBleed && layout === "duo-left" && (
                    <div className="flex h-full">
                        <div className="relative overflow-hidden flex-shrink-0" style={{ width: "58%" }}>
                            <motion.div
                                className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                initial={isExportMode ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.7 }} whileHover={{ scale: 1.04 }}
                            >
                                <Media photo={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover object-center" side={side} />
                            </motion.div>
                        </div>
                        <div className={`flex-1 flex flex-col ${accent.bg} ${accent.text} px-5 py-6`}>
                            <div className="flex items-center gap-1.5 mb-5">
                                <div className={`w-3 h-3 rounded-full opacity-50 ${accent.tag.split(" ")[0]}`} />
                                <span className="text-[0.4rem] uppercase tracking-[0.45em] opacity-30 font-sans">Collection</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <h2 className="font-serif text-2xl font-bold leading-[1.05] mb-3">
                                    <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                                </h2>
                                <div className="w-8 h-[2px] mb-3 bg-current opacity-30" />
                                <p className="text-[0.54rem] leading-relaxed opacity-45 font-sans">
                                    <E isViewerMode={isViewerMode} id={`p${i}-caption`} texts={texts} setTexts={setTexts} fallback={caption} />
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-current/10">
                                <span className="font-mono text-[0.38rem] tracking-[0.3em] opacity-15 uppercase">CharviVerse</span>
                                <span className="font-mono text-[0.42rem] opacity-20">{pg}/{total}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ LAYOUT 4: COLOUR-BLOCKED LEFT, PHOTO RIGHT ════════════════ */}
                {!isFullBleed && layout === "caption-right" && (
                    <div className="flex h-full">
                        <div className={`flex flex-col justify-between px-5 py-6 flex-shrink-0 ${accent.bg} ${accent.text}`} style={{ width: "36%" }}>
                            <div>
                                <span className={`inline-block text-[0.4rem] uppercase tracking-[0.4em] font-bold px-2 py-0.5 mb-4 ${accent.tag}`}>Lookbook</span>
                                <h2 className="font-serif text-2xl font-bold leading-[1.05] mb-3">
                                    <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                                </h2>
                                <div className="w-6 h-[2px] mb-3 bg-current opacity-30" />
                                <p className="text-[0.52rem] leading-relaxed opacity-40 font-sans">
                                    <E isViewerMode={isViewerMode} id={`p${i}-caption`} texts={texts} setTexts={setTexts} fallback={caption} />
                                </p>
                            </div>
                            <div>
                                <div className="font-mono text-[2.2rem] font-black opacity-[0.07] leading-none select-none">{pg}</div>
                                <span className="font-mono text-[0.38rem] uppercase tracking-[0.3em] opacity-20">of {total}</span>
                            </div>
                        </div>
                        <div className="flex-1 relative overflow-hidden">
                            <motion.div
                                className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                initial={isExportMode ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.7 }} whileHover={{ scale: 1.04 }}
                            >
                                <Media photo={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover object-center" side={side} />
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* ══ LAYOUT 5: POLAROID on textured panel ═════════════════════ */}
                {!isFullBleed && layout === "polaroid" && (
                    <div className={`flex flex-col items-center justify-center h-full gap-6 ${accent.bg}`}>
                        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                        <span className={`relative z-10 text-[0.4rem] uppercase tracking-[0.6em] opacity-25 font-mono ${accent.text}`}>Frame No. {pg}</span>
                        <motion.div
                            className="relative bg-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] z-10"
                            style={{ padding: "10px 10px 50px 10px", rotate: (i % 3 - 1) * 5, width: "74%", maxWidth: "250px" }}
                            whileHover={{ rotate: 0, scale: 1.06, transition: { type: "spring", stiffness: 180, damping: 14 } }}
                        >
                            <Media photo={photo} alt={`Photo ${i + 1}`} className="w-full object-cover block" style={{ aspectRatio: "4/3" }} side={side} />
                            <div className="absolute -top-4 left-1/2 w-16 h-7 rotate-[−1deg] shadow-sm"
                                style={{ transform: "translateX(-50%) rotate(-1deg)", background: "rgba(255,250,200,0.65)" }} />
                            <p className="absolute bottom-3 left-0 right-0 text-center text-stone-400 text-[0.58rem] italic font-serif">
                                <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                            </p>
                        </motion.div>
                        <span className={`relative z-10 text-[0.4rem] font-mono tracking-[0.4em] uppercase opacity-15 ${accent.text}`}>CharviVerse · 2026</span>
                    </div>
                )}

                {/* ══ LAYOUT 6: EDITORIAL MAGAZINE GRID ════════════════════════ */}
                {!isFullBleed && layout === "triple-strip" && (
                    <div className="h-full w-full flex flex-col">
                        {/* Hero image — 55% height with overlaid title */}
                        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "55%" }}>
                            <motion.div
                                className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                initial={isExportMode ? false : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7 }} whileHover={{ scale: 1.03 }}
                            >
                                <Media photo={photo} alt={`Photo ${i + 1} — hero`} className="w-full h-full object-cover object-center" side={side} />
                            </motion.div>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45 pointer-events-none" />
                            <div className="absolute bottom-3 left-4 right-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <div className="w-4 h-[1.5px] bg-white/60" />
                                    <span className="text-white/45 text-[0.38rem] uppercase tracking-[0.5em] font-sans">Featured</span>
                                </div>
                                <h2 className="font-serif text-white text-base font-bold leading-tight">
                                    <E isViewerMode={isViewerMode} id={`p${i}-title`} texts={texts} setTexts={setTexts} fallback={title} />
                                </h2>
                            </div>
                        </div>
                        {/* Bottom bar: text + two crops */}
                        <div className="flex flex-1">
                            <div className={`flex flex-col justify-between px-4 py-3 ${accent.bg} ${accent.text}`} style={{ width: "40%" }}>
                                <p className="text-[0.51rem] leading-relaxed opacity-45 font-sans">
                                    <E isViewerMode={isViewerMode} id={`p${i}-caption`} texts={texts} setTexts={setTexts} fallback={caption} />
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="w-4 h-[1.5px] bg-current opacity-25" />
                                    <span className="font-mono text-[0.38rem] opacity-15">{pg}</span>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="relative flex-1 overflow-hidden border-b border-white/8">
                                    <motion.div
                                        className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                        initial={isExportMode ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                                        whileHover={{ scale: 1.08 }}
                                    >
                                        <Media photo={photo} alt="detail-top" className="w-full h-full object-cover object-top" side={side} />
                                    </motion.div>
                                </div>
                                <div className="relative flex-1 overflow-hidden">
                                    <motion.div
                                        className={`w-full h-full absolute inset-0 ${template.imageClass}`}
                                        initial={isExportMode ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                                        whileHover={{ scale: 1.08 }}
                                    >
                                        <Media photo={photo} alt="detail-bottom" className="w-full h-full object-cover object-bottom" side={side} />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TEMPLATE DECORATIONS ──────────────────────── */}
                {template.decorations === "tape" && <div className="absolute top-0 left-1/2 w-16 h-6 bg-white/50 backdrop-blur-md -translate-x-1/2 rotate-[-2deg] shadow-sm z-10 pointer-events-none" />}
                {template.decorations === "stamps" && i % 2 === 0 && (
                    <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full border border-stone-400 flex items-center justify-center rotate-12 opacity-40 z-10 mix-blend-multiply pointer-events-none">
                        <span className="font-serif text-[10px] uppercase text-center text-stone-600 font-bold">CharviVerse<br />Memories</span>
                    </div>
                )}
                {template.decorations === "floral" && (
                    <div className="absolute -top-4 -left-4 w-16 h-16 opacity-30 text-rose-800 pointer-events-none z-10">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" className="fill-current opacity-10" />
                            <path d="M12 6a6 6 0 0 0-6 6c0 1.66.67 3.16 1.76 4.24l.05.05.3.3.4.4.3.3A5.98 5.98 0 0 0 12 18c1.66 0 3.16-.67 4.24-1.76l.2-.2L16.63 16l.22-.22A5.98 5.98 0 0 0 18 12a6 6 0 0 0-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                        </svg>
                    </div>
                )}
                {template.decorations === "glitch" && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-fuchsia-500/10 mix-blend-overlay pointer-events-none" />
                        <div className="absolute top-4 left-4 w-12 h-1 bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse pointer-events-none" />
                        <div className="absolute bottom-4 right-4 text-xs font-mono text-fuchsia-500 tracking-widest opacity-50 pointer-events-none">SYS.ERR // {i + 1}</div>
                    </>
                )}
                {template.decorations === "glass" && (
                    <>
                        <div className="absolute top-8 -left-8 w-32 h-32 bg-blue-400/30 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-pink-400/30 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute inset-4 rounded-xl border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] pointer-events-none" />
                    </>
                )}
                {template.decorations === "mesh" && (
                    <>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(255,105,180,0.5),transparent_70%)] pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/40 to-transparent pointer-events-none z-0" />
                        {i % 2 === 0 && <div className="absolute top-4 left-4 text-2xl filter drop-shadow-[2px_2px_0_white] pointer-events-none">✨</div>}
                    </>
                )}
                {template.decorations === "editorial" && (
                    <>
                        <div className="absolute top-0 left-0 bottom-0 w-12 lg:w-16 bg-white/80 border-r border-[#e5e5e5] flex items-center justify-center pointer-events-none">
                            <span className="font-serif italic text-3xl lg:text-4xl -rotate-90 text-[#d4d4d4] whitespace-nowrap drop-shadow-sm">VOGUE</span>
                        </div>
                        <div className="absolute bottom-6 right-6 text-right pointer-events-none bg-white p-2 md:p-3 shadow-2xl">
                            <span className="block font-sans text-[0.55rem] uppercase tracking-[0.3em] font-bold text-black border-b border-black/20 pb-1 mb-1">Lookbook {i + 1}</span>
                            <span className="block font-serif italic text-[0.6rem] text-stone-600 mt-1">S/S Collection</span>
                        </div>
                    </>
                )}

                {/* ── PAGE NUMBER ──────────────────────────────── */}
                <div className="absolute bottom-3 font-serif text-xs opacity-30 left-1/2 -translate-x-1/2 pointer-events-none">
                    {i + 1}
                </div>

                {/* Elements are rendered in an overlay on top of flipbook — see below */}
            </Page>
        );
    });

    // ─── INSIDE BACK COVER ───────────────────────────────────────────────────────
    if (innerPhotos.length % 2 !== 0) {
        pages.push(
            <Page key="cover-inside-back" className={`${template.pageClass} flex items-center justify-center`}>
                <div className="opacity-10 w-32 h-32 rounded-full border border-current" />
            </Page>
        );
    }

    // ─── BACK COVER ──────────────────────────────────────────────────────────────
    pages.push(
        <Page key="cover-back" className={`${template.coverClass} flex flex-col items-center justify-center`}>
            <div className="w-16 h-16 border border-current rounded-full flex items-center justify-center mb-4 opacity-70">
                <span className="font-serif text-xl">C</span>
            </div>
            <p className="font-sans text-xs uppercase tracking-widest opacity-60">Created with CharviVerse</p>
        </Page>
    );





    // ─── BUILD SPREADS ──────────────────────────────────────────────────────────
    type Spread = { leftIdx: number | null; rightIdx: number | null };
    const spreads: Spread[] = [];
    spreads.push({ leftIdx: null, rightIdx: 0 });
    let si = 1;
    while (si < pages.length - 1) {
        spreads.push({ leftIdx: si, rightIdx: si + 1 < pages.length - 1 ? si + 1 : null });
        si += 2;
    }
    spreads.push({ leftIdx: pages.length - 1, rightIdx: null });

    const totalSpreads = spreads.length;
    const cur = spreads[spreadIdx];
    const nxt = spreadIdx < totalSpreads - 1 ? spreads[spreadIdx + 1] : null;
    const prv = spreadIdx > 0 ? spreads[spreadIdx - 1] : null;

    const pageContent = (idx: number | null, useCover = false) => {
        if (idx === null) return <div className={`w-full h-full ${template.coverClass}`} />;

        const pageElements = elements.filter(e => e.pageIndex === idx);

        return (
            <div className={`w-full h-full relative overflow-hidden ${useCover ? template.coverClass : template.pageClass}`}>
                {(pages[idx] as any)?.props?.children}

                {/* ── PER-PAGE ELEMENTS ──────────────────── */}
                {pageElements.map(el =>
                    el.type === 'text' ? (
                        <EditableText key={el.id} element={el}
                            onChange={u => onElementChange(el.id, u)}
                            onRemove={() => onElementRemove(el.id)}
                            isPreview={isViewerMode} />
                    ) : (
                        <StickerElement key={el.id} element={el}
                            onChange={u => onElementChange(el.id, u)}
                            onRemove={() => onElementRemove(el.id)}
                            isPreview={isViewerMode} />
                    )
                )}
            </div>
        );
    };
    const isCoverPage = (idx: number | null) => idx === 0 || idx === pages.length - 1;

    const PAGE_W = 300;
    const PAGE_H = 430;

    // NOTE: `overflow: hidden` on a parent of `transform-style: preserve-3d` FLATTENS
    // the 3D context → software rendering. Page containers must use overflow: visible.
    // Individual face divs clip their own content.

    // ─── BASE LAYER VISIBILITY (pure DOM, zero React re-renders) ──────────────
    const showRightBase = () => { if (rightBaseRef.current) rightBaseRef.current.style.visibility = 'visible'; };
    const hideRightBase = () => { if (rightBaseRef.current) rightBaseRef.current.style.visibility = 'hidden'; };
    const showLeftBase = () => { if (leftBaseRef.current) leftBaseRef.current.style.visibility = 'visible'; };
    const hideLeftBase = () => { if (leftBaseRef.current) leftBaseRef.current.style.visibility = 'hidden'; };

    // ─── WEB-ANIMATIONS FLIP ENGINE ────────────────────────────────────────────
    const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

    const runFlip = (
        el: HTMLDivElement | null,
        from: number, to: number,
        durationMs: number,
        onDone: () => void
    ) => {
        if (!el) return;
        el.style.transition = '';
        el.getAnimations().forEach(a => a.cancel());
        const dur = isNaN(durationMs) || durationMs <= 0 || !isFinite(durationMs) ? 200 : durationMs;
        const anim = el.animate(
            [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
            { duration: dur, easing: EASE, fill: 'forwards', composite: 'replace' }
        );
        anim.onfinish = () => {
            el.getAnimations().forEach(a => a.cancel());
            el.style.transform = `rotateY(${to}deg)`;
            el.style.boxShadow = 'none';
            onDone();
        };
    };

    const triggerNext = (fromAngle = 0) => {
        if (spreadIdx >= totalSpreads - 1 || isFlippingRightRef.current) return;
        isFlippingRightRef.current = true;
        showRightBase();
        const dur = Math.max(200, Math.round(580 * Math.abs(-180 - fromAngle) / 180));
        runFlip(rightFlipEl.current, fromAngle, -180, dur, () => {
            isFlippingRightRef.current = false;
            hideRightBase();
            setSpreadIdx(p => p + 1);
            // reset in next frame after React repaints new spread content
            requestAnimationFrame(() => {
                if (rightFlipEl.current) rightFlipEl.current.style.transform = 'rotateY(0deg)';
            });
        });
    };

    const revertRight = (fromAngle = 0) => {
        hideRightBase();
        runFlip(rightFlipEl.current, fromAngle, 0, 280, () => {
            if (rightFlipEl.current) rightFlipEl.current.style.transform = 'rotateY(0deg)';
        });
    };

    const triggerPrev = (fromAngle = 0) => {
        if (spreadIdx <= 0 || isFlippingLeftRef.current) return;
        isFlippingLeftRef.current = true;
        showLeftBase();
        const dur = Math.max(200, Math.round(580 * Math.abs(180 - fromAngle) / 180));
        runFlip(leftFlipEl.current, fromAngle, 180, dur, () => {
            isFlippingLeftRef.current = false;
            hideLeftBase();
            setSpreadIdx(p => p - 1);
            requestAnimationFrame(() => {
                if (leftFlipEl.current) leftFlipEl.current.style.transform = 'rotateY(0deg)';
            });
        });
    };

    const revertLeft = (fromAngle = 0) => {
        hideLeftBase();
        runFlip(leftFlipEl.current, fromAngle, 0, 280, () => {
            if (leftFlipEl.current) leftFlipEl.current.style.transform = 'rotateY(0deg)';
        });
    };

    // ─── HOVER CURL HANDLERS ───────────────────────────────────────────────────
    const onRightHoverEnter = () => {
        if (spreadIdx >= totalSpreads - 1 || isFlippingRightRef.current || rightDragRef.current.active) return;
        if (hoverTimeouts.current.right) clearTimeout(hoverTimeouts.current.right);
        showRightBase();
        const el = rightFlipEl.current;
        if (el) {
            el.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
            el.style.transform = 'rotateY(-12deg)';
            el.style.boxShadow = '-15px 0 30px rgba(0,0,0,0.15)';
        }
    };

    const onRightHoverLeave = () => {
        if (rightDragRef.current.active || isFlippingRightRef.current) return;
        const el = rightFlipEl.current;
        if (el) {
            el.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
            el.style.transform = 'rotateY(0deg)';
            el.style.boxShadow = 'none';
            hoverTimeouts.current.right = setTimeout(() => {
                if (!rightDragRef.current.active && !isFlippingRightRef.current) {
                    hideRightBase();
                    if (rightFlipEl.current) rightFlipEl.current.style.transition = '';
                }
            }, 400);
        }
    };

    const onLeftHoverEnter = () => {
        if (spreadIdx <= 0 || isFlippingLeftRef.current || leftDragRef.current.active) return;
        if (hoverTimeouts.current.left) clearTimeout(hoverTimeouts.current.left);
        showLeftBase();
        const el = leftFlipEl.current;
        if (el) {
            el.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
            el.style.transform = 'rotateY(12deg)';
            el.style.boxShadow = '15px 0 30px rgba(0,0,0,0.15)';
        }
    };

    const onLeftHoverLeave = () => {
        if (leftDragRef.current.active || isFlippingLeftRef.current) return;
        const el = leftFlipEl.current;
        if (el) {
            el.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
            el.style.transform = 'rotateY(0deg)';
            el.style.boxShadow = 'none';
            hoverTimeouts.current.left = setTimeout(() => {
                if (!leftDragRef.current.active && !isFlippingLeftRef.current) {
                    hideLeftBase();
                    if (leftFlipEl.current) leftFlipEl.current.style.transition = '';
                }
            }, 400);
        }
    };

    // ─── DRAG HANDLERS ─────────────────────────────────────────────────────────
    const onRightPtrDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (spreadIdx >= totalSpreads - 1 || isFlippingRightRef.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        if (hoverTimeouts.current.right) clearTimeout(hoverTimeouts.current.right);
        if (rightFlipEl.current) {
            rightFlipEl.current.style.transition = '';
            rightFlipEl.current.style.boxShadow = '-15px 0 30px rgba(0,0,0,0.2)';
        }
        rightFlipEl.current?.getAnimations().forEach(a => a.cancel());
        showRightBase();
        rightDragRef.current = { active: true, startX: e.clientX, currentAngle: 0 };
    };
    const onRightPtrMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!rightDragRef.current.active) return;
        const angle = Math.max(-180, Math.min(0, -((rightDragRef.current.startX - e.clientX) / (PAGE_W * 0.55)) * 180));
        if (rightFlipEl.current) {
            rightFlipEl.current.style.transform = `rotateY(${angle}deg)`;
            rightFlipEl.current.style.boxShadow = `-20px 0 40px rgba(0,0,0,${Math.min(0.5, Math.abs(angle / 180))})`;
        }
        rightDragRef.current.currentAngle = angle;
    };
    const onRightPtrUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!rightDragRef.current.active) return;
        rightDragRef.current.active = false;
        const dx = Math.abs(rightDragRef.current.startX - e.clientX);
        const cur = rightDragRef.current.currentAngle;
        if (dx < 6 || cur < -55) triggerNext(cur);
        else revertRight(cur);
    };

    const onLeftPtrDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (spreadIdx <= 0 || isFlippingLeftRef.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        if (hoverTimeouts.current.left) clearTimeout(hoverTimeouts.current.left);
        if (leftFlipEl.current) {
            leftFlipEl.current.style.transition = '';
            leftFlipEl.current.style.boxShadow = '15px 0 30px rgba(0,0,0,0.2)';
        }
        leftFlipEl.current?.getAnimations().forEach(a => a.cancel());
        showLeftBase();
        leftDragRef.current = { active: true, startX: e.clientX, currentAngle: 0 };
    };
    const onLeftPtrMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!leftDragRef.current.active) return;
        const angle = Math.max(0, Math.min(180, ((e.clientX - leftDragRef.current.startX) / (PAGE_W * 0.55)) * 180));
        if (leftFlipEl.current) {
            leftFlipEl.current.style.transform = `rotateY(${angle}deg)`;
            leftFlipEl.current.style.boxShadow = `20px 0 40px rgba(0,0,0,${Math.min(0.5, Math.abs(angle / 180))})`;
        }
        leftDragRef.current.currentAngle = angle;
    };
    const onLeftPtrUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!leftDragRef.current.active) return;
        leftDragRef.current.active = false;
        const dx = Math.abs(e.clientX - leftDragRef.current.startX);
        const cur = leftDragRef.current.currentAngle;
        if (dx < 6 || cur > 55) triggerPrev(cur);
        else revertLeft(cur);
    };

    const isFirstSpread = cur.leftIdx === null;
    const isLastSpread = cur.rightIdx === null;
    const bookWidth = (isFirstSpread || isLastSpread) ? PAGE_W + 4 : PAGE_W * 2 + 8;

    // ─── COMMON FACE STYLE: overflow hidden on each face, NOT the container ────
    const faceStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, overflow: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden' as any,
    };

    if (isExportMode) {
        return (
            <div
                data-export-id="pdf-export-container"
                className={`flex flex-col items-center gap-10 py-10 ${template.backgroundClass}`}
                style={{ width: PAGE_W * 1.2, minHeight: '100vh' }}
            >
                {Array.from({ length: photos.length }).map((_, i) => (
                    <div
                        key={i}
                        data-page-index={i}
                        style={{
                            width: PAGE_W,
                            height: PAGE_H,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: 'white'
                        }}
                    >
                        {pageContent(i, isCoverPage(i))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <motion.div
                data-export-id="magazine-preview-container"
                className={`h-full w-full flex flex-col items-center justify-center gap-6 transition-colors duration-700 ${template.backgroundClass}`}
                initial={isExportMode ? false : { opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* ── BOOK ─────────────────────────────────────────────────── */}
                {/* perspective MUST be on a parent of the preserve-3d element */}
                <div style={{ perspective: '2600px', perspectiveOrigin: '50% 40%' }} className="relative select-none">

                    {/* Desk shadow */}
                    <div className="absolute -bottom-3 left-[5%] right-[5%] h-7 blur-xl bg-black/40 rounded-full pointer-events-none" />

                    {/* Open book */}
                    <div className="flex relative" style={{
                        width: bookWidth, height: PAGE_H,
                        boxShadow: '0 35px 80px rgba(0,0,0,0.55)',
                    }}>

                        {/* ── LEFT PAGE ──────────────────────────────────── */}
                        {!isFirstSpread && (
                            /* overflow: VISIBLE — critical for preserve-3d parent */
                            <div className="flex-shrink-0 relative"
                                style={{
                                    width: PAGE_W, height: PAGE_H, overflow: 'visible',
                                    cursor: spreadIdx > 0 ? 'w-resize' : 'default'
                                }}
                                onPointerDown={onLeftPtrDown}
                                onPointerMove={onLeftPtrMove}
                                onPointerUp={onLeftPtrUp}
                            >
                                {/* Base: what's revealed when left page turns away (always rendered, visibility toggled via ref) */}
                                <div ref={leftBaseRef} className="absolute inset-0 overflow-hidden" style={{ visibility: 'hidden', zIndex: 0 }}>
                                    {pageContent(prv?.leftIdx ?? null, isCoverPage(prv?.leftIdx ?? null))}
                                </div>

                                {/* Turning page */}
                                <div ref={leftFlipEl} className="absolute inset-0" style={{
                                    transformStyle: 'preserve-3d',
                                    transformOrigin: 'right center',
                                    transform: 'rotateY(0deg)',
                                    willChange: 'transform',
                                    zIndex: 1,
                                }}>
                                    {/* Front: current left */}
                                    <div style={{ ...faceStyle, backgroundColor: 'transparent' }}>
                                        {pageContent(cur.leftIdx, isCoverPage(cur.leftIdx))}
                                        <div className="absolute inset-0 pointer-events-none" style={{
                                            background: 'linear-gradient(to left, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.02) 20%, transparent 45%)'
                                        }} />
                                    </div>
                                    {/* Back: prev spread's right page */}
                                    <div style={{ ...faceStyle, transform: 'rotateY(180deg)', backgroundColor: 'transparent' }}>
                                        {pageContent(prv?.rightIdx ?? null, isCoverPage(prv?.rightIdx ?? null))}
                                    </div>
                                </div>

                                {/* Spine shadow — inside page, no clipping issue */}
                                <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{
                                    background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.28))', zIndex: 5
                                }} />

                                {/* Hover hint left edge */}
                                {spreadIdx > 0 && (
                                    <div
                                        className="absolute inset-y-0 left-0 w-[24%] flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity duration-200"
                                        style={{ zIndex: 12, cursor: 'w-resize' }}
                                        onPointerEnter={onLeftHoverEnter}
                                        onPointerLeave={onLeftHoverLeave}
                                    >
                                        <div className="bg-black/25 backdrop-blur-sm rounded-r-full px-1.5 py-4 pointer-events-none">
                                            <ChevronLeft size={13} className="text-white/65" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SPINE ──────────────────────────────────────── */}
                        <div className="flex-shrink-0" style={{
                            width: isFirstSpread || isLastSpread ? 4 : 8, zIndex: 10,
                            background: 'linear-gradient(to right, #060606, #404040, #060606)',
                            boxShadow: '0 0 18px rgba(0,0,0,0.9)',
                        }} />

                        {/* ── RIGHT PAGE ─────────────────────────────────── */}
                        {!isLastSpread && (
                            <div className="flex-shrink-0 relative"
                                style={{
                                    width: PAGE_W, height: PAGE_H, overflow: 'visible',
                                    cursor: spreadIdx < totalSpreads - 1 ? 'e-resize' : 'default'
                                }}
                                onPointerDown={onRightPtrDown}
                                onPointerMove={onRightPtrMove}
                                onPointerUp={onRightPtrUp}
                            >
                                {/* Base: what's revealed when right page turns */}
                                <div ref={rightBaseRef} className="absolute inset-0 overflow-hidden" style={{ visibility: 'hidden', zIndex: 0 }}>
                                    {nxt && pageContent(nxt.rightIdx, isCoverPage(nxt.rightIdx))}
                                </div>

                                {/* Turning page */}
                                <div ref={rightFlipEl} className="absolute inset-0" style={{
                                    transformStyle: 'preserve-3d',
                                    transformOrigin: 'left center',
                                    transform: 'rotateY(0deg)',
                                    willChange: 'transform',
                                    zIndex: 1,
                                }}>
                                    {/* Front: current right */}
                                    <div style={{ ...faceStyle, backgroundColor: 'transparent' }}>
                                        {pageContent(cur.rightIdx, isCoverPage(cur.rightIdx))}
                                        <div className="absolute inset-0 pointer-events-none" style={{
                                            background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.02) 20%, transparent 45%)'
                                        }} />
                                    </div>
                                    {/* Back: next spread left page */}
                                    <div style={{ ...faceStyle, transform: 'rotateY(180deg)', backgroundColor: 'transparent' }}>
                                        {nxt && pageContent(nxt.leftIdx, isCoverPage(nxt.leftIdx))}
                                    </div>
                                </div>

                                {/* Spine shadow */}
                                <div className="absolute inset-y-0 left-0 w-8 pointer-events-none" style={{
                                    background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.28))', zIndex: 5
                                }} />

                                {/* Hover hint right edge */}
                                {spreadIdx < totalSpreads - 1 && (
                                    <div
                                        className="absolute inset-y-0 right-0 w-[24%] flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity duration-200"
                                        style={{ zIndex: 12, cursor: 'e-resize' }}
                                        onPointerEnter={onRightHoverEnter}
                                        onPointerLeave={onRightHoverLeave}
                                    >
                                        <div className="bg-black/25 backdrop-blur-sm rounded-l-full px-1.5 py-4 pointer-events-none">
                                            <ChevronRight size={13} className="text-white/65" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                    </div>
                </div>

                {/* ── NAV ──────────────────────────────────────────────────── */}
                <div className="flex items-center gap-5" style={{ zIndex: 10 }}>
                    <motion.button onClick={() => triggerPrev()} disabled={spreadIdx === 0}
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors">
                        <ChevronLeft size={16} /> Prev
                    </motion.button>

                    <div className="flex gap-1.5 items-center">
                        {spreads.map((_, idx) => (
                            <button key={idx}
                                onClick={() => { if (idx > spreadIdx) triggerNext(); else if (idx < spreadIdx) triggerPrev(); }}
                                className={`rounded-full transition-all duration-200 ${idx === spreadIdx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>

                    <motion.button onClick={() => triggerNext()} disabled={spreadIdx === totalSpreads - 1}
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white/10 backdrop-blur-md border border-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors">
                        Next <ChevronRight size={16} />
                    </motion.button>
                </div>
            </motion.div>
        </>
    );
}
