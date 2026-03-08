"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Photo } from "./Uploader";
import { templates, TemplateId } from "@/lib/templates";
import { MagazinePreview } from "./MagazinePreview";
import { PageElement, PhotoFilter, MusicTrack, defaultFilter, buildFilterString } from "@/lib/types";
import { Layout, Palette, Download, ChevronLeft, ChevronRight, Type, Sparkles, Plus, Image as ImageIcon, Save, Music, Sliders, Pencil, Check, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveMagazine, getCurrentUser } from "@/lib/storage";
import { generatePDF } from "@/lib/pdf-export";

interface MagazineWorkspaceProps {
    photos: Photo[];
    onReset: () => void;
    onAddMedia: (newPhotos: Photo[]) => void;
    onReorderPhotos?: (newPhotos: Photo[]) => void;
    initialElements?: PageElement[];
    initialTemplate?: TemplateId;
    initialTexts?: Record<string, string>;
    initialFilters?: Record<string, PhotoFilter>;
    initialMusicTrack?: MusicTrack | null;
    initialTitle?: string;
    existingMagazineId?: string;
}

// ── Royalty-free curated music tracks (Pixabay CDN) ────────────────────────
const MUSIC_TRACKS: MusicTrack[] = [
    { id: "cinematic", name: "Cinematic Dreams", artist: "TokyoMusicWalker", genre: "Cinematic", url: "https://cdn.pixabay.com/audio/2023/10/30/audio_6b9b5b0b3b.mp3", color: "#8b5cf6" },
    { id: "lofi", name: "Lo-Fi Chill Beats", artist: "Lofium", genre: "Lo-Fi", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", color: "#ec4899" },
    { id: "romantic", name: "Romantic Piano", artist: "Coma-Media", genre: "Romantic", url: "https://cdn.pixabay.com/audio/2023/04/10/audio_5c96617b5d.mp3", color: "#f43f5e" },
    { id: "acoustic", name: "Acoustic Morning", artist: "prazkhanal", genre: "Acoustic", url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde668d05.mp3", color: "#f59e0b" },
    { id: "epic", name: "Epic Adventure", artist: "Alex-Productions", genre: "Epic", url: "https://cdn.pixabay.com/audio/2022/12/19/audio_25527bba26.mp3", color: "#3b82f6" },
    { id: "jazz", name: "Smooth Jazz Night", artist: "Aylone", genre: "Jazz", url: "https://cdn.pixabay.com/audio/2022/08/03/audio_884fe92c21.mp3", color: "#10b981" },
    { id: "ambient", name: "Deep Space Ambient", artist: "Universfield", genre: "Ambient", url: "https://cdn.pixabay.com/audio/2022/03/15/audio_8b55df5a81.mp3", color: "#6366f1" },
    { id: "folk", name: "Summer Folk", artist: "FASSounds", genre: "Folk", url: "https://cdn.pixabay.com/audio/2023/07/11/audio_cd26f25c59.mp3", color: "#84cc16" },
];

// ── Filter presets ─────────────────────────────────────────────────────────
const FILTER_PRESETS: { name: string; emoji: string; filter: PhotoFilter }[] = [
    { name: "Original", emoji: "✨", filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0 } },
    { name: "Vintage", emoji: "🎞️", filter: { brightness: 105, contrast: 90, saturation: 70, blur: 0, grayscale: 20 } },
    { name: "B&W", emoji: "⬛", filter: { brightness: 105, contrast: 115, saturation: 0, blur: 0, grayscale: 100 } },
    { name: "Vibrant", emoji: "🌈", filter: { brightness: 110, contrast: 115, saturation: 180, blur: 0, grayscale: 0 } },
    { name: "Dreamy", emoji: "☁️", filter: { brightness: 115, contrast: 85, saturation: 80, blur: 2, grayscale: 0 } },
    { name: "Dark", emoji: "🖤", filter: { brightness: 75, contrast: 130, saturation: 80, blur: 0, grayscale: 0 } },
];

const themeColors = [
    { id: "default", name: "Default", bg: undefined, text: undefined },
    { id: "obsidian", name: "Obsidian", bg: "#0a0a0a", text: "#f5f5f5" },
    { id: "cream", name: "Cream", bg: "#fdf8f5", text: "#2c2c2c" },
    { id: "sage", name: "Sage", bg: "#eef1ed", text: "#3d4a3e" },
    { id: "navy", name: "Navy", bg: "#0f172a", text: "#f8fafc" },
    { id: "terracotta", name: "Terracotta", bg: "#e2aba0", text: "#4a2c27" },
    { id: "violet", name: "Violet", bg: "#1e1033", text: "#e9d5ff" },
];

const STICKER_CATEGORIES = [
    {
        name: "Cyber",
        icon: "⚡",
        stickers: ["⚡", "🔮", "💎", "🌐", "📡", "🛸", "🤖", "🦾", "🕹️", "🔬", "⚙️", "🔩", "💿", "📺", "🎮"],
    },
    {
        name: "Space",
        icon: "✨",
        stickers: ["✨", "🌟", "⭐", "🌙", "☀️", "🌌", "🔭", "🪐", "☄️", "🌠", "💫", "🌀", "🌈", "❄️", "🌊"],
    },
    {
        name: "Glam",
        icon: "👑",
        stickers: ["👑", "💄", "💅", "🌹", "🦋", "🌸", "🏆", "🎭", "💋", "🔥", "🫧", "🎨", "🖤", "💜", "❤️"],
    },
    {
        name: "Fun",
        icon: "🎉",
        stickers: ["🎉", "🥂", "🍾", "🎊", "🎈", "🎁", "🎶", "🎵", "🎤", "🪩", "🕺", "💃", "🫶", "🙌", "👏"],
    },
];

export function MagazineWorkspace({
    photos,
    onReset,
    onAddMedia,
    onReorderPhotos,
    initialElements = [],
    initialTemplate = "minimal",
    initialTexts = {},
    initialFilters = {},
    initialMusicTrack = null,
    initialTitle,
    existingMagazineId
}: MagazineWorkspaceProps) {
    const [activeTemplate, setActiveTemplate] = useState<TemplateId>(initialTemplate);
    const [activeColor, setActiveColor] = useState(themeColors[0]);
    const [elements, setElements] = useState<PageElement[]>(initialElements);
    const [texts, setTexts] = useState<Record<string, string>>(initialTexts);
    const [activeStickerCategory, setActiveStickerCategory] = useState(0);
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const [coverIndex, setCoverIndex] = useState(0);

    // Album title
    const [albumTitle, setAlbumTitle] = useState(initialTitle || `My Magazine`);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Photo filters
    const [photoFilters, setPhotoFilters] = useState<Record<string, PhotoFilter>>(initialFilters);
    const [filterPhotoIndex, setFilterPhotoIndex] = useState(0);
    const [activeFilterSection, setActiveFilterSection] = useState(false);

    // Music
    const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(initialMusicTrack ?? null);
    const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [activeMusicSection, setActiveMusicSection] = useState(false);

    // Saving / Exporting
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [magazineId] = useState(() => existingMagazineId || crypto.randomUUID());

    // Focus title input when editing starts
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    // Stop preview when switching tracks or unmounting
    const stopPreview = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
        }
        setPreviewingTrackId(null);
    };

    const handlePreviewTrack = (track: MusicTrack) => {
        if (previewingTrackId === track.id) {
            stopPreview();
            return;
        }
        stopPreview();
        const audio = new Audio(track.url);
        audio.volume = 0.5;
        audio.play().catch(() => { });
        previewAudioRef.current = audio;
        setPreviewingTrackId(track.id);
        // Auto-stop after 20 seconds
        setTimeout(() => { if (previewAudioRef.current === audio) stopPreview(); }, 20000);
    };

    const getPhotoFilter = (index: number): PhotoFilter =>
        photoFilters[String(index)] ?? defaultFilter;

    const setPhotoFilter = (index: number, updates: Partial<PhotoFilter>) => {
        setPhotoFilters(prev => ({
            ...prev,
            [String(index)]: { ...(prev[String(index)] ?? defaultFilter), ...updates },
        }));
    };

    const applyFilterPreset = (index: number, preset: PhotoFilter) => {
        setPhotoFilters(prev => ({ ...prev, [String(index)]: { ...preset } }));
    };

    const handleReorder = (index: number, direction: 'left' | 'right') => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === photos.length - 1) return;

        const newIndex = direction === 'left' ? index - 1 : index + 1;
        const newPhotos = [...photos];

        // Swap
        [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];

        // Track the cover index
        if (coverIndex === index) {
            setCoverIndex(newIndex);
        } else if (coverIndex === newIndex) {
            setCoverIndex(index);
        }

        if (onReorderPhotos) {
            onReorderPhotos(newPhotos);
        }
    };

    const handleSave = async () => {
        const user = getCurrentUser();
        if (!user) { alert("Please log in to save magazines."); return; }
        setIsSaving(true);
        try {
            // Convert photos to base64 data URLs so they persist across page reloads
            const toBase64 = (photo: Photo): Promise<string> => new Promise(resolve => {
                try {
                    if (photo.url.startsWith('data:')) { resolve(photo.url); return; }
                    if (photo.type === 'video') { resolve(photo.url); return; } // skip video
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const MAX = 1600; // Increased for better quality
                        let w = img.naturalWidth, h = img.naturalHeight;
                        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
                        const c = document.createElement('canvas');
                        c.width = w;
                        c.height = h;
                        const ctx = c.getContext('2d', { alpha: false });
                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, w, h);
                        }
                        resolve(c.toDataURL('image/jpeg', 0.9)); // Optimal balance
                    };
                    img.onerror = () => resolve(photo.url);
                    img.src = photo.url;
                } catch { resolve(photo.url); }
            });

            const base64Urls = await Promise.all(photos.map(toBase64));

            // Use the selected cover photo as the thumbnail
            let thumbnail: string | undefined;
            const coverPhoto = photos[coverIndex];
            if (coverPhoto && coverPhoto.type !== 'video') {
                thumbnail = await new Promise<string>(resolve => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const MAX = 800; // Increased for sharp thumbnails in grid view
                        let w = img.naturalWidth, h = img.naturalHeight;
                        if (w > MAX || h > MAX) {
                            const r = Math.min(MAX / w, MAX / h);
                            w = Math.round(w * r);
                            h = Math.round(h * r);
                        }
                        const c = document.createElement('canvas');
                        c.width = w;
                        c.height = h;
                        const ctx = c.getContext('2d', { alpha: false });
                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, w, h);
                        }
                        resolve(c.toDataURL('image/jpeg', 0.9));
                    };
                    img.onerror = () => resolve('');
                    img.src = coverPhoto.url;
                });
            }

            saveMagazine(user, {
                id: magazineId,
                title: albumTitle || `Magazine ${new Date().toLocaleDateString()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                templateId: activeTemplate,
                photoUrls: base64Urls,
                photoTypes: photos.map(p => p.type),
                coverIndex: coverIndex,
                elements,
                texts,
                thumbnail,
                photoFilters,
                musicTrack: selectedMusic,
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const container = document.querySelector('[data-export-id="pdf-export-container"]') as HTMLElement;
            if (!container) {
                alert("Error: Export container not found.");
                return;
            }

            // Let hidden container settle before capture
            await new Promise(r => setTimeout(r, 600));

            await generatePDF(container, `Magazine-${new Date().toLocaleDateString()}`);
        } catch (err) {
            console.error("PDF export error:", err);
            alert(`Export failed. Please try again.`);
        } finally {
            setIsExporting(false);
        }
    };


    const handleElementChange = useCallback((id: string, updated: Partial<PageElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updated, styles: { ...el.styles, ...updated.styles } } : el));
    }, []);

    const handleElementRemove = useCallback((id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
    }, []);

    const addText = () => {
        const newEl: PageElement = {
            id: crypto.randomUUID(),
            pageIndex: currentPageIndex,
            type: "text",
            content: "Your Text Here",
            x: 40,
            y: 60,
            width: 200,
            height: "auto",
            styles: { fontFamily: "font-serif", fontSize: "20px", fontWeight: "700", color: "#ffffff" },
        };
        setElements(prev => [...prev, newEl]);
    };

    const addSticker = (emoji: string) => {
        const newEl: PageElement = {
            id: crypto.randomUUID(),
            pageIndex: currentPageIndex,
            type: "sticker",
            content: emoji,
            x: 60,
            y: 60,
            width: 72,
            height: 72,
        };
        setElements(prev => [...prev, newEl]);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessingMedia, setIsProcessingMedia] = useState(false);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsProcessingMedia(true);
        const files = Array.from(e.target.files);

        // Match the timeout from Uploader for consistent UX, or process immediately
        setTimeout(() => {
            const newPhotos: Photo[] = files.map((file) => ({
                id: crypto.randomUUID(),
                url: URL.createObjectURL(file), // create local preview URL
                file,
                type: file.type.startsWith("video/") ? "video" : "photo",
            }));

            setIsProcessingMedia(false);
            onAddMedia(newPhotos); // Send back up to page.tsx to add to the main array

            // Reset input so the same file could be picked again if needed
            if (fileInputRef.current) fileInputRef.current.value = "";
        }, 500);
    };

    return (
        <div className="flex h-screen w-full bg-[#050508]">
            {/* ── SIDEBAR ─────────────────────────────────────────────── */}
            <div
                className="w-72 flex-shrink-0 flex flex-col h-full z-10 overflow-y-auto"
                style={{
                    background: "rgba(10,10,18,0.97)",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(24px)",
                }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
                    <button
                        onClick={onReset}
                        className="p-2 -ml-2 rounded-full text-white/40 hover:text-white hover:bg-white/8 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    ref={titleInputRef}
                                    value={albumTitle}
                                    onChange={e => setAlbumTitle(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingTitle(false); }}
                                    onBlur={() => setIsEditingTitle(false)}
                                    className="flex-1 min-w-0 bg-white/10 border border-violet-500/40 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none focus:border-violet-400"
                                    placeholder="Album title..."
                                    maxLength={50}
                                />
                                <button onClick={() => setIsEditingTitle(false)} className="text-green-400 hover:text-green-300 flex-shrink-0"><Check size={14} /></button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="group flex items-center gap-1.5 max-w-full"
                                title="Click to rename album"
                            >
                                <span className="font-serif text-sm font-bold text-white truncate max-w-[160px]">{albumTitle}</span>
                                <Pencil size={10} className="text-white/30 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
                            </button>
                        )}
                        <p className="text-[0.65rem] text-white/30">{photos.length} photos ready</p>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 flex flex-col px-4 py-5 gap-6 overflow-y-auto">

                    {/* ── TEMPLATES ─────────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Layout size={12} className="text-violet-400" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30">Templates</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(templates) as TemplateId[]).map((tId) => {
                                const template = templates[tId];
                                const isActive = activeTemplate === tId;
                                return (
                                    <motion.button
                                        key={tId}
                                        onClick={() => setActiveTemplate(tId)}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-xs transition-all duration-200 border ${isActive
                                            ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                                            : "border-white/6 bg-white/3 hover:border-white/12 hover:bg-white/6"
                                            }`}
                                    >
                                        <div
                                            className={`h-10 w-full rounded-lg overflow-hidden ${template.backgroundClass}`}
                                            style={activeColor.bg ? { backgroundColor: activeColor.bg } : undefined}
                                        />
                                        <span className={`font-medium text-[0.6rem] text-center w-full truncate ${isActive ? "text-violet-300" : "text-white/50"}`}>
                                            {template.name}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── THEME COLORS ──────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Palette size={12} className="text-pink-400" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30">Theme Colors</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {themeColors.map((color) => {
                                const isActive = activeColor.id === color.id;
                                return (
                                    <button
                                        key={color.id}
                                        onClick={() => setActiveColor(color)}
                                        title={color.name}
                                        className={`h-9 w-9 overflow-hidden rounded-full border-2 transition-all ${isActive
                                            ? "scale-110 border-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                            : "border-white/10 hover:scale-105 hover:border-white/20"
                                            }`}
                                    >
                                        <div className="flex h-full w-full rotate-45">
                                            <div className="flex-1" style={{ backgroundColor: color.bg || '#666' }} />
                                            <div className="flex-1" style={{ backgroundColor: color.text || '#ccc' }} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── DIVIDER ───────────────────────────────── */}
                    <div className="h-px bg-white/5" />

                    {/* ── COVER PHOTO ───────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon size={12} className="text-pink-400" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30">Cover & Order</span>
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-4 mb-3 max-h-36 overflow-y-auto pr-1 pb-2 custom-scrollbar">
                            {photos.map((photo, i) => (
                                <div key={i} className="relative group">
                                    <button
                                        onClick={() => setCoverIndex(i)}
                                        className={`relative w-14 h-20 rounded-md overflow-hidden transition-all ${coverIndex === i
                                            ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-[#0a0a12] scale-105 shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                                            : "opacity-60 hover:opacity-100"
                                            }`}
                                    >
                                        <img src={photo.url} alt={`Photo ${i}`} className="w-full h-full object-cover" />
                                        {coverIndex === i && (
                                            <div className="absolute inset-0 bg-pink-500/20 pointer-events-none" />
                                        )}
                                    </button>

                                    {/* Reorder Controls Overlay */}
                                    <div className="absolute -bottom-2 inset-x-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                        {i > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReorder(i, 'left'); }}
                                                className="p-1 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 hover:text-pink-300 pointer-events-auto shadow-sm"
                                            >
                                                <ChevronLeft size={10} />
                                            </button>
                                        )}
                                        {i < photos.length - 1 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReorder(i, 'right'); }}
                                                className="p-1 rounded-full bg-black/80 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 hover:text-pink-300 pointer-events-auto shadow-sm"
                                            >
                                                <ChevronRight size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── DIVIDER ───────────────────────────────── */}
                    <div className="h-px bg-white/5" />

                    {/* ── PHOTO FILTERS ─────────────────────────── */}
                    <section>
                        <button
                            onClick={() => setActiveFilterSection(v => !v)}
                            className="w-full flex items-center justify-between mb-3 group"
                        >
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={12} className="text-orange-400" />
                                <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30 group-hover:text-white/50 transition-colors">Photo Filters</span>
                            </div>
                            <span className={`text-[0.55rem] font-bold transition-colors ${activeFilterSection ? 'text-orange-400' : 'text-white/20'}`}>{activeFilterSection ? '▲' : '▼'}</span>
                        </button>

                        <AnimatePresence initial={false}>
                            {activeFilterSection && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    {/* Photo selector */}
                                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                                        {photos.map((photo, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setFilterPhotoIndex(i)}
                                                className={`relative flex-shrink-0 w-10 h-14 rounded-md overflow-hidden transition-all ${filterPhotoIndex === i
                                                        ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-[#0a0a12] scale-105'
                                                        : 'opacity-50 hover:opacity-80'
                                                    }`}
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt={`Photo ${i}`}
                                                    className="w-full h-full object-cover"
                                                    style={{ filter: buildFilterString(getPhotoFilter(i)) }}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Presets */}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {FILTER_PRESETS.map(preset => (
                                            <button
                                                key={preset.name}
                                                onClick={() => applyFilterPreset(filterPhotoIndex, preset.filter)}
                                                className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.55rem] font-semibold bg-white/5 border border-white/10 text-white/50 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-all"
                                            >
                                                <span>{preset.emoji}</span> {preset.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Sliders */}
                                    {([
                                        { label: 'Brightness', key: 'brightness', min: 50, max: 150 },
                                        { label: 'Contrast', key: 'contrast', min: 50, max: 150 },
                                        { label: 'Saturation', key: 'saturation', min: 0, max: 200 },
                                        { label: 'Blur (Dreamy)', key: 'blur', min: 0, max: 10 },
                                        { label: 'Grayscale', key: 'grayscale', min: 0, max: 100 },
                                    ] as const).map(({ label, key, min, max }) => {
                                        const currentFilter = getPhotoFilter(filterPhotoIndex);
                                        return (
                                            <div key={key} className="mb-2">
                                                <div className="flex justify-between mb-0.5">
                                                    <span className="text-[0.55rem] text-white/40">{label}</span>
                                                    <span className="text-[0.55rem] text-orange-300/70 font-mono">{currentFilter[key]}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={min}
                                                    max={max}
                                                    value={currentFilter[key]}
                                                    onChange={e => setPhotoFilter(filterPhotoIndex, { [key]: Number(e.target.value) } as any)}
                                                    className="w-full h-1 appearance-none rounded-full bg-white/10 accent-orange-400 cursor-pointer"
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Live preview strip */}
                                    <div className="mt-2 rounded-xl overflow-hidden h-20 relative">
                                        {photos[filterPhotoIndex] && (
                                            <img
                                                src={photos[filterPhotoIndex].url}
                                                alt="Filter preview"
                                                className="w-full h-full object-cover transition-all duration-300"
                                                style={{ filter: buildFilterString(getPhotoFilter(filterPhotoIndex)) }}
                                            />
                                        )}
                                        <div className="absolute inset-0 flex items-end justify-end p-1.5">
                                            <span className="text-[0.5rem] font-bold text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">Live Preview</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {/* ── DIVIDER ───────────────────────────────── */}
                    <div className="h-px bg-white/5" />

                    {/* ── MOOD MUSIC ────────────────────────────── */}
                    <section>
                        <button
                            onClick={() => setActiveMusicSection(v => !v)}
                            className="w-full flex items-center justify-between mb-3 group"
                        >
                            <div className="flex items-center gap-2">
                                <Music size={12} className="text-emerald-400" />
                                <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30 group-hover:text-white/50 transition-colors">Mood Music</span>
                                {selectedMusic && <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 truncate max-w-[70px]">{selectedMusic.name}</span>}
                            </div>
                            <span className={`text-[0.55rem] font-bold transition-colors ${activeMusicSection ? 'text-emerald-400' : 'text-white/20'}`}>{activeMusicSection ? '▲' : '▼'}</span>
                        </button>

                        <AnimatePresence initial={false}>
                            {activeMusicSection && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-[0.55rem] text-white/30 mb-3 leading-relaxed">Pick a track to play when someone views your shared link. Click ▶ to preview.</p>

                                    {/* None option */}
                                    <button
                                        onClick={() => { stopPreview(); setSelectedMusic(null); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-1.5 text-xs transition-all border ${selectedMusic === null
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-white/3 border-white/6 text-white/40 hover:bg-white/8'
                                            }`}
                                    >
                                        <span className="text-base">🔇</span>
                                        <span className="font-semibold">No Music</span>
                                    </button>

                                    <div className="flex flex-col gap-1">
                                        {MUSIC_TRACKS.map(track => (
                                            <div
                                                key={track.id}
                                                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all cursor-pointer ${selectedMusic?.id === track.id
                                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                                        : 'border-white/6 bg-white/3 hover:bg-white/8 hover:border-white/12'
                                                    }`}
                                                onClick={() => { stopPreview(); setSelectedMusic(track); }}
                                            >
                                                {/* Color dot */}
                                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs" style={{ backgroundColor: track.color + '33', border: `1px solid ${track.color}66` }}>
                                                    <span style={{ color: track.color }}>♪</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[0.6rem] font-bold text-white/80 truncate">{track.name}</p>
                                                    <p className="text-[0.5rem] text-white/30">{track.genre}</p>
                                                </div>
                                                {/* Preview button */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); handlePreviewTrack(track); }}
                                                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                                    style={{ backgroundColor: previewingTrackId === track.id ? track.color : 'rgba(255,255,255,0.08)' }}
                                                    title="Preview track (20s)"
                                                >
                                                    <span className="text-[0.55rem]">{previewingTrackId === track.id ? '⏹' : '▶'}</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[0.5rem] text-white/20 mt-2 text-center">Music plays in shared links only. Royalty-free.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {/* ── DIVIDER ───────────────────────────────── */}
                    <div className="h-px bg-white/5" />

                    {/* ── ACTIVE PAGE ───────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Type size={12} className="text-cyan-400" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30">Active Page</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {photos.slice(1).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPageIndex(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPageIndex === i + 1
                                        ? "bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/8"
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInputChange}
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessingMedia}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 mb-2 text-[0.65rem] font-semibold text-white/80 transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/10"
                        >
                            {isProcessingMedia ? "Processing..." : <><Plus size={12} /> Add More Photos/Videos</>}
                        </button>

                        <p className="text-[0.55rem] text-white/30 leading-relaxed text-center">Select a page, then add text or stickers below</p>
                    </section>

                    {/* ── ADD TEXT ──────────────────────────────── */}
                    <section>
                        <button
                            onClick={addText}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white/60 hover:text-white transition-all duration-200 border border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        >
                            <Plus size={13} />
                            Add Text to Page {currentPageIndex}
                        </button>
                        <p className="mt-2 text-[0.55rem] text-white/20">Click text on page to edit font, size, weight & color</p>
                    </section>

                    {/* ── STICKERS ──────────────────────────────── */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={12} className="text-yellow-400" />
                            <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/30">Stickers</span>
                        </div>
                        {/* Category tabs */}
                        <div className="flex gap-1 mb-3 flex-wrap">
                            {STICKER_CATEGORIES.map((cat, ci) => (
                                <button
                                    key={ci}
                                    onClick={() => setActiveStickerCategory(ci)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6rem] font-semibold transition-all ${activeStickerCategory === ci
                                        ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/8"
                                        }`}
                                >
                                    <span>{cat.icon}</span> {cat.name}
                                </button>
                            ))}
                        </div>
                        {/* Sticker grid */}
                        <div className="grid grid-cols-5 gap-1.5">
                            {STICKER_CATEGORIES[activeStickerCategory].stickers.map((s, si) => (
                                <motion.button
                                    key={si}
                                    onClick={() => addSticker(s)}
                                    whileHover={{ scale: 1.2, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="h-10 w-full bg-white/4 border border-white/6 hover:border-violet-500/30 hover:bg-violet-500/8 rounded-xl text-xl flex items-center justify-center transition-colors duration-150"
                                    title={`Add ${s} to page ${currentPageIndex}`}
                                >
                                    {s}
                                </motion.button>
                            ))}
                        </div>
                        <p className="mt-2 text-[0.55rem] text-white/20">Click to add · Drag to move · Corner to resize</p>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-white/5 flex-shrink-0 flex flex-col gap-2">
                    <motion.button
                        onClick={handleSave}
                        disabled={isSaving}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
                    >
                        {isSaving ? <span className="animate-pulse">Saving...</span> : saveSuccess ? <span className="text-green-400">Saved!</span> : <><Save size={16} /> Save Album</>}
                    </motion.button>

                    <motion.button
                        onClick={handleExport}
                        disabled={isExporting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-pink-600 shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_30px_rgba(139,92,246,0.5)] transition-shadow"
                    >
                        {isExporting ? <span className="animate-pulse">Generating PDF...</span> : <><Download size={16} /> Export PDF</>}
                    </motion.button>

                    <motion.button
                        onClick={async () => {
                            if (!magazineId) return alert("Please save the magazine first!");
                            setIsPublishing(true);
                            try {
                                // Compress image to max 1600px, JPEG quality 0.85
                                const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
                                    const img = new Image();
                                    img.onload = () => {
                                        const MAX = 1600;
                                        let w = img.width, h = img.height;
                                        if (w > MAX || h > MAX) {
                                            const ratio = Math.min(MAX / w, MAX / h);
                                            w = Math.round(w * ratio);
                                            h = Math.round(h * ratio);
                                        }
                                        const canvas = document.createElement("canvas");
                                        canvas.width = w;
                                        canvas.height = h;
                                        const ctx = canvas.getContext("2d", { alpha: false });
                                        if (ctx) {
                                            ctx.imageSmoothingEnabled = true;
                                            ctx.imageSmoothingQuality = 'high';
                                            ctx.drawImage(img, 0, 0, w, h);
                                        }
                                        resolve(canvas.toDataURL("image/jpeg", 0.9));
                                    };
                                    img.onerror = reject;
                                    img.src = URL.createObjectURL(file);
                                });

                                // Extract a single poster frame from video
                                const videoPoster = (file: File): Promise<string> => new Promise((resolve, reject) => {
                                    const video = document.createElement("video");
                                    video.muted = true;
                                    video.preload = "auto";
                                    video.onloadeddata = () => {
                                        video.currentTime = 0.5;
                                    };
                                    video.onseeked = () => {
                                        const MAX = 1600;
                                        let w = video.videoWidth, h = video.videoHeight;
                                        if (w > MAX || h > MAX) {
                                            const ratio = Math.min(MAX / w, MAX / h);
                                            w = Math.round(w * ratio);
                                            h = Math.round(h * ratio);
                                        }
                                        const canvas = document.createElement("canvas");
                                        canvas.width = w;
                                        canvas.height = h;
                                        canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
                                        resolve(canvas.toDataURL("image/jpeg", 0.85));
                                    };
                                    video.onerror = reject;
                                    video.src = URL.createObjectURL(file);
                                });

                                const processedPhotos = await Promise.all(photos.map(async (p) => {
                                    if (!p.file) return { ...p, file: undefined };
                                    if (p.type === "video") {
                                        // Store poster frame for sharing; videos can't be embedded via Base64
                                        const poster = await videoPoster(p.file);
                                        return { ...p, url: poster, type: "photo" as const, file: undefined };
                                    }
                                    const compressed = await compressImage(p.file);
                                    return { ...p, url: compressed, file: undefined };
                                }));

                                const res = await fetch("/api/magazines", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        id: magazineId,
                                        magazineData: {
                                            id: magazineId,
                                            title: albumTitle || `CharviVerse Magazine`,
                                            templateId: activeTemplate,
                                            photos: processedPhotos,
                                            coverIndex: coverIndex,
                                            elements: elements,
                                            texts: texts,
                                            photoFilters: photoFilters,
                                            musicTrack: selectedMusic,
                                        }
                                    })
                                });

                                const json = await res.json();
                                if (!json.success) throw new Error("API failed");

                                const url = `${window.location.origin}${json.url}`;
                                try {
                                    await navigator.clipboard.writeText(url);
                                    alert(`Web Link Published & Copied!\n\n${url}\n\nShare this link anywhere!`);
                                } catch {
                                    alert(`Your magazine is ready! Web link:\n${url}`);
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Failed to publish: Payload might be too large.");
                            } finally {
                                setIsPublishing(false);
                            }
                        }}
                        disabled={isPublishing}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 mt-1 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-emerald-500 shadow-[0_4px_20px_rgba(45,212,191,0.3)] hover:shadow-[0_4px_30px_rgba(45,212,191,0.5)] transition-shadow disabled:opacity-50"
                    >
                        {isPublishing ? <span className="animate-pulse">Publishing to Web...</span> : <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Publish & Share Link</>}
                    </motion.button>
                </div>
            </div >

            {/* ── PREVIEW AREA ─────────────────────────────────────────── */}
            <div
                className="flex-1 overflow-hidden relative"
                style={{ "--theme-bg": activeColor.bg, "--theme-text": activeColor.text } as React.CSSProperties
                }
            >
                <MagazinePreview
                    photos={[photos[coverIndex], ...photos.slice(0, coverIndex), ...photos.slice(coverIndex + 1)]}
                    template={templates[activeTemplate]}
                    elements={elements}
                    texts={texts}
                    setTexts={setTexts}
                    onElementChange={handleElementChange}
                    onElementRemove={handleElementRemove}
                    photoFilters={photoFilters}
                />

                {/* PDF Export Support — must be in viewport for html2canvas to render correctly */}
                <div style={{ position: 'fixed', top: 0, left: 0, width: '1200px', opacity: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
                    <MagazinePreview
                        photos={photos}
                        template={templates[activeTemplate]}
                        elements={elements}
                        texts={texts}
                        setTexts={setTexts}
                        onElementChange={() => { }}
                        onElementRemove={() => { }}
                        isExportMode={true}
                        photoFilters={photoFilters}
                    />
                </div>
            </div >
        </div >
    );
}

