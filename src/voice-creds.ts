import fs from "node:fs";
import path from "node:path";

const CREDS_DIR = path.join(process.env.APPDATA ?? process.env.HOME ?? ".", "pilot-client-bridge");
const CREDS_FILE = path.join(CREDS_DIR, "voice-creds.json");

export interface VoiceCredentials {
  client_id: string;
  client_secret: string;
}

export function readVoiceCreds(): VoiceCredentials | null {
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, "utf-8")) as VoiceCredentials;
  } catch {
    return null;
  }
}

export function writeVoiceCreds(creds: VoiceCredentials) {
  fs.mkdirSync(CREDS_DIR, { recursive: true });
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds));
}

export function clearVoiceCreds() {
  try { fs.unlinkSync(CREDS_FILE); } catch {}
}
