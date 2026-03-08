// ── CharviVerse Cloud Persistence ──────────────────────────────────────
import type { PhotoFilter, MusicTrack } from './types';

export interface SavedMagazine {
    id: string;
    title: string;
    createdAt: string;   // ISO string
    updatedAt: string;
    templateId: string;
    photoUrls: string[]; // blob URLs won't persist; only used in-session
    photoTypes: ('photo' | 'video')[];
    photoPosters?: (string | undefined)[];
    elements: object[];
    texts: Record<string, string>;
    thumbnail?: string;  // base64 jpeg of first page snapshot
    coverIndex?: number; // Added to enable fetching the proper base64 fallback
    photoFilters?: Record<string, PhotoFilter>; // per-photo CSS filters (keyed by index string)
    musicTrack?: MusicTrack | null;             // background music for shared viewer
}

export interface User {
    username: string;
    passwordHash: string;
}

const SESSION_KEY = 'charvi_current_user';

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function registerUser(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            body: JSON.stringify({ action: "signup", username, password })
        });
        const json = await res.json();
        if (json.success) {
            setCurrentUser(username);
            return { ok: true };
        }
        return { ok: false, error: json.error || "Signup failed" };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export async function loginUser(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            body: JSON.stringify({ action: "login", username, password })
        });
        const json = await res.json();
        if (json.success) {
            setCurrentUser(json.username);
            return { ok: true };
        }
        return { ok: false, error: json.error || "Login failed" };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export function setCurrentUser(username: string) {
    if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, username);
    }
}

export function getCurrentUser(): string | null {
    if (typeof window !== "undefined") {
        return localStorage.getItem(SESSION_KEY);
    }
    return null;
}

export function logoutUser() {
    if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
    }
}

// ── Magazines (Cloud Drafts) ──────────────────────────────────────────────────

export async function getMagazines(userId: string): Promise<SavedMagazine[]> {
    try {
        const res = await fetch(`/api/magazines/drafts?username=${encodeURIComponent(userId)}`);
        const json = await res.json();
        return json.drafts || [];
    } catch {
        return [];
    }
}

export async function saveMagazine(userId: string, magazine: SavedMagazine): Promise<void> {
    try {
        await fetch("/api/magazines/drafts", {
            method: "POST",
            body: JSON.stringify({ username: userId, magazine })
        });
    } catch (e) {
        console.error("Save failed:", e);
    }
}

export async function deleteMagazine(userId: string, id: string): Promise<void> {
    try {
        await fetch(`/api/magazines/drafts?username=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
    } catch (e) {
        console.error("Delete failed:", e);
    }
}

export async function renameMagazine(userId: string, id: string, newTitle: string): Promise<void> {
    const all = await getMagazines(userId);
    const m = all.find(mag => mag.id === id);
    if (m) {
        await saveMagazine(userId, { ...m, title: newTitle });
    }
}
