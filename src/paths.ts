import os from "node:os";
import path from "node:path";

export function appDataDir(appName: string): string {
  switch (process.platform) {
    case "win32":
      return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), appName);
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName);
    default:
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), appName);
  }
}
