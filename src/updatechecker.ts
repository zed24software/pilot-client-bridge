import axios from "axios";
import { execSync } from "child_process";
import * as os from "os";

// ─── Configuration ────────────────────────────────────────────────────────────

const GITHUB_OWNER = "zed24software";
const GITHUB_REPO = "pilot-client-bridge";
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  body: string;
  published_at: string;
}

interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the first semver-like number sequence from a version string,
 * ignoring any prefix (e.g. "beta-", "v", "release-", etc.).
 * e.g. "beta-1.0.0" → [1, 0, 0], "v2.3.1" → [2, 3, 1]
 */
function parseVersion(version: string): [number, number, number] {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Returns true if `remote` is strictly newer than `local`.
 */
function isNewer(local: string, remote: string): boolean {
  const [lMaj, lMin, lPat] = parseVersion(local);
  const [rMaj, rMin, rPat] = parseVersion(remote);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

/**
 * Reads the current app version from package.json in the project root.
 * Falls back to "0.0.0" if not found.
 */
function getCurrentVersion(): string {
  try {
    // __dirname works in CommonJS; adjust if using ESM
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require("../../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Fetches the latest GitHub release metadata via the REST API.
 */
async function fetchLatestRelease(): Promise<GitHubRelease> {
  const { data } = await axios.get<GitHubRelease>(GITHUB_API_URL, {
    headers: {
      "User-Agent": `${GITHUB_REPO}-update-checker`,
      Accept: "application/vnd.github+json",
    },
  });
  return data;
}

// ─── Desktop notification ─────────────────────────────────────────────────────

/**
 * Sends a native desktop notification.
 * Supports macOS (osascript), Linux (notify-send), and Windows (PowerShell).
 */
function sendDesktopNotification(title: string, message: string): void {
  const platform = os.platform();

  try {
    if (platform === "darwin") {
      const escaped = message.replace(/"/g, '\\"');
      execSync(
        `osascript -e 'display notification "${escaped}" with title "${title}"'`
      );
    } else if (platform === "linux") {
      execSync(`notify-send "${title}" "${message}"`);
    } else if (platform === "win32") {
      // Uses a self-cleaning PowerShell toast — no extra packages needed
      const script = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
        $xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
        $xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${title}</text><text>${message}</text></binding></visual></toast>')
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${GITHUB_REPO}').Show($toast)
      `;
      execSync(`powershell -Command "${script.replace(/\n\s*/g, " ")}"`);
    } else {
      console.warn(
        `[UpdateChecker] Desktop notifications not supported on platform: ${platform}`
      );
    }
  } catch (err) {
    console.warn("[UpdateChecker] Could not send desktop notification:", err);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Checks GitHub for a newer release and, if one is found, fires a desktop
 * push notification urging the user to update.
 *
 * @param currentVersion  Override the version string (defaults to package.json).
 * @returns               A result object describing the outcome.
 */
export async function checkForUpdates(
  currentVersion?: string
): Promise<UpdateCheckResult> {
  const localVersion = currentVersion ?? getCurrentVersion();

  let release: GitHubRelease;
  try {
    release = await fetchLatestRelease();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[UpdateChecker] Failed to fetch release info:", error);
    return {
      updateAvailable: false,
      currentVersion: localVersion,
      latestVersion: null,
      releaseUrl: null,
      error,
    };
  }

  const latestVersion = release.tag_name;
  const updateAvailable = isNewer(localVersion, latestVersion);

  if (updateAvailable) {
    console.log(
      `[UpdateChecker] Update available: ${localVersion} → ${latestVersion}`
    );

    sendDesktopNotification(
      "Update Available – Pilot Client Bridge",
      `Version ${latestVersion} is available (you have ${localVersion}). Visit the releases page to download.`
    );
  } else {
    console.log(
      `[UpdateChecker] Up to date (${localVersion}). Latest: ${latestVersion}`
    );
  }

  return {
    updateAvailable,
    currentVersion: localVersion,
    latestVersion,
    releaseUrl: release.html_url ?? RELEASES_URL,
  };
}

/**
 * Convenience wrapper: runs the update check on an interval.
 *
 * @param intervalMs  How often to check, in milliseconds. Default: 1 hour.
 * @returns           A function that cancels the interval when called.
 */
export function startPeriodicUpdateCheck(
  intervalMs = 60 * 60 * 1000
): () => void {
  // Run immediately, then repeat
  void checkForUpdates();
  const handle = setInterval(() => void checkForUpdates(), intervalMs);
  return () => clearInterval(handle);
}