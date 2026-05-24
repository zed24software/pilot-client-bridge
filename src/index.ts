import express, { type Request, type Response } from "express"
import { DiscordRPC } from "./rpc";
import { client_id } from "./rpc-config.json";

const app = express();
const BRIDGE_PORT = 57330;
const SERVER_VERSION = "1.0.0";

const discordRpc = new DiscordRPC();
discordRpc.connect().then(_ => {
  console.log("Discord RPC connected, sending handshake");
  discordRpc.executeHandshake(client_id);
});

const timeStarted = Date.now();
app.get("/", (req: Request, res: Response) => {
  res.json({
    "status": 200,
    "message": "API online",
    "v": SERVER_VERSION,
    "timeOnlineSeconds": Math.floor((Date.now() - timeStarted) / 1000)
  });
});

app.listen(BRIDGE_PORT, (err) => {
  if (err) {
    throw err;
  }
  console.log(`Pilot Client Bridge server listening on ${BRIDGE_PORT}`);
});