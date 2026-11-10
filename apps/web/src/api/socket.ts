import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents } from "@roshan/shared";

/** Caller connects only after cookie sign-in; no unauthenticated background sockets. */
export function createRealtimeClient(): Socket<ServerToClientEvents> {
  return io({ autoConnect: false, withCredentials: true, transports: ["websocket", "polling"] });
}
