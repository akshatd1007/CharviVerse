import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "magazines");
const IS_NETLIFY = !!process.env.NETLIFY;

async function loadFromLocal(id: string) {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
}

async function loadFromNetlify(id: string) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("magazines");
    const data = await store.get(id, { type: "text" });
    if (!data) return null;
    return JSON.parse(data);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        let data;

        if (IS_NETLIFY) {
            data = await loadFromNetlify(id);
        } else {
            data = await loadFromLocal(id);
        }

        if (!data) {
            return NextResponse.json({ error: "Magazine not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Load error:", err?.message || err);
        return NextResponse.json({ error: "Magazine not found" }, { status: 404 });
    }
}
