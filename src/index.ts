import express, { type Request, type Response } from "express"

const app = express();
const BRIDGE_PORT = 57330;
const SERVER_VERSION = "1.0.0";

const timeStarted = Date.now();

app.get("/", (req: Request, res: Response) => {
  res.json({
    "status": 200,
    "message": "API online",
    "v": SERVER_VERSION,
    "timeOnlineSeconds": (Date.now() - timeStarted) / 1000
  });
});

app.listen(BRIDGE_PORT, (err) => {
  if (err) {
    throw err;
  }
});