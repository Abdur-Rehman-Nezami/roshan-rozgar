import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { IdSchema, rooms } from "@roshan/shared";
import type { ServerToClientEvents } from "@roshan/shared";
import type { ServerConfig } from "../config.ts";
import type { SessionUser } from "../auth/session.ts";
import { isAllowedOrigin } from "../http/security.ts";
import type { createSocketAuthorization } from "./authorization.ts";

type Ack = (result: { ok: boolean }) => void;
interface ClientEvents {
  "thread:subscribe": (id: string, ack: Ack) => void;
  "thread:unsubscribe": (id: string, ack: Ack) => void;
  "search:subscribe": (city: string, ack: Ack) => void;
  "search:unsubscribe": (city: string, ack: Ack) => void;
}
interface SocketData {
  user: SessionUser;
  expiresAt: number;
}
const CitySchema = z.enum(["islamabad", "rawalpindi"]);

/** Single-process rooms for now; Redis adapter integration remains an F-05 gate. */
export function attachSockets(
  http: HttpServer,
  config: Pick<ServerConfig, "PUBLIC_URL">,
  authorization: ReturnType<typeof createSocketAuthorization>,
) {
  const io = new Server<ClientEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    http,
    {
      serveClient: false,
      maxHttpBufferSize: 16_384,
      allowRequest(request, callback) {
        const fetchSite = request.headers["sec-fetch-site"];
        callback(
          null,
          isAllowedOrigin(
            request.headers.origin,
            typeof fetchSite === "string" ? fetchSite : undefined,
            config.PUBLIC_URL,
          ),
        );
      },
    },
  );
  io.use((socket, next) => {
    void authorization.authenticate(socket.request.headers.cookie).then(
      ({ user, expiresAt }) => {
        socket.data = { user, expiresAt };
        next();
      },
      () => next(new Error("Sign in to continue")),
    );
  });
  io.on("connection", (socket) => {
    const { user, expiresAt } = socket.data;
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, expiresAt - Date.now()));
    expiry.unref();
    socket.once("disconnect", () => clearTimeout(expiry));
    void Promise.resolve(socket.join(rooms.user(user.userId))).catch(() => socket.disconnect(true));
    // Serialize room changes so concurrent joins cannot bypass the subscription cap.
    let pending = Promise.resolve();
    let queued = 0;
    let windowStart = Date.now();
    let actions = 0;
    const run = (ack: Ack, action: () => Promise<boolean>) => {
      if (typeof ack !== "function") return;
      if (Date.now() - windowStart >= 10_000) {
        windowStart = Date.now();
        actions = 0;
      }
      if (++actions > 60 || queued >= 20) {
        ack({ ok: false });
        return;
      }
      queued += 1;
      pending = pending.then(async () => {
        let ok = false;
        try {
          if (socket.connected && Date.now() < expiresAt) ok = await action();
        } catch {
          // Membership queries/adapter failures must never leak driver details.
        }
        queued -= 1;
        try {
          ack({ ok });
        } catch {
          socket.disconnect(true);
        }
      });
    };
    socket.on("thread:subscribe", (id, ack) => {
      run(ack, async () => {
        if (!(await authorization.canJoinThread(user, id))) return false;
        const room = rooms.thread(id);
        if (!socket.rooms.has(room) && socket.rooms.size >= 22) return false;
        if (!socket.connected || Date.now() >= expiresAt) return false;
        await socket.join(room);
        return true;
      });
    });
    socket.on("thread:unsubscribe", (id, ack) => {
      run(ack, async () => {
        if (!IdSchema.safeParse(id).success) return false;
        await socket.leave(rooms.thread(id));
        return true;
      });
    });
    socket.on("search:subscribe", (city, ack) => {
      run(ack, async () => {
        if (user.role !== "customer" || !CitySchema.safeParse(city).success) return false;
        await socket.join(rooms.search(city));
        return true;
      });
    });
    socket.on("search:unsubscribe", (city, ack) => {
      run(ack, async () => {
        if (!CitySchema.safeParse(city).success) return false;
        await socket.leave(rooms.search(city));
        return true;
      });
    });
  });
  return io;
}
