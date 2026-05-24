import express, { type Request, type Response } from "express"
import cors from "cors"
import { DiscordRPC } from "./rpc";
import { RPCCommand } from "./rpc/types/commands";
import { client_id, auth_server, activity_enabled } from "./rpc-config.json";
import channels from "./channels.json";

const app = express();
app.use(cors({
  origin: ["https://zedruc.net", "http://localhost:5174"],
}));
app.use(express.json());

const BRIDGE_PORT = 57330;
const SERVER_VERSION = "1.0.0";

const discordRpc = new DiscordRPC(client_id, auth_server);
discordRpc.onAuthenticated = () => {
  if (!activityEnabled) clearActivity().catch(console.warn);
};

discordRpc.connect().then(() => {
  console.log("[Bridge] Discord IPC connected — sending handshake");
  discordRpc.sendHandshake();
}).catch((err) => console.error("[Bridge] IPC connect failed:", err.message));

function rpcReady(res: Response): boolean {
  if (!discordRpc.isAuthenticated) {
    res.status(503).json({ status: 503, error: "RPC not authenticated" });
    return false;
  }
  return true;
}

interface FlightState {
  altitude?: number;
  heading?: number;
  callsign?: string;
  aircraft?: string;
}

let flightState: FlightState = {};
let activityEnabled = activity_enabled;

function buildActivity() {
  const parts: string[] = [];
  if (flightState.altitude !== undefined) parts.push(`ALT ${flightState.altitude.toLocaleString()}ft`);
  if (flightState.heading !== undefined) parts.push(`HDG ${flightState.heading}°`);

  return {
    details: parts.length ? parts.join("  |  ") : "On the ground",
    state: flightState.callsign
      ? `${flightState.callsign}${flightState.aircraft ? ` · ${flightState.aircraft}` : ""}`
      : flightState.aircraft ?? "Flying",
    timestamps: { start: timeStarted },
  };
}

async function clearActivity() {
  await discordRpc.sendRequest(RPCCommand.SET_ACTIVITY, { pid: process.pid, activity: null });
}

setInterval(async () => {
  if (!discordRpc.isAuthenticated || !activityEnabled) return;
  try {
    await discordRpc.sendRequest(RPCCommand.SET_ACTIVITY, {
      pid: process.pid,
      activity: buildActivity(),
    });
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

app.post("/rpc/select-voice-channel", async (req: Request, res: Response) => {
  if (!rpcReady(res)) return;

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
    const data = await discordRpc.sendRequest(RPCCommand.SELECT_VOICE_CHANNEL, {
      channel_id: entry.channelId,
      force: true,
      ...(navigate !== undefined && { navigate }),
      ...(timeout !== undefined && { timeout }),
    });
    res.json({ status: 200, data });
  } catch (err: any) {
    res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/rpc/voice-connection-status", (_req: Request, res: Response) => {
  if (!rpcReady(res)) return;
  res.json({ status: 200, data: discordRpc.voiceConnectionStatus });
});

app.post("/rpc/set-activity", async (req: Request, res: Response) => {
  if (!rpcReady(res)) return;

  const { pid, activity } = req.body;
  if (pid === undefined || !activity) {
    res.status(400).json({ status: 400, error: "pid and activity required" });
    return;
  }

  try {
    const data = await discordRpc.sendRequest(RPCCommand.SET_ACTIVITY, { pid, activity });
    res.json({ status: 200, data });
  } catch (err: any) {
    res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/rpc/current-user", (_req: Request, res: Response) => {
  if (!rpcReady(res)) return;
  res.json({ status: 200, data: discordRpc.currentUser });
});

app.post("/activity/toggle", (req: Request, res: Response) => {
  activityEnabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : !activityEnabled;
  if (!activityEnabled) clearActivity().catch(console.warn);
  res.json({ status: 200, activityEnabled });
});

app.post("/state", (req: Request, res: Response) => {
  const { altitude, heading, callsign, aircraft } = req.body as FlightState;
  if (altitude !== undefined) flightState.altitude = altitude;
  if (heading !== undefined) flightState.heading = heading;
  if (callsign !== undefined) flightState.callsign = callsign;
  if (aircraft !== undefined) flightState.aircraft = aircraft;
  res.json({ status: 200 });
});

app.listen(BRIDGE_PORT, "127.0.0.1", () => {
  console.log(`Pilot Client Bridge listening on 127.0.0.1:${BRIDGE_PORT}`);
});
