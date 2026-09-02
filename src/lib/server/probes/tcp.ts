import "server-only";
import net from "node:net";
import type { TcpTarget } from "./config";
import type { ProbeOutcome } from "./http";

export function probeTcp(t: TcpTarget): Promise<ProbeOutcome> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (ok: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ok, latencyMs: Date.now() - start, error, kind: "tcp" });
    };
    socket.setTimeout(t.timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false, "timeout"));
    socket.once("error", (e) => done(false, e.message));
    socket.connect(t.port, t.host);
  });
}
