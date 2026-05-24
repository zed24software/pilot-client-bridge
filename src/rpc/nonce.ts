import { randomUUID } from "node:crypto";

export default function generateNonce() {
  return randomUUID();
}