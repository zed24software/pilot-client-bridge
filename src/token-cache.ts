import fs from "node:fs";
import path from "node:path";
import { appDataDir } from "./paths";

const TOKEN_DIR = appDataDir("pilot-client-bridge");

interface TokenCache {
  access_token: string;
  expires_at: number;
}

function tokenFile(key: string) {
  return path.join(TOKEN_DIR, `token-${key}.json`);
}

export function readCachedToken(key = "activity"): string | null {
  try {
    const cache = JSON.parse(fs.readFileSync(tokenFile(key), "utf-8")) as TokenCache;
    if (Date.now() < cache.expires_at) return cache.access_token;
    return null;
  } catch {
    return null;
  }
}

export function writeCachedToken(access_token: string, expires_in: number, key = "activity") {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  const cache: TokenCache = {
    access_token,
    expires_at: Date.now() + expires_in * 1000,
  };
  fs.writeFileSync(tokenFile(key), JSON.stringify(cache));
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
  writeCachedToken(body.access_token, body.expires_in ?? 604800, "activity");
  return body.access_token;
}

export async function exchangeCodeLocally(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Local token exchange failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json() as { access_token: string; expires_in?: number };
  writeCachedToken(body.access_token, body.expires_in ?? 604800, "voice");
  return body.access_token;
}
