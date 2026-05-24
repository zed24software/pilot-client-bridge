import net from "node:net";
import Opcodes, { Opcode } from "./types/opcodes";
import { RPCRequest, RPCResponse } from "./types";
import { RPCEvent } from "./types/events";

export class DiscordRPC {
  private socket?: net.Socket;
  private pipe?: string;
  isReady: boolean = false;

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
          this.pipe = pipe;

          // IMPORTANT: attach AFTER socket is valid
          socket.on("data", (buf) => this.handlePacket(buf as Buffer));

          this.isReady = true;
          resolve();
        };

        const onError = () => {
          socket.removeAllListeners();
          socket.destroy();
          tryNext();
        };

        socket.once("connect", onConnect);
        socket.once("error", onError);
      };

      tryNext();
    });
  }

  executeHandshake(client_id: string) {
    const json = JSON.stringify({
      v: 1,
      client_id,
    });

    const body = Buffer.from(json, "utf-8");

    const message = Buffer.alloc(8 + body.length);

    message.writeUInt32LE(Opcodes.HANDSHAKE, 0); // 4 bytes written
    message.writeUInt32LE(body.length, 4); // 8 bytes written
    body.copy(message, 8); // start copying json from 8th byte forward

    console.log("sending handshake:", message);

    this.socket?.write(message);
  }

  sendRequest(cmd: string, args?: any) {
    const payload: RPCRequest = {
      cmd: cmd as any,
      args,
      nonce: crypto.randomUUID(),
    };

    this.send(Opcodes.FRAME, payload);
  }

  private send(op: Opcode, data: any) {
    console.log("sending", op, data);

    const json = Buffer.from(JSON.stringify(data));

    const packet = Buffer.alloc(8 + json.length);
    packet.writeInt32LE(op, 0);
    packet.writeInt32LE(json.length, 4);
    json.copy(packet, 8);

    this.socket?.write(packet);
  }

  private handlePacket(buffer: Buffer) {
    const op = buffer.readInt32LE(0);
    const length = buffer.readInt32LE(4);

    const json = buffer.subarray(8, 8 + length).toString();
    const data = JSON.parse(json) as RPCResponse<{v: number, config: any, evt: string, nonce: string}>;

    console.log("OP:", op, data);

    /* set ready when handshake respons with evt: READY */
    if(op === 1 && data.evt === RPCEvent.READY) {
      this.isReady = true;
    } else {
      throw new Error("Handshake failed");
    }
  }
}