"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MagazinePreview } from "@/components/MagazinePreview";
import { templates } from "@/lib/templates";
import { motion } from "framer-motion";

export default function MagazineViewerPage() {
    const params = useParams();
    const id = params?.id as string;

    const [magazine, setMagazine] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                // Fetch via our own API proxy (avoids CORS)
                const res = await fetch(`/api/magazines/${id}`);
                if (!res.ok) throw new Error("Magazine not found");
                const data = await res.json();
                setMagazine(data);
            } catch (e: any) {
                setError(e.message || "Failed to load magazine");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <motion.div
                    className="flex flex-col items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="w-12 h-12 rounded-full border-2 border-t-violet-500 border-r-pink-500 border-b-teal-400 border-l-transparent animate-spin" />
                    <p className="text-white/60 text-sm font-medium tracking-wider">Loading magazine...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !magazine) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-white text-2xl font-bold mb-2">Magazine Not Found</h1>
                    <p className="text-white/50 text-sm mb-6">{error || "This magazine may have expired or been removed."}</p>
                    <a
                        href="/"
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold text-sm hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-shadow"
                    >
                        Create Your Own Magazine
                    </a>
                </div>
            </div>
        );
    }

    const template = templates[magazine.templateId as keyof typeof templates] || templates.minimal;

    return (
        <main className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col items-center justify-center">
            <div
                className="w-full h-full relative"
                style={{ "--theme-bg": "#000", "--theme-text": "#FFF" } as React.CSSProperties}
            >
                <MagazinePreview
                    photos={magazine.photos}
                    template={template}
                    elements={magazine.elements || []}
                    texts={magazine.texts || {}}
                    photoFilters={magazine.photoFilters || {}}
                    musicTrack={magazine.musicTrack || null}
                    setTexts={() => { }}
                    onElementChange={() => { }}
                    onElementRemove={() => { }}
                    isViewerMode={true}
                />
            </div>

            {/* Floating CTA */}
            <div className="absolute top-4 right-4 z-50">
                <a
                    href="/"
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 transition-all font-semibold text-sm drop-shadow-lg"
                >
                    ✨ Create your own
                </a>
            </div>
        </main>
    );
}
