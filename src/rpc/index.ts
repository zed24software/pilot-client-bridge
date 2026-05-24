import net from "node:net";
import Opcodes, { Opcode } from "./types/opcodes";
import { RPCRequest, RPCResponse } from "./types";
import { RPCEvent } from "./types/events";
import { RPCCommand } from "./types/commands";
import { readCachedToken, exchangeCode } from "../token-cache";

const RPC_SCOPES = ["rpc", "rpc.activities.write", "rpc.voice.read", "identify"];

export class DiscordRPC {
  private socket?: net.Socket;
  private recvBuf: Buffer = Buffer.alloc(0);
  isReady: boolean = false;
  isAuthenticated: boolean = false;

  currentUser: any = null;
  voiceConnectionStatus: any = null;

  onAuthenticated?: () => void;

  private pending = new Map<string, { resolve: (data: any) => void; reject: (err: Error) => void }>();

  constructor(private readonly clientId: string, private readonly authServer: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let index = 0;
      let done = false;

      const tryNext = () => {
        if (index > 9) {
          if (!done) reject(new Error("No Discord IPC pipe found"));
          return;
        }

        const pipe = `\\\\?\\pipe\\discord-ipc-${index++}`;
        const socket = net.connect(pipe);

        const onConnect = () => {
          if (done) return;
          done = true;
          socket.removeListener("error", onError);
          this.socket = socket;
          socket.on("data", (buf) => this.handleData(buf as Buffer));
          resolve();
        };

        const onError = () => {
          socket.removeAllListeners();
          socket.destroy();
          if(done) {
            /* already had a working connection at some point */
            index = 0;
            done = false;
          }
          tryNext();
        };

        socket.once("connect", onConnect);
        socket.once("error", onError);
      };

      tryNext();
    });
  }

  sendHandshake() {
    const json = JSON.stringify({ v: 1, client_id: this.clientId });
    const body = Buffer.from(json, "utf-8");
    const message = Buffer.alloc(8 + body.length);
    message.writeUInt32LE(Opcodes.HANDSHAKE, 0);
    message.writeUInt32LE(body.length, 4);
    body.copy(message, 8);
    console.log("[RPC] sending handshake");
    this.socket?.write(message);
  }

  sendRequest(cmd: RPCCommand, args?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      const payload: RPCRequest = { cmd, args, nonce };
      this.pending.set(nonce, { resolve, reject });
      this.send(Opcodes.FRAME, payload);
    });
  }

  subscribe(evt: RPCEvent, args?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      const payload: RPCRequest = { cmd: RPCCommand.SUBSCRIBE, evt, args, nonce };
      this.pending.set(nonce, { resolve, reject });
      this.send(Opcodes.FRAME, payload);
    });
  }

  private async onReady(userData: any) {
    this.isReady = true;
    if (userData) this.currentUser = userData;
    console.log("[RPC] READY — starting auth");

    try {
      await this.authenticate();
      console.log("[RPC] authenticated");
      await this.subscribeToEvents();
    } catch (err: any) {
      console.error("[RPC] auth failed:", err.message);
    }
  }

  private async authenticate() {
    const cached = readCachedToken();
    if (cached) {
      console.log("[RPC] using cached token");
      const authRes = await this.sendRequest(RPCCommand.AUTHENTICATE, { access_token: cached });
      if (authRes.data?.user) this.currentUser = authRes.data.user;
      this.isAuthenticated = true;
      this.onAuthenticated?.();
      return;
    }

    console.log("[RPC] no cached token — running AUTHORIZE");
    const authorizeRes = await this.sendRequest(RPCCommand.AUTHORIZE, {
      client_id: this.clientId,
      scopes: RPC_SCOPES,
    });
    const code: string = authorizeRes.data.code;

    const access_token = await exchangeCode(this.authServer, code);

    const authRes = await this.sendRequest(RPCCommand.AUTHENTICATE, { access_token });
    if (authRes.data?.user) this.currentUser = authRes.data.user;
    this.isAuthenticated = true;
    this.onAuthenticated?.();
  }

  private async subscribeToEvents() {
    await this.subscribe(RPCEvent.VOICE_CONNECTION_STATUS).catch((err: Error) =>
      console.warn(`[RPC] VOICE_CONNECTION_STATUS subscribe failed: ${err.message}`)
    );
    await this.subscribe(RPCEvent.CURRENT_USER_UPDATE).catch((err: Error) =>
      console.warn(`[RPC] CURRENT_USER_UPDATE subscribe failed: ${err.message}`)
    );
  }

  private send(op: Opcode, data: any) {
    const json = Buffer.from(JSON.stringify(data));
    const packet = Buffer.alloc(8 + json.length);
    packet.writeInt32LE(op, 0);
    packet.writeInt32LE(json.length, 4);
    json.copy(packet, 8);
    this.socket?.write(packet);
  }

  private handleData(chunk: Buffer) {
    this.recvBuf = Buffer.concat([this.recvBuf, chunk]);
    while (this.recvBuf.length >= 8) {
      const length = this.recvBuf.readUInt32LE(4);
      if (this.recvBuf.length < 8 + length) break;
      const op = this.recvBuf.readUInt32LE(0);
      const json = this.recvBuf.subarray(8, 8 + length).toString();
      this.recvBuf = this.recvBuf.subarray(8 + length);
      try {
        this.handlePacket(op, JSON.parse(json) as RPCResponse<any>);
      } catch (err) {
        console.error("[RPC] packet parse error:", err);
      }
    }
  }

  private handlePacket(op: number, data: RPCResponse<any>) {
    if (op === 1 && data.evt === RPCEvent.READY) {
      this.onReady(data.data?.user).catch(console.error);
      return;
    }

    if (data.cmd === RPCCommand.DISPATCH) {
      if (data.evt === RPCEvent.VOICE_CONNECTION_STATUS) {
        this.voiceConnectionStatus = data.data;
      } else if (data.evt === RPCEvent.CURRENT_USER_UPDATE) {
        this.currentUser = data.data;
      }
      return;
    }

    if (data.nonce) {
      const pending = this.pending.get(data.nonce);
      if (pending) {
        this.pending.delete(data.nonce);
        if (data.evt === RPCEvent.ERROR) {
          pending.reject(new Error(JSON.stringify(data.data)));
        } else {
          pending.resolve(data);
        }
      }
    }
  }
}
