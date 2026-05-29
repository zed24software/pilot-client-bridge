import express from "express";

const LOCAL_AUTH_PORT = 57331;

export const REDIRECT_URI = `http://localhost:${LOCAL_AUTH_PORT}/callback`;

let pendingResolve: ((code: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

export function waitForCode(timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      pendingResolve = null;
      pendingReject = null;
      reject(new Error("OAuth timeout"));
    }, timeoutMs);

    pendingResolve = (code: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pendingResolve = null;
      pendingReject = null;
      resolve(code);
    };

    pendingReject = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pendingResolve = null;
      pendingReject = null;
      reject(err);
    };
  });
}

const authApp = express();

authApp.get("/callback", (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    res.send("<html><body><h2>Authorization denied. You can close this tab.</h2></body></html>");
    pendingReject?.(new Error(`OAuth denied: ${error}`));
    return;
  }

  if (code && pendingResolve) {
    res.send("<html><body><h2>Authorized! You can close this tab.</h2></body></html>");
    pendingResolve(code);
  } else {
    res.status(400).send("No authorization code received.");
  }
});

authApp.listen(LOCAL_AUTH_PORT, "127.0.0.1", () => {
  console.log(`[AuthServer] Listening on 127.0.0.1:${LOCAL_AUTH_PORT}`);
});
