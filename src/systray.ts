import type SysTrayType from "systray2";
import type { MenuItem } from "systray2";
import os from "os";
import fs from "fs";
import { join } from "path";
import open from "open";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SysTray: typeof SysTrayType = require("systray2").default;
import { trayBinWinBase64, trayBinDarwinBase64, trayBinLinux64 } from "./traybin-embedded";

const trayBins = new Map<NodeJS.Platform, { binName: string; binBase64: string }>([
  ["linux", {
    binName: "tray_linux_release",
    binBase64: trayBinLinux64
  }],
  ["win32", {
    binName: "tray_windows_release.exe",
    binBase64: trayBinWinBase64
  }],
  ["darwin", {
    binName: "tray_darwin_release",
    binBase64: trayBinDarwinBase64
  }],
]);

function isMac() {
  return os.platform() === "darwin";
}

function isLinux() {
  return os.platform() === "linux";
}

function ensureTrayBin(): void {
  const supportedPlatforms = [...trayBins.keys()];
  const platform = os.platform();

  if(!supportedPlatforms.includes(platform)) {
    console.error(`Platform ${platform} is not supported`);
    return;
  }

  const trayBinInfo = trayBins.get(platform);
  if(!trayBinInfo) {
    console.error(`No tray binary for platform "${platform}"`);
    return;
  }
  const {binName, binBase64} = trayBinInfo;

  const cacheDir = join(os.homedir(), ".cache", "node-systray", "2.1.4");
  const cachePath = join(cacheDir, binName);
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, Buffer.from(binBase64, "base64"));
  }
  if (isMac() || isLinux()) fs.chmodSync(cachePath, 0o755);
}

type ClickableMenuItem = MenuItem & { click: () => void };

function loadIcon() {
  const isWin = os.platform() === "win32";
  return join(__dirname, "./assets", `icon.${isWin ? "ico" : "png"}`);
}

const IDX_DISCORD = 0;
const IDX_VOICE = 1;
const IDX_CHANNEL = 2;
const IDX_CALLSIGN = 3;
const IDX_ACTIVITY = 5;
const IDX_REAUTH = 6;
const IDX_DATA_DIR = 7;
const IDX_UPDATES = 9;
const IDX_EXIT = 11;

export type DiscordStatus = "disconnected" | "limited" | "authorized";
export type VoiceStatus = "unconfigured" | "connecting" | "connected";

function discordItem(status: DiscordStatus, username?: string | null) {
  const label = {
    disconnected: "Disconnected",
    limited: "Connected (not signed in)",
    authorized: username ? `Signed in as ${username}` : "Signed in",
  }[status];
  return { title: `Discord: ${label}`, tooltip: "", enabled: false, checked: false };
}

function voiceItem(status: VoiceStatus) {
  const label = { unconfigured: "Not configured", connecting: "Connecting...", connected: "Connected" }[status];
  return { title: `Voice: ${label}`, tooltip: "", enabled: false, checked: false };
}

function channelItem(name: string | null, frequency?: string | null) {
  const label = name
    ? frequency ? `${name} (${frequency})` : name
    : "None";
  return { title: `Channel: ${label}`, tooltip: "", enabled: false, checked: false };
}

function callsignItem(callsign: string | null) {
  return {
    title: `Callsign: ${callsign ?? "—"}`,
    tooltip: "",
    enabled: false,
    checked: false,
  };
}

function activityItem(enabled: boolean) {
  return {
    title: `Activity: ${enabled ? "On" : "Off"}`,
    tooltip: "Toggle Discord Rich Presence",
    enabled: true,
    checked: enabled,
  };
}

let _tray: InstanceType<typeof SysTray> | null = null;

export interface TrayHandlers {
  version: string;
  dataDir: string;
  onToggleActivity: (next: boolean) => void;
  onReauthenticate: () => void;
  onCheckForUpdates: () => void;
  onExit: () => void;
}

function actionItem(title: string, tooltip: string) {
  return { title, tooltip, enabled: true, checked: false };
}

export function initTray(initialActivity: boolean, handlers: TrayHandlers): void {
  let activityState = initialActivity;

  ensureTrayBin();
  _tray = new SysTray({
    menu: {
      icon: loadIcon(),
      title: "",
      tooltip: "Pilot Client Bridge",
      items: [
        discordItem("disconnected"),
        voiceItem("unconfigured"),
        channelItem(null),
        callsignItem(null),
        SysTray.separator,
        activityItem(initialActivity),
        actionItem("Re-authenticate Discord", "Clear the saved token and sign in again"),
        actionItem("Open data folder", handlers.dataDir),
        SysTray.separator,
        actionItem(`Check for updates (v${handlers.version})`, "Check GitHub for a newer release"),
        SysTray.separator,
        actionItem("Exit", "Exit Pilot Client Bridge"),
      ],
    },
    debug: false,
    copyDir: true,
  });

  _tray.onClick((action: { seq_id: number }) => {
    switch (action.seq_id) {
      case IDX_ACTIVITY:
        activityState = !activityState;
        handlers.onToggleActivity(activityState);
        updateActivity(activityState);
        break;
      case IDX_REAUTH:
        handlers.onReauthenticate();
        break;
      case IDX_DATA_DIR:
        fs.mkdirSync(handlers.dataDir, { recursive: true });
        open(handlers.dataDir).catch(console.warn);
        break;
      case IDX_UPDATES:
        handlers.onCheckForUpdates();
        break;
      case IDX_EXIT:
        _tray!.kill(false);
        handlers.onExit();
        break;
    }
  });
}

export function updateDiscordStatus(status: DiscordStatus, username?: string | null): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_DISCORD, item: discordItem(status, username) });
}

export function updateVoiceStatus(status: VoiceStatus): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_VOICE, item: voiceItem(status) });
}

export function updateChannel(name: string | null, frequency?: string | null): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_CHANNEL, item: channelItem(name, frequency) });
}

export function updateCallsign(callsign: string | null): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_CALLSIGN, item: callsignItem(callsign) });
}

export function updateActivity(enabled: boolean): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_ACTIVITY, item: activityItem(enabled) });
}
