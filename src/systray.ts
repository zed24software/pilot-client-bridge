import SysTrayImport, { MenuItem } from "systray2";
import os from "os";
import { dirname, join } from "path";

const SysTray = ((SysTrayImport as any).default ?? SysTrayImport) as typeof SysTrayImport;
type SysTrayInstance = InstanceType<typeof SysTrayImport>;

type ClickableMenuItem = MenuItem & { click: () => void };

function loadIcon() {
  const isWin = os.platform() === "win32";
  return join(__dirname, "./assets", `icon.${isWin ? "ico" : "png"}`);
}

const IDX_DISCORD = 0;
const IDX_CHANNEL = 1;
const IDX_SEP1 = 2;
const IDX_ACTIVITY = 3;
const IDX_SEP2 = 4;
const IDX_EXIT = 5;

function discordItem(connected: boolean) {
  return {
    title: `Discord: ${connected ? "Connected" : "Disconnected"}`,
    tooltip: "",
    enabled: false,
    checked: false,
  };
}

function channelItem(name: string | null) {
  return {
    title: `Channel: ${name ?? "None"}`,
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

let _tray: SysTrayInstance | null = null;

const systray2BinaryDir = dirname(process.execPath); /* bundled next to 24client */

export function initTray(
  initialActivity: boolean,
  onToggleActivity: (next: boolean) => void,
  onExit: () => void,
): void {
  let activityState = initialActivity;

  _tray = new SysTray({
    menu: {
      icon: loadIcon(),
      title: "",
      tooltip: "Pilot Client Bridge",
      items: [
        discordItem(false),
        channelItem(null),
        SysTray.separator,
        activityItem(initialActivity),
        SysTray.separator,
        { title: "Exit", tooltip: "Exit Pilot Client Bridge", enabled: true, checked: false },
      ],
    },
    debug: false,
    copyDir: systray2BinaryDir,
  });

  _tray.onClick((action) => {
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

export function updateChannel(name: string | null): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_CHANNEL, item: channelItem(name) });
}

export function updateActivity(enabled: boolean): void {
  _tray?.sendAction({ type: "update-item", seq_id: IDX_ACTIVITY, item: activityItem(enabled) });
}