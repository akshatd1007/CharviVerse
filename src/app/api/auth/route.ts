import { NextResponse, NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

const IS_NETLIFY = !!process.env.NETLIFY || process.env.NODE_ENV === 'production';
const DATA_DIR = path.join(process.cwd(), "data", "users");

async function getUsers() {
    if (IS_NETLIFY) {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore("users");
        const data = await store.get("all_users", { type: "text" });
        return data ? JSON.parse(data) : [];
    } else {
        try {
            const data = await fs.readFile(path.join(DATA_DIR, "users.json"), "utf-8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
}

async function saveUsers(users: any[]) {
    if (IS_NETLIFY) {
        const { getStore } = await import("@netlify/blobs");
        const store = getStore("users");
        await store.set("all_users", JSON.stringify(users));
    } else {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(path.join(DATA_DIR, "users.json"), JSON.stringify(users), "utf-8");
    }
}

function hashPassword(pw: string): string {
    // Simple btoa for now to match current storage.ts, 
    // but in a real prod app we'd use bcrypt/scrypt.
    return Buffer.from(pw).toString('base64');
}

export async function POST(req: NextRequest) {
    try {
        const { action, username, password } = await req.json();
        const users = await getUsers();
        const lowerName = username?.toLowerCase();

        if (action === "signup") {
            if (users.find((u: any) => u.username.toLowerCase() === lowerName)) {
                return NextResponse.json({ success: false, error: "Username taken" }, { status: 400 });
            }
            users.push({ username, passwordHash: hashPassword(password) });
            await saveUsers(users);
            return NextResponse.json({ success: true });
        }

        if (action === "login") {
            const user = users.find((u: any) => u.username.toLowerCase() === lowerName);
            if (!user || user.passwordHash !== hashPassword(password)) {
                return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
            }
            return NextResponse.json({ success: true, username: user.username });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
