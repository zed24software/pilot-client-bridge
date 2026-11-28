import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LEGACY_NAMES: Record<string, string> = {
  "24scope-bridge": "pilot-client-bridge",
};

function baseDir(): string {
  switch (process.platform) {
    case "win32":
      return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support");
    default:
      return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  }
}

export function appDataDir(appName: string): string {
  const base = baseDir();
  const current = path.join(base, appName);
  const legacyName = LEGACY_NAMES[appName];
  if (!legacyName) return current;

  const legacy = path.join(base, legacyName);
  if (fs.existsSync(current) || !fs.existsSync(legacy)) return current;

  try {
    fs.renameSync(legacy, current);
    return current;
  } catch (err: any) {
    console.warn(`[Paths] could not migrate ${legacy} to ${current}: ${err.message}`);
    return legacy;
  }
}
