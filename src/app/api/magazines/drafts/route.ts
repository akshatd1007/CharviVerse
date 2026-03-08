import { NextResponse, NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

const IS_NETLIFY = !!process.env.NETLIFY || process.env.NODE_ENV === 'production';
const DATA_DIR = path.join(process.cwd(), "data", "drafts");

async function getUserDrafts(username: string) {
    if (IS_NETLIFY) {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore("drafts");
        const key = `user_${username.toLowerCase()}`;
        const data = await store.get(key, { type: "text" });
        return data ? JSON.parse(data) : [];
    } else {
        try {
            const data = await fs.readFile(path.join(DATA_DIR, `${username.toLowerCase()}.json`), "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}

async function saveUserDrafts(username: string, drafts: any[]) {
    if (IS_NETLIFY) {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore("drafts");
        const key = `user_${username.toLowerCase()}`;
        await store.set(key, JSON.stringify(drafts));
    } else {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(path.join(DATA_DIR, `${username.toLowerCase()}.json`), JSON.stringify(drafts), "utf-8");
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

    try {
        const drafts = await getUserDrafts(username);
        return NextResponse.json({ success: true, drafts });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { username, magazine } = await req.json();
        if (!username || !magazine) return NextResponse.json({ error: "Missing data" }, { status: 400 });

        const drafts = await getUserDrafts(username);
        const idx = drafts.findIndex((d: any) => d.id === magazine.id);

        const now = new Date().toISOString();
        const updatedMagazine = {
            ...magazine,
            updatedAt: now,
            createdAt: idx >= 0 ? drafts[idx].createdAt : now
        };

        if (idx >= 0) {
            drafts[idx] = updatedMagazine;
        } else {
            drafts.unshift(updatedMagazine);
        }

        await saveUserDrafts(username, drafts);
        return NextResponse.json({ success: true, magazine: updatedMagazine });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const id = searchParams.get("id");
    if (!username || !id) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    try {
        let drafts = await getUserDrafts(username);
        drafts = drafts.filter((d: any) => d.id !== id);
        await saveUserDrafts(username, drafts);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
