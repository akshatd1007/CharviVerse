export type TemplateId = "minimal" | "wedding" | "travel" | "vintage" | "cyberpunk" | "glassmorphism" | "y2k" | "editorial";

export interface Template {
    id: TemplateId;
    name: string;
    fontHeading: string;
    fontBody: string;
    backgroundClass: string;
    pageClass: string;
    imageClass: string;
    coverClass: string;
    coverOverlayClass: string; // Specific styling for the cover gradient/overlay
    decorations?: "none" | "floral" | "tape" | "stamps" | "glitch" | "glass" | "mesh" | "editorial";
    coverLayout?: "centered" | "magazine" | "fashion" | "tech" | "scrapbook";
    layoutType?: "padded" | "fullbleed";
}

export const templates: Record<TemplateId, Template> = {
    minimal: {
        id: "minimal",
        name: "Minimal Luxury",
        fontHeading: "font-sans text-[4rem] leading-tight tracking-[0.2em] font-thin uppercase drop-shadow-md text-white mix-blend-overlay",
        fontBody: "font-sans",
        // Using dynamic theme-bg variable
        backgroundClass: "bg-zinc-100",
        pageClass: "bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
        imageClass: "rounded-sm border border-zinc-100",
        // Using dynamic theme-bg variable
        coverClass: "bg-[var(--theme-bg,var(--tw-colors-zinc-900))] text-[var(--theme-text,var(--tw-colors-zinc-50))]",
        coverOverlayClass: "bg-gradient-to-t from-[var(--theme-bg,var(--tw-colors-zinc-900))] via-[var(--theme-bg,var(--tw-colors-zinc-900))]/60 to-transparent",
        decorations: "none",
        coverLayout: "fashion",
        layoutType: "fullbleed",
    },
    wedding: {
        id: "wedding",
        name: "Wedding Story",
        fontHeading: "font-serif italic",
        fontBody: "font-serif",
        backgroundClass: "bg-[var(--theme-bg,#fdfaf6)] text-[var(--theme-text,#4a3f3b)]",
        pageClass: "bg-[#fffcf8] shadow-[0_15px_40px_rgba(200,160,140,0.15)]",
        imageClass: "rounded-md shadow-lg p-2 bg-white",
        coverClass: "bg-[var(--theme-bg,#f5ebe6)] text-[var(--theme-text,#4a3f3b)] border-[16px] border-white ring-1 ring-black/5 inset-0",
        coverOverlayClass: "bg-gradient-to-tr from-[var(--theme-bg,#f5ebe6)]/40 via-transparent to-white/20 backdrop-blur-[2px]",
        decorations: "floral",
        coverLayout: "centered",
        layoutType: "padded",
    },
    travel: {
        id: "travel",
        name: "Travel Journal",
        fontHeading: "font-sans font-black uppercase tracking-[0.4em]",
        fontBody: "font-sans",
        backgroundClass: "bg-[#eef2f5]",
        pageClass: "bg-[#faf9f5] shadow-2xl border-l-[16px] border-[var(--theme-bg,#334155)]",
        imageClass: "rounded-none shadow-md",
        coverClass: "bg-[var(--theme-bg,#1e293b)] text-[var(--theme-text,#f8fafc)] border-l-[28px] border-black/20",
        coverOverlayClass: "bg-gradient-to-b from-[var(--theme-bg,#1e293b)]/80 via-transparent to-[var(--theme-bg,#1e293b)]/90",
        decorations: "tape",
        coverLayout: "magazine",
        layoutType: "padded",
    },
    vintage: {
        id: "vintage",
        name: "Vintage Scrapbook",
        fontHeading: "font-serif font-black tracking-tighter",
        fontBody: "font-serif",
        backgroundClass: "bg-[#2d2926]",
        pageClass: "bg-[var(--theme-bg,#e8decb)] text-[var(--theme-text,#4a3b32)] shadow-[8px_8px_20px_rgba(0,0,0,0.5)] bg-[radial-gradient(rgba(0,0,0,0.1)_1px,transparent_1px)] [background-size:16px_16px]",
        imageClass: "p-3 bg-white pb-10 shadow-xl border border-stone-200 rotate-[2deg] hover:rotate-0 transition-transform duration-500",
        coverClass: "bg-[var(--theme-bg,#8c7a6b)] text-[var(--theme-text,#f2eadd)] border-[12px] border-double border-[var(--theme-text,#4a3b32)] p-6 shadow-inset",
        coverOverlayClass: "bg-[var(--theme-text,#4a3b32)]/30 mix-blend-multiply",
        decorations: "stamps",
        coverLayout: "scrapbook",
        layoutType: "padded",
    },
    cyberpunk: {
        id: "cyberpunk",
        name: "Neon Cyberpunk",
        fontHeading: "font-mono font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 [text-shadow:0_0_20px_rgba(236,72,153,0.5)]",
        fontBody: "font-mono",
        backgroundClass: "bg-[#09090b] text-fuchsia-400",
        pageClass: "bg-black shadow-[0_0_30px_rgba(34,211,238,0.2)] border border-cyan-500/30",
        imageClass: "opacity-80 hover:opacity-100 transition-all duration-700 ring-2 ring-fuchsia-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)] filter contrast-125 saturate-150",
        coverClass: "bg-[#050505] text-cyan-400 border-[10px] border-t-cyan-500 border-r-fuchsia-500 border-b-yellow-400 border-l-green-400",
        coverOverlayClass: "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzQnIGZpbGw9J3JnYmEoMCwwLDAsMC42KScvPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzEnIGZpbGw9J3JnYmEoMjU1LDI1NSwyNTUsMC4xKScvPjwvc3ZnPg==')]",
        decorations: "glitch",
        coverLayout: "tech",
        layoutType: "fullbleed",
    },
    glassmorphism: {
        id: "glassmorphism",
        name: "Glassmorphism Pro",
        fontHeading: "font-sans font-thin tracking-[0.2em] text-white mix-blend-overlay drop-shadow-lg",
        fontBody: "font-sans",
        backgroundClass: "bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-500",
        pageClass: "bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] text-white",
        imageClass: "rounded-3xl p-1 bg-white/10 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden",
        coverClass: "bg-white/5 backdrop-blur-2xl border-l-[1px] border-t-[1px] border-white/30 text-white shadow-[inset_0_0_40px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.4)]",
        coverOverlayClass: "bg-gradient-to-br from-white/20 via-transparent to-black/40",
        decorations: "glass",
        coverLayout: "magazine",
        layoutType: "padded",
    },
    y2k: {
        id: "y2k",
        name: "Y2K Nostalgia",
        fontHeading: "font-sans font-black italic tracking-tighter text-blue-500 [text-shadow:2px_2px_0_#ff00ff,-2px_-2px_0_#00ffff]",
        fontBody: "font-sans font-bold",
        backgroundClass: "bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-[length:200%_200%] animate-gradient",
        pageClass: "bg-zinc-200 shadow-xl border-4 border-zinc-400 rounded-[30px]",
        imageClass: "rounded-full border-4 border-pink-500 shadow-[8px_8px_0_#3b82f6]",
        coverClass: "bg-zinc-300 border-[16px] border-zinc-400 rounded-[40px] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]",
        coverOverlayClass: "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)] mix-blend-overlay",
        decorations: "mesh",
        coverLayout: "magazine",
        layoutType: "padded",
    },
    editorial: {
        id: "editorial",
        name: "High Fashion",
        fontHeading: "absolute top-8 left-1/2 -translate-x-1/2 w-[120%] text-center font-[family-name:var(--font-bodoni)] text-[7rem] leading-[0.8] tracking-widest font-black uppercase text-white/95 mix-blend-overlay z-10",
        fontBody: "font-serif",
        backgroundClass: "bg-[#000]",
        pageClass: "bg-black text-white shadow-2xl overflow-hidden",
        imageClass: "transition-all duration-1000",
        coverClass: "bg-black text-white",
        coverOverlayClass: "bg-gradient-to-t from-black/90 via-transparent to-black/30",
        decorations: "editorial",
        coverLayout: "fashion",
        layoutType: "fullbleed",
    }
};
