import fs from "node:fs";
import path from "node:path";

const TOKEN_DIR = path.join(process.env.APPDATA ?? process.env.HOME ?? ".", "pilot-client-bridge");
const TOKEN_FILE = path.join(TOKEN_DIR, "token.json");

interface TokenCache {
  access_token: string;
  expires_at: number;
}

export function readCachedToken(): string | null {
  try {
    const cache = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenCache;
    if (Date.now() < cache.expires_at) return cache.access_token;
    return null;
  } catch {
    return null;
  }
}

export function writeCachedToken(access_token: string, expires_in: number) {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  const cache: TokenCache = {
    access_token,
    expires_at: Date.now() + expires_in * 1000,
  };
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(cache));
}

export async function exchangeCode(authServer: string, code: string): Promise<string> {
  const res = await fetch(`${authServer}/pilotclient/discord/rpc-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json() as { access_token: string; expires_in?: number };
  writeCachedToken(body.access_token, body.expires_in ?? 604800);
  return body.access_token;
}
