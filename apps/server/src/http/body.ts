import type { IncomingMessage } from "node:http";
import { HttpError } from "./security.ts";

export async function readJsonBody(request: IncomingMessage, maxBytes = 16_384): Promise<unknown> {
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json")
    throw new HttpError(415, "VALIDATION", "Send JSON using application/json");
  const length = request.headers["content-length"];
  if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > maxBytes))
    throw new HttpError(413, "VALIDATION", "Request body is too large");
  const chunks: Buffer[] = [];
  let total = 0;
  // Keep the socket alive long enough to send an error when rejecting a chunked body.
  // The HTTP handler marks rejected POST responses Connection: close.
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) throw new HttpError(413, "VALIDATION", "Request body is too large");
    chunks.push(bytes);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "VALIDATION", "Send a valid JSON body");
  }
}
