import { NextResponse, NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

// ── Storage abstraction ────────────────────────────────────────────
// Production (Netlify): Uses Netlify Blobs — data stays in YOUR Netlify account,
//   encrypted, private, never shared with third parties.
// Development (local): Uses the local filesystem under data/magazines/

const DATA_DIR = path.join(process.cwd(), "data", "magazines");
const IS_NETLIFY = !!process.env.NETLIFY || process.env.NODE_ENV === 'production';

async function saveToLocal(id: string, data: object) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(data), "utf-8");
}

async function saveToNetlify(id: string, data: object) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("magazines");
    await store.set(id, JSON.stringify(data));
}

// Allow large payloads (compressed images in Base64)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const magazineData = payload.magazineData;
        const id = payload.id || crypto.randomUUID();

        const body = JSON.stringify(magazineData);
        console.log(`Publishing magazine ${id} to ${IS_NETLIFY ? 'Netlify Blobs' : 'Local Storage'}: ${(body.length / 1024 / 1024).toFixed(2)} MB`);

        if (IS_NETLIFY) {
            await saveToNetlify(id, magazineData);
        } else {
            await saveToLocal(id, magazineData);
        }

        console.log(`Published successfully: /magazine/${id}`);
        return NextResponse.json({ success: true, url: `/magazine/${id}` });
    } catch (err: any) {
        console.error("Publish error:", err?.message || err);
        return NextResponse.json(
            { error: err?.message || "Failed to publish magazine" },
            { status: 500 }
        );
    }
}
