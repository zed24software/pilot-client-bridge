import express, { type Request, type Response } from "express"
import cors from "cors"
import { DiscordRPC } from "./rpc";
import { RPCCommand } from "./rpc/types/commands";
import { client_id, activity_enabled } from "./rpc-config.json";
import channels from "./channels.json";
import { initTray, updateDiscordStatus, updateChannel, updateActivity, updateCallsign } from "./systray";
import { checkForUpdates } from "./updatechecker";
import { exchangeCodeLocally } from "./token-cache";
import { REDIRECT_URI } from "./local-auth-server";
import { readVoiceCreds, writeVoiceCreds, clearVoiceCreds, type VoiceCredentials } from "./voice-creds";

checkForUpdates();

const app = express();
app.use(cors({
  origin: ["https://zedruc.net", "http://localhost:5174"],
}));
app.use(express.json());

const BRIDGE_PORT = 57330;
const SERVER_VERSION = "1.0.0";

const activityRpc = new DiscordRPC(
  client_id,
  [],
  () => Promise.resolve(""),
  "activity",
  true
);

activityRpc.onAuthenticated = () => {
  updateDiscordStatus(true);
  if (!activityEnabled) clearActivity().catch(console.warn);
  activityRpc.sendRequest(RPCCommand.GET_SELECTED_VOICE_CHANNEL)
    .then((res) => {
      cachedSelectedChannel = res.data;
      updateChannel(res.data?.name ?? null);
    })
    .catch((err: Error) => console.warn("[ActivityRPC] GET_SELECTED_VOICE_CHANNEL failed:", err.message));
};

activityRpc.connect().then(() => {
  console.log("[Bridge] Activity RPC connected — sending handshake");
  activityRpc.sendHandshake();
}).catch((err) => {
  console.error("[Bridge] Activity RPC connect failed:", err.message);
  updateDiscordStatus(false);
});

let voiceRpc: DiscordRPC | null = null;
let voiceRpcReady = false;
let voiceRpcConnecting = false;

function initVoiceRpc(creds: VoiceCredentials) {
  if (voiceRpcConnecting) return;
  voiceRpcConnecting = true;

  voiceRpc = new DiscordRPC(
    creds.client_id,
    ["rpc", "rpc.voice.read", "identify"],
    (code) => exchangeCodeLocally(creds.client_id, creds.client_secret, code, REDIRECT_URI),
    "voice"
  );

  voiceRpc.onAuthenticated = () => {
    voiceRpcReady = true;
    console.log("[Bridge] Voice RPC authenticated");
    voiceRpc!.sendRequest(RPCCommand.GET_CHANNELS, { guild_id: "919656909563371600" })
      .then((res) => { cachedGuildChannels = res.data.channels; })
      .catch((err: Error) => console.warn("[VoiceRPC] GET_CHANNELS failed:", err.message));
  };

  voiceRpc.connect().then(() => {
    console.log("[Bridge] Voice RPC connected — sending handshake");
    voiceRpc!.sendHandshake();
  }).catch((err) => {
    console.error("[Bridge] Voice RPC connect failed:", err.message);
    voiceRpcConnecting = false;
    voiceRpc = null;
  });
}

const savedCreds = readVoiceCreds();
if (savedCreds) {
  initVoiceRpc(savedCreds);
}

function rpcActivityReady(res: Response): boolean {
  if (!activityRpc.isAuthenticated) {
    res.status(503).json({ status: 503, error: "Activity RPC not authenticated" });
    return false;
  }
  return true;
}

function rpcVoiceReady(res: Response): boolean {
  if (!voiceRpc || !voiceRpcReady) {
    res.status(503).json({ status: 503, error: "Voice RPC not configured or not authenticated" });
    return false;
  }
  return true;
}

type FlightPhase = "climb" | "cruise" | "descent" | "approach" | "ground";

interface FlightState {
  altitude?: number;
  heading?: number;
  groundspeed?: number;
  phase?: FlightPhase;
  callsign?: string;
  aircraft?: string;
  departure?: string;
  destination?: string;
}

let flightState: FlightState = {};
let activityEnabled = activity_enabled;
let lastStateUpdate = 0;
let flightStartedAt = Date.now();
let cachedGuildChannels: any[] = [];
let cachedSelectedChannel: any = null;

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const PHASE_LABELS: Record<FlightPhase, string> = {
  climb: "↑ Climbing",
  cruise: "Cruising",
  descent: "↓ Descending",
  approach: "On Approach",
  ground: "On the ground",
};

function buildActivity() {
  if (lastStateUpdate > 0 && Date.now() - lastStateUpdate > IDLE_TIMEOUT_MS) {
    return { details: "Idling", timestamps: { start: flightStartedAt } };
  }

  const parts: string[] = [];
  if (flightState.altitude !== undefined) parts.push(`ALT ${flightState.altitude.toLocaleString()}ft`);
  if (flightState.heading !== undefined) parts.push(`HDG ${flightState.heading}°`);
  if (flightState.groundspeed !== undefined) parts.push(`GS ${flightState.groundspeed}kt`);

  const details = parts.length
    ? parts.join("  |  ")
    : PHASE_LABELS[flightState.phase ?? "ground"];

  const routePart = flightState.departure && flightState.destination
    ? `${flightState.departure} → ${flightState.destination}`
    : null;

  let state: string;
  if (flightState.callsign) {
    state = flightState.callsign;
    if (flightState.aircraft) state += ` · ${flightState.aircraft}`;
    if (routePart) state += ` · ${routePart}`;
  } else {
    state = routePart ?? flightState.aircraft ?? "Preparing to fly...";
  }

  return { details, state, timestamps: { start: flightStartedAt } };
}

async function clearActivity() {
  console.log("[Activity] SET_ACTIVITY null (clear)");
  await activityRpc.sendRequest(RPCCommand.SET_ACTIVITY, { pid: process.pid, activity: null });
}

setInterval(async () => {
  if (!activityRpc.isAuthenticated || !activityEnabled) return;
  try {
    const activity = buildActivity();
    console.log("[Activity] SET_ACTIVITY", JSON.stringify(activity));
    await activityRpc.sendRequest(RPCCommand.SET_ACTIVITY, { pid: process.pid, activity });
  } catch (err: any) {
    console.warn("[Activity] update failed:", err.message);
  }
}, 10_000);

const timeStarted = Date.now();

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: 200,
    message: "API online",
    v: SERVER_VERSION,
    timeOnlineSeconds: Math.floor((Date.now() - timeStarted) / 1000),
  });
});

app.get("/session", (_req: Request, res: Response) => {
  res.json({
    status: 200,
    data: {
      durationSeconds: Math.floor((Date.now() - flightStartedAt) / 1000),
      callsign: flightState.callsign ?? null,
      aircraft: flightState.aircraft ?? null,
      departure: flightState.departure ?? null,
      destination: flightState.destination ?? null,
    },
  });
});

app.get("/voice/status", (_req: Request, res: Response) => {
  const creds = readVoiceCreds();
  res.json({
    status: 200,
    data: {
      configured: !!creds,
      client_id: creds?.client_id ?? null,
      connected: voiceRpcReady,
      redirect_uri: REDIRECT_URI,
    },
  });
});

app.post("/voice/credentials", (req: Request, res: Response) => {
  const { client_id: userClientId, client_secret } = req.body as {
    client_id?: string;
    client_secret?: string;
  };

  if (!userClientId || !client_secret) {
    res.status(400).json({ status: 400, error: "client_id and client_secret required" });
    return;
  }

  const creds: VoiceCredentials = { client_id: userClientId, client_secret };
  writeVoiceCreds(creds);

  voiceRpcReady = false;
  voiceRpcConnecting = false;
  voiceRpc = null;
  initVoiceRpc(creds);

  res.json({ status: 200, message: "Voice credentials saved. Connecting..." });
});

app.delete("/voice/credentials", (_req: Request, res: Response) => {
  clearVoiceCreds();
  voiceRpc = null;
  voiceRpcReady = false;
  voiceRpcConnecting = false;
  res.json({ status: 200 });
});

app.post("/rpc/select-voice-channel", async (req: Request, res: Response) => {
  if (!rpcVoiceReady(res)) return;

  const { frequency, navigate, timeout } = req.body as {
    frequency: string;
    navigate?: boolean;
    timeout?: number;
  };

  if (!frequency) {
    res.status(400).json({ status: 400, error: "frequency required" });
    return;
  }

  const entry = channels.find((c) => c.frequency === frequency);
  if (!entry) {
    res.status(404).json({ status: 404, error: `unknown frequency: ${frequency}` });
    return;
  }

  try {
    const data = await voiceRpc!.sendRequest(RPCCommand.SELECT_VOICE_CHANNEL, {
      channel_id: entry.channelId,
      force: true,
      ...(navigate !== undefined && { navigate }),
      ...(timeout !== undefined && { timeout }),
    });
    updateChannel(entry.position, entry.frequency);
    res.json({ status: 200, data });
  } catch (err: any) {
    res.status(500).json({ status: 500, error: err.message });
  }
});

app.post("/rpc/leave-voice-channel", async (_req: Request, res: Response) => {
  if (!rpcVoiceReady(res)) return;
  try {
    await voiceRpc!.sendRequest(RPCCommand.SELECT_VOICE_CHANNEL, { channel_id: null, force: true });
    updateChannel(null);
    cachedSelectedChannel = null;
    res.json({ status: 200 });
  } catch (err: any) {
    res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/rpc/voice-connection-status", (_req: Request, res: Response) => {
  const rpc = voiceRpc ?? activityRpc;
  if (!rpc.isAuthenticated) {
    res.status(503).json({ status: 503, error: "RPC not authenticated" });
    return;
  }
  res.json({ status: 200, data: rpc.voiceConnectionStatus });
});

app.post("/rpc/set-activity", async (req: Request, res: Response) => {
  if (!rpcActivityReady(res)) return;

  const { pid, activity } = req.body;
  if (pid === undefined || !activity) {
    res.status(400).json({ status: 400, error: "pid and activity required" });
    return;
  }

  try {
    const data = await activityRpc.sendRequest(RPCCommand.SET_ACTIVITY, { pid, activity });
    res.json({ status: 200, data });
  } catch (err: any) {
    res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/rpc/current-user", (_req: Request, res: Response) => {
  if (!rpcActivityReady(res)) return;
  res.json({ status: 200, data: activityRpc.currentUser });
});

app.get("/channels", (_req: Request, res: Response) => {
  res.json({ status: 200, data: cachedGuildChannels });
});

app.get("/rpc/selected-voice-channel", (_req: Request, res: Response) => {
  if (!rpcActivityReady(res)) return;
  res.json({ status: 200, data: cachedSelectedChannel });
});

app.post("/activity/toggle", (req: Request, res: Response) => {
  activityEnabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : !activityEnabled;
  if (!activityEnabled) clearActivity().catch(console.warn);
  updateActivity(activityEnabled);
  res.json({ status: 200, activityEnabled });
});

app.post("/state", (req: Request, res: Response) => {
  const { altitude, heading, groundspeed, phase, callsign, aircraft, departure, destination } =
    req.body as FlightState;

  if (callsign !== undefined && callsign !== flightState.callsign) {
    flightState = {};
    flightStartedAt = Date.now();
  }

  if (altitude !== undefined) flightState.altitude = altitude;
  if (heading !== undefined) flightState.heading = heading;
  if (groundspeed !== undefined) flightState.groundspeed = groundspeed;
  if (phase !== undefined) flightState.phase = phase;
  if (callsign !== undefined) flightState.callsign = callsign;
  if (aircraft !== undefined) flightState.aircraft = aircraft;
  if (departure !== undefined) flightState.departure = departure;
  if (destination !== undefined) flightState.destination = destination;

  lastStateUpdate = Date.now();
  updateCallsign(flightState.callsign ?? null);
  res.json({ status: 200 });
});

app.listen(BRIDGE_PORT, "127.0.0.1", () => {
  console.log(`Pilot Client Bridge listening on 127.0.0.1:${BRIDGE_PORT}`);
});

initTray(activityEnabled, (next: boolean) => {
  activityEnabled = next;
  if (!activityEnabled) clearActivity().catch(console.warn);
}, () => process.exit(0));
