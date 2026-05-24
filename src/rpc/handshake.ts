import ipc from "node-ipc"

export default function sendHandshake() {
  ipc.of.discord.emit()

  const payloadCommand: RpcPayload<any, {v: number, client_id: string}> = {

  }
}