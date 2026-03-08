// ── CharviVerse localStorage persistence ──────────────────────────────────────
import type { PhotoFilter, MusicTrack } from './types';

export interface SavedMagazine {
    id: string;
    title: string;
    createdAt: string;   // ISO string
    updatedAt: string;
    templateId: string;
    photoUrls: string[]; // blob URLs won't persist; only used in-session
    photoTypes: ('photo' | 'video')[];
    elements: object[];
    texts: Record<string, string>;
    thumbnail?: string;  // base64 jpeg of first page snapshot
    coverIndex?: number; // Added to enable fetching the proper base64 fallback
    photoFilters?: Record<string, PhotoFilter>; // per-photo CSS filters (keyed by index string)
    musicTrack?: MusicTrack | null;             // background music for shared viewer
}

export interface User {
    username: string;
    passwordHash: string; // simple btoa — NOT cryptographically secure
}

const USERS_KEY = 'charvi_users';
const SESSION_KEY = 'charvi_current_user';
const magazinesKey = (userId: string) => `charvi_magazines_${userId}`;

// ── Auth ─────────────────────────────────────────────────────────────────────

function hashPassword(pw: string): string {
    return btoa(unescape(encodeURIComponent(pw)));
}

export function getStoredUsers(): User[] {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
}

export function registerUser(username: string, password: string): { ok: boolean; error?: string } {
    const users = getStoredUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, error: 'Username already taken.' };
    }
    users.push({ username, passwordHash: hashPassword(password) });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    setCurrentUser(username);
    return { ok: true };
}

export function loginUser(username: string, password: string): { ok: boolean; error?: string } {
    const users = getStoredUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { ok: false, error: 'User not found.' };
    if (user.passwordHash !== hashPassword(password)) return { ok: false, error: 'Incorrect password.' };
    setCurrentUser(user.username);
    return { ok: true };
}

export function setCurrentUser(username: string) {
    localStorage.setItem(SESSION_KEY, username);
}

export function getCurrentUser(): string | null {
    return localStorage.getItem(SESSION_KEY);
}

export function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
}

// ── Magazines ────────────────────────────────────────────────────────────────

export function getMagazines(userId: string): SavedMagazine[] {
    try { return JSON.parse(localStorage.getItem(magazinesKey(userId)) || '[]'); }
    catch { return []; }
}

export function saveMagazine(userId: string, magazine: SavedMagazine): void {
    const all = getMagazines(userId);
    const idx = all.findIndex(m => m.id === magazine.id);
    if (idx >= 0) { all[idx] = { ...magazine, updatedAt: new Date().toISOString() }; }
    else { all.unshift(magazine); }
    localStorage.setItem(magazinesKey(userId), JSON.stringify(all));
}

export function deleteMagazine(userId: string, id: string): void {
    const all = getMagazines(userId).filter(m => m.id !== id);
    localStorage.setItem(magazinesKey(userId), JSON.stringify(all));
}

export function renameMagazine(userId: string, id: string, newTitle: string): void {
    const all = getMagazines(userId);
    const idx = all.findIndex(m => m.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], title: newTitle, updatedAt: new Date().toISOString() };
        localStorage.setItem(magazinesKey(userId), JSON.stringify(all));
    }
}
