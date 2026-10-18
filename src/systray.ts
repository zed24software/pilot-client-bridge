import type SysTrayType from "systray2";
import type { MenuItem } from "systray2";
import os from "os";
import fs from "fs";
import { join } from "path";
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
const IDX_CHANNEL = 1;
const IDX_CALLSIGN = 2;
const IDX_SEP1 = 3;
const IDX_ACTIVITY = 4;
const IDX_SEP2 = 5;
const IDX_EXIT = 6;

function discordItem(connected: boolean) {
  return {
    title: `Discord: ${connected ? "Connected" : "Disconnected"}`,
    tooltip: "",
    enabled: false,
    checked: false,
  };
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

export function initTray(
  initialActivity: boolean,
  onToggleActivity: (next: boolean) => void,
  onExit: () => void,
): void {
  let activityState = initialActivity;

  ensureTrayBin();
  _tray = new SysTray({
    menu: {
      icon: loadIcon(),
      title: "",
      tooltip: "Pilot Client Bridge",
      items: [
        discordItem(false),
        channelItem(null),
        callsignItem(null),
        SysTray.separator,
        activityItem(initialActivity),
        SysTray.separator,
        { title: "Exit", tooltip: "Exit Pilot Client Bridge", enabled: true, checked: false },
      ],
    },
    debug: false,
    copyDir: true,
  });

  _tray.onClick((action: { seq_id: number }) => {
    switch (action.seq_id) {
      case IDX_ACTIVITY:
        activityState = !activityState;
        onToggleActivity(activityState);
        updateActivity(activityState);
        break;
      case IDX_EXIT:
        _tray!.kill(false);
        onExit();
        break;
    }
  });
}

export function updateDiscordStatus(connected: boolean): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_DISCORD, item: discordItem(connected) });
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
