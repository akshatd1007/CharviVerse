export type ElementType = "text" | "sticker";

export interface PageElement {
    id: string;
    pageIndex: number; // 0 is front cover, inner pages start from 1
    type: ElementType;
    content: string; // The text string, or the URL/ID of the sticker
    x: number;
    y: number;
    width: number | string;
    height: number | string;
    styles?: {
        fontFamily?: string;
        fontSize?: string;
        fontWeight?: string;
        color?: string;
    };
}

export interface PhotoFilter {
    brightness: number;   // 0–200, default 100
    contrast: number;     // 0–200, default 100
    saturation: number;   // 0–200, default 100
    blur: number;         // 0–10, default 0 (px)
    grayscale: number;    // 0–100, default 0 (%)
}

export const defaultFilter: PhotoFilter = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
};

export function buildFilterString(f: PhotoFilter): string {
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur}px) grayscale(${f.grayscale}%)`;
}

export interface MusicTrack {
    id: string;
    name: string;
    artist: string;
    genre: string;
    url: string;  // direct MP3 URL (royalty-free)
    color: string; // accent color for player UI
}
