"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { loginUser, registerUser } from "@/lib/storage";

interface AuthModalProps {
    onSuccess: (username: string) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
    const [tab, setTab] = useState<"login" | "signup">("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!username.trim() || !password.trim()) {
            setError("Username and password are required.");
            return;
        }
        if (password.length < 4) {
            setError("Password must be at least 4 characters.");
            return;
        }
        setLoading(true);
        try {
            const result = tab === "login"
                ? await loginUser(username.trim(), password)
                : await registerUser(username.trim(), password);

            if (result.ok) {
                onSuccess(username.trim());
            } else {
                setError(result.error || "Something went wrong.");
            }
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
            {/* Background orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[130px]" />
                <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-pink-600/12 blur-[130px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md mx-4"
            >
                {/* Glow border */}
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-500/40 via-pink-500/20 to-cyan-500/20 blur-sm" />

                <div className="relative rounded-3xl overflow-hidden"
                    style={{ background: "rgba(8,8,16,0.97)", border: "1px solid rgba(255,255,255,0.08)" }}>

                    {/* Logo header */}
                    <div className="flex flex-col items-center pt-10 pb-6 px-8 border-b border-white/5">
                        <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/10 shadow-[0_0_24px_rgba(139,92,246,0.4)] bg-[#F5F0EA] mb-4">
                            <img src="/LOGO_C.png" alt="CharviVerse" className="h-full w-full object-contain scale-[1.6]" />
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-white">CharviVerse</h1>
                        <p className="text-white/40 text-sm mt-1">Your personal magazine studio</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        {(["login", "signup"] as const).map(t => (
                            <button key={t} onClick={() => { setTab(t); setError(""); }}
                                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab === t
                                    ? "text-white border-b-2 border-violet-500"
                                    : "text-white/30 hover:text-white/60"
                                    }`}>
                                {t === "login" ? "Sign In" : "Create Account"}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div key="err"
                                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Username */}
                        <div className="relative">
                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            <input
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Username"
                                autoComplete="username"
                                className="w-full bg-white/4 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-white/6 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete={tab === "login" ? "current-password" : "new-password"}
                                className="w-full bg-white/4 border border-white/8 rounded-xl pl-11 pr-11 py-3.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-white/6 transition-all"
                            />
                            <button type="button" onClick={() => setShowPw(s => !s)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit" disabled={loading}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-semibold shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : <Sparkles size={15} />}
                            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
                        </motion.button>

                        <p className="text-center text-xs text-white/20 mt-1">
                            {tab === "login"
                                ? "Don't have an account? " : "Already have an account? "}
                            <button type="button" onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
                                className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                                {tab === "login" ? "Create one" : "Sign in"}
                            </button>
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
