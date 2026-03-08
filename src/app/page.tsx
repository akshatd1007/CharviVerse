"use client";

import { useState, useEffect } from "react";
import { Uploader, type Photo } from "@/components/Uploader";
import { MagazineWorkspace } from "@/components/MagazineWorkspace";
import { AuthModal } from "@/components/AuthModal";
import { getCurrentUser, logoutUser, getMagazines, deleteMagazine, SavedMagazine } from "@/lib/storage";
import { PageElement } from "@/lib/types";
import { TemplateId } from "@/lib/templates";
import { Layers, Zap, Sparkles, BookOpen, ArrowRight, Star, LogOut, Trash2, Download, Share2, FolderOpen } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { MagazinePreview } from "@/components/MagazinePreview";
import { templates } from "@/lib/templates";
import { sanitizeClonedStyles, blobToDataUrl, generatePDF } from '@/lib/pdf-export';



// Floating orb positions for cinematic background
const orbs = [
  { cx: "20%", cy: "30%", size: 700, from: "rgba(216, 180, 254, 0.4)", to: "transparent" }, // soft purple
  { cx: "80%", cy: "20%", size: 600, from: "rgba(167, 243, 208, 0.4)", to: "transparent" }, // soft teal
  { cx: "50%", cy: "80%", size: 800, from: "rgba(196, 181, 253, 0.3)", to: "transparent" }, // soft violet
];

const featureCards = [
  { icon: <Layers size={22} className="text-purple-500" />, title: "Smart Layouts", desc: "6 dynamic photo arrangements per template, auto-varied for visual rhythm." },
  { icon: <Sparkles size={22} className="text-pink-400" />, title: "Sticker Studio", desc: "60+ high-tech, celestial & glam stickers you can drag, resize and rotate." },
  { icon: <Zap size={22} className="text-teal-500" />, title: "Live Editing", desc: "Click any text on the page to change font, weight, size and colour in real-time." },
  { icon: <BookOpen size={22} className="text-fuchsia-400" />, title: "Flip-Book Preview", desc: "Real page-flip physics with smooth animations right in the browser." },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [magazines, setMagazines] = useState<SavedMagazine[]>([]);
  const [loadingMagazines, setLoadingMagazines] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [initialElements, setInitialElements] = useState<PageElement[]>([]);
  const [initialTemplate, setInitialTemplate] = useState<TemplateId>("minimal");
  const [initialTexts, setInitialTexts] = useState<Record<string, string>>({});
  const [currentMagazineId, setCurrentMagazineId] = useState<string | null>(null);
  const [view, setView] = useState<"landing" | "dashboard" | "workspace">("landing");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  // Robust UUID fallback
  const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  useEffect(() => {
    const initAuth = async () => {
      const user = getCurrentUser();
      if (!user) {
        setShowAuth(true);
      } else {
        setCurrentUser(user);
        setLoadingMagazines(true);
        const data = await getMagazines(user);
        setMagazines(data);
        setLoadingMagazines(false);
      }
    };
    initAuth();
  }, []); // Only run on mount, NOT on mouse move

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 20);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 20);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  const handleAuthSuccess = async (username: string) => {
    setCurrentUser(username);
    setShowAuth(false);
    setLoadingMagazines(true);
    const data = await getMagazines(username);
    setMagazines(data);
    setLoadingMagazines(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setShowAuth(true);
    setView("landing");
  };

  const handleUpload = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
    setInitialElements([]);
    setInitialTemplate("minimal");
    setInitialTexts({});
    setCurrentMagazineId(getUUID());
    setView("workspace");
  };
  const handleAddMedia = (newPhotos: Photo[]) => { setPhotos(prev => [...prev, ...newPhotos]); };
  const handleReset = () => { setPhotos([]); setView("landing"); setCurrentMagazineId(null); };

  // Open saved magazine back in editor (photos are stored as base64 in localStorage)
  const handleOpenInEditor = (mag: SavedMagazine) => {
    const restored: Photo[] = mag.photoUrls.map((url, i) => ({
      id: crypto.randomUUID(),
      url,
      type: (mag.photoTypes?.[i] || 'photo') as "photo" | "video",
    }));
    setPhotos(restored);
    setInitialElements(mag.elements as PageElement[]);
    setInitialTemplate(mag.templateId as TemplateId);
    setInitialTexts(mag.texts || {});
    setCurrentMagazineId(mag.id);
    setView('workspace');
  };

  const handleExportPdf = async (mag: SavedMagazine) => {
    if (exportingId) return;
    setExportingId(mag.id);
    try {
      // Wait for the hidden MagazinePreview to mount
      await new Promise(r => setTimeout(r, 1200));

      const container = document.getElementById(`export-container-${mag.id}`);
      if (!container) throw new Error("Export container not found");

      await generatePDF(container, `charviverse-${mag.title.replace(/\s+/g, '-')}`);
    } catch (e) {
      console.error("Dashboard Export Failed:", e);
      alert("Export failed. Please try opening the editor and exporting from there.");
    } finally {
      setExportingId(null);
    }
  };

  // Publish saved magazine to share link
  const handleShareLink = async (mag: SavedMagazine) => {
    if (publishingId) return;
    setPublishingId(mag.id);
    try {
      const photos = mag.photoUrls
        .filter(u => u && !u.startsWith('blob:'))
        .map((url, i) => ({ id: getUUID(), url, type: mag.photoTypes?.[i] ?? 'photo' }));

      if (photos.length === 0) {
        alert('No persistent photos found. Please re-save the album first.');
        return;
      }

      const res = await fetch('/api/magazines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: mag.id,
          magazineData: { id: mag.id, title: mag.title, templateId: mag.templateId, photos, elements: mag.elements }
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error('API failed');
      const url = `${window.location.origin}${json.url}`;
      try { await navigator.clipboard.writeText(url); alert(`Link copied!\n\n${url}`); }
      catch { alert(`Your share link:\n${url}`); }
    } catch (e) {
      console.error(e);
      alert('Failed to generate share link.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <main className="min-h-screen selection:bg-purple-200 bg-gradient-to-b from-[#f8f4ff] via-[#f0fdfa] to-[#fcfaff] overflow-x-hidden text-slate-800">
      {view !== "workspace" && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-purple-100/60 bg-white/70 backdrop-blur-2xl shadow-sm">
          <button onClick={() => setView("landing")} className="flex items-center gap-3 group relative cursor-pointer outline-none">
            <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-teal-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-700 pointer-events-none" />

            <div className="relative isolate h-12 w-12 rounded-full overflow-hidden border-2 border-white bg-[#F5F0EA] shadow-[0_4px_15px_rgba(216,180,254,0.5)] flex-shrink-0 transition-transform duration-500 group-hover:scale-[1.08] group-hover:-rotate-3">
              <img src="/LOGO_C.png" alt="CharviVerse" className="h-full w-full object-contain scale-[1.7] pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            </div>

            <div className="flex flex-col items-start justify-center z-10 relative">
              <span className="font-serif text-2xl font-black tracking-tight text-slate-800 transition-colors duration-500 group-hover:text-purple-600 leading-none mt-0.5">CharviVerse</span>
            </div>
          </button>
          <nav className="flex items-center gap-6">
            {currentUser && <span className="text-slate-500 text-sm hidden sm:inline-block font-medium">Logged in as <strong className="text-slate-800">{currentUser}</strong></span>}
            <button
              onClick={() => setView("dashboard")}
              className={`text-sm font-semibold transition-colors ${view === "dashboard" ? "text-purple-600" : "text-slate-500 hover:text-purple-600"}`}
            >My Albums</button>
            <button
              onClick={() => setView("landing")}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(168,230,207,0.4)] hover:shadow-[0_4px_25px_rgba(168,230,207,0.6)] transition-all duration-300 hover:scale-105"
            >
              <Sparkles size={14} />Create New
            </button>
            {currentUser && (
              <button onClick={handleLogout} title="Sign Out" className="text-slate-400 hover:text-purple-600 transition-colors p-2">
                <LogOut size={16} />
              </button>
            )}
          </nav>
        </header>
      )}

      <AnimatePresence mode="wait">
        {showAuth && <AuthModal onSuccess={handleAuthSuccess} />}

        {/* ── LANDING ──────────────────────────────────────────────────── */}
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 0.7 }}
            className="min-h-screen flex flex-col"
          >
            {/* Animated orb background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              {orbs.map((orb, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full blur-[120px] opacity-25"
                  style={{
                    left: orb.cx, top: orb.cy,
                    width: orb.size, height: orb.size,
                    background: `radial-gradient(circle, ${orb.from}, ${orb.to})`,
                    translateX: springX,
                    translateY: springY,
                  }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 8 + i * 3, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjAnIGhlaWdodD0nNjAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PGxpbmUgeDE9JzYwJyB5MT0nMCcgeDI9JzYwJyB5Mj0nNjAnIHN0cm9rZT0nd2hpdGUnIHN0cm9rZS1vcGFjaXR5PScwLjAzJyBzdHJva2Utd2lkdGg9JzEnLz48bGluZSB4MT0nMCcgeTE9JzYwJyB4Mj0nNjAnIHkyPSc2MCcgc3Ryb2tlPSd3aGl0ZScgc3Ryb2tlLW9wYWNpdHk9JzAuMDMnIHN0cm9rZS13aWR0aD0nMScvPjwvc3ZnPg==')] opacity-60" />
            </div>

            {/* Hero */}
            <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center pt-24 pb-12">
              {/* Pill badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 rounded-full border border-purple-200 bg-white/60 backdrop-blur-sm px-4 py-1.5 mb-8 text-xs font-semibold text-purple-700 uppercase tracking-widest shadow-sm"
              >
                <Star size={11} className="fill-purple-400 text-purple-400" />
                Premium Digital Magazine Studio
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-5xl sm:text-7xl md:text-8xl font-black leading-[0.95] tracking-tight text-slate-800"
              >
                CharviVerse
                <br />
                <em className="bg-gradient-to-r from-purple-500 via-fuchsia-400 to-teal-400 bg-clip-text text-transparent font-medium not-italic drop-shadow-sm">Magazines</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="mt-8 max-w-xl text-lg font-light leading-relaxed text-slate-600"
              >
                Transform your everyday photos into <span className="text-purple-600 font-semibold">stunning, professional-grade</span> digital magazines — with live editing, cinematic templates, and high-tech stickers.
              </motion.p>

              {/* CTA arrow hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 flex items-center gap-2 text-purple-500 text-sm font-medium"
              >
                <ArrowRight size={14} className="animate-bounce-x" />Upload photos below to begin
              </motion.div>

              {/* Uploader */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl mt-10"
              >
                {/* Glow wrapper */}
                <div className="relative">
                  <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-purple-200 via-fuchsia-200 to-teal-200 opacity-60 blur-xl" />
                  <div className="relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white shadow-2xl overflow-hidden p-[2px]">
                    <div className="rounded-[1.4rem] overflow-hidden bg-[#faf8ff] border border-purple-50">
                      <Uploader onUpload={handleUpload} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stats strip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.7 }}
                className="mt-20 flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
              >
                {[
                  { label: "Templates", value: "8+" },
                  { label: "Stickers", value: "60+" },
                  { label: "Page Layouts", value: "6" },
                  { label: "Export Quality", value: "HD" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <span className="font-serif text-3xl font-black bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">{s.value}</span>
                    <span className="text-[0.65rem] text-slate-500 font-semibold uppercase tracking-[0.2em]">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </section>

            {/* Features Grid */}
            <section className="relative z-10 px-6 pb-32 max-w-5xl mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="mb-12 text-center"
              >
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-3">What you get</p>
                <h2 className="font-serif text-4xl sm:text-5xl font-black text-slate-800">Everything. Premium.</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {featureCards.map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className="group relative rounded-[2rem] border border-white bg-white/70 backdrop-blur-xl p-8 overflow-hidden shadow-xl hover:shadow-2xl transition-all"
                  >
                    {/* Card glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-teal-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-teal-50 border border-white flex items-center justify-center shadow-inner">
                        {card.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{card.title}</h3>
                      <p className="text-base text-slate-500 leading-relaxed font-medium">{card.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* ── DASHBOARD ────────────────────────────────────────────────── */}
        {view === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, filter: "blur(12px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen pt-36 px-8 max-w-5xl mx-auto flex flex-col items-center"
          >
            {/* Background orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute top-[20%] left-[30%] w-[600px] h-[600px] rounded-full bg-purple-300/20 blur-[120px]" />
              <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-teal-200/20 blur-[120px]" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-14 text-center relative z-10">
              <p className="text-xs uppercase tracking-[0.4em] text-purple-400 font-bold mb-3">Library</p>
              <h2 className="font-serif text-4xl font-black text-slate-800">Your Magazine Shelf</h2>
              <p className="mt-2 text-slate-500 text-sm font-medium">All your crafted memories, perfectly preserved.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 flex flex-col items-center justify-center p-16 rounded-[2rem] w-full max-w-5xl overflow-hidden bg-white/60 backdrop-blur-xl border border-purple-100 shadow-xl"
            >
              {/* Glow border */}
              <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-purple-400/20 to-teal-400/20 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              {loadingMagazines ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin mb-4" />
                  <p className="text-slate-400 font-medium">Fetching your albums...</p>
                </div>
              ) : magazines.length === 0 ? (
                <div className="flex flex-col items-center">
                  <div className="relative group flex flex-col items-center">
                    <div className="relative flex items-center justify-center mb-6 cursor-pointer">
                      <div className="absolute w-28 h-28 rounded-full bg-gradient-to-r from-purple-400 to-teal-400 opacity-20 blur-xl transition-opacity duration-700 group-hover:opacity-50 animate-pulse pointer-events-none" />

                      <div className="relative isolate h-28 w-28 rounded-full bg-[#F5F0EA] border-[3px] border-white shadow-[0_8px_30px_rgba(216,180,254,0.4)] flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform duration-500 group-hover:scale-[1.05] group-hover:rotate-3">
                        <img src="/LOGO_C.png" alt="Empty Shelf" className="h-full w-full object-contain scale-[1.7] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                      </div>
                    </div>
                    <h3 className="font-serif text-3xl font-black text-slate-800 mb-2 transition-colors duration-500">It's a bit empty here!</h3>
                  </div>
                  <p className="text-slate-500 mb-10 max-w-sm text-center text-sm leading-relaxed font-medium">You haven't created any magazines yet. Upload your first batch of photos to start curating.</p>
                  <button
                    onClick={() => setView("landing")}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-400 px-8 py-4 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(168,230,207,0.4)] hover:shadow-[0_4px_25px_rgba(168,230,207,0.6)] transition-all duration-300 hover:scale-105"
                  >
                    <Sparkles size={16} />Create Your First Magazine
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {magazines.map((mag) => (
                      <div key={mag.id} className="group relative rounded-[1.5rem] border border-white bg-white/80 shadow-md p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        {/* Thumbnail */}
                        <div className="aspect-[3/4] rounded-xl bg-purple-50 border border-purple-100 overflow-hidden flex items-center justify-center relative">
                          {mag.thumbnail ? (
                            <img src={mag.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={mag.title} />
                          ) : mag.photoUrls?.[mag.coverIndex || 0] && !mag.photoUrls[mag.coverIndex || 0].startsWith('blob:') ? (
                            <img src={mag.photoUrls[mag.coverIndex || 0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={mag.title} />
                          ) : (
                            <BookOpen className="text-purple-200" size={32} />
                          )}
                          {/* Delete button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (currentUser && confirm("Delete this magazine?")) {
                                await deleteMagazine(currentUser, mag.id);
                                const data = await getMagazines(currentUser);
                                setMagazines(data);
                              }
                            }}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white shadow-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                          ><Trash2 size={14} /></button>
                        </div>

                        {/* Info */}
                        <div className="px-1">
                          <h4 className="font-bold text-slate-800 truncate text-base tracking-tight">{mag.title || "Untitled Magazine"}</h4>
                          <p className="text-xs font-semibold text-purple-400 mt-0.5">
                            {new Date(mag.createdAt).toLocaleDateString()} <span className="text-slate-300 mx-1">•</span>
                            <span className="text-slate-500">{mag.photoUrls.length} photos</span>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-3 gap-2 mt-auto">
                          <button
                            onClick={() => handleOpenInEditor(mag)}
                            title="Open in Editor"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors border border-purple-100 text-[0.6rem] font-bold"
                          >
                            <FolderOpen size={15} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleExportPdf(mag)}
                            disabled={exportingId === mag.id}
                            title="Download PDF"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 transition-colors border border-fuchsia-100 text-[0.6rem] font-bold disabled:opacity-50"
                          >
                            <Download size={15} />
                            {exportingId === mag.id ? '…' : 'PDF'}
                          </button>
                          <button
                            onClick={() => handleShareLink(mag)}
                            disabled={publishingId === mag.id}
                            title="Generate Share Link"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors border border-teal-100 text-[0.6rem] font-bold disabled:opacity-50"
                          >
                            <Share2 size={15} />
                            {publishingId === mag.id ? '…' : 'Share'}
                          </button>
                        </div>

                        {/* Hidden Export Rendering Container */}
                        {exportingId === mag.id && (
                          <div
                            id={`export-container-${mag.id}`}
                            style={{ position: 'fixed', top: 0, left: 0, width: '1200px', opacity: 0, pointerEvents: 'none', zIndex: -100, overflow: 'hidden' }}
                          >
                            <MagazinePreview
                              photos={mag.photoUrls.map((url, i) => ({ id: `${i}`, url, type: (mag.photoTypes?.[i] || 'photo') as any }))}
                              template={Object.values(templates).find(t => t.id === mag.templateId) || Object.values(templates)[0]}
                              elements={mag.elements as PageElement[]}
                              texts={mag.texts || {}}
                              setTexts={() => { }}
                              onElementChange={() => { }}
                              onElementRemove={() => { }}
                              isExportMode={true}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── WORKSPACE ────────────────────────────────────────────────── */}
        {view === "workspace" && (
          <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            <MagazineWorkspace
              photos={photos}
              onReset={handleReset}
              onAddMedia={handleAddMedia}
              onReorderPhotos={setPhotos}
              initialElements={initialElements}
              initialTemplate={initialTemplate}
              initialTexts={initialTexts}
              existingMagazineId={currentMagazineId || undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main >
  );
}
