enum Opcodes {
  HANDSHAKE = 0,
  FRAME = 1,
  CLOSE = 2,
  PING = 3,
  PONG = 4
}

export type Opcode = 0 | 1 | 2 | 3 | 4;

export default Opcodes;