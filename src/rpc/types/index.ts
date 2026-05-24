import { Opcode } from "./opcodes";
import { RPCCommand } from "./commands";
import { RPCEvent } from "./events";

/**
 * Raw IPC frame (what is actually sent over the pipe)
 */
export interface IPCFrame {
  op: Opcode;
  data: unknown;
}

export interface Handshake {
  v: 1;
  client_id: string;
}

export interface RPCRequest<TArgs = any> {
  cmd: RPCCommand;
  nonce?: string;
  args?: TArgs;
}

export interface RPCResponse<TData = any> {
  cmd: RPCCommand;
  evt?: RPCEvent;
  data?: TData;
  nonce?: string;
}

export interface RPCDispatch<T = any> {
  cmd: "DISPATCH";
  evt: RPCEvent;
  data: T;
}

export type RPCPacket =
  | RPCRequest
  | RPCResponse
  | RPCDispatch;