import { API_CONTRACT, ErrorEnvelopeSchema } from "@roshan/shared";
import type { ApiName, ApiRequest, ApiResponse, ErrorCode } from "@roshan/shared";
import { browserDemoEnabled, DemoFailure, getBrowserDemo } from "../demo/store.ts";

export class ApiError extends Error {
  readonly code: ErrorCode | "NETWORK" | "BAD_RESPONSE";
  readonly retryable: boolean;
  readonly status: number;
  constructor(code: ApiError["code"], message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
interface RequestOptions<N extends ApiName> {
  params?: Record<string, string>;
  body?: ApiRequest<N>;
  query?: Record<string, string | number>;
  signal?: AbortSignal;
  demoKey?: string;
}
export class ApiClient {
  private readonly fetcher: typeof fetch;
  private readonly origin: string;
  constructor(origin: string, fetcher: typeof fetch = fetch) {
    this.origin = origin;
    this.fetcher = fetcher;
  }
  async request<N extends ApiName>(
    name: N,
    options: RequestOptions<N> = {},
  ): Promise<ApiResponse<N>> {
    const contract = API_CONTRACT[name];
    if (!("response" in contract) || "upload" in contract)
      throw new Error("Use the audio upload/playback client for this operation");
    if (browserDemoEnabled()) {
      options.signal?.throwIfAborted();
      const demo = getBrowserDemo();
      const body = "body" in contract ? contract.body.parse(options.body ?? {}) : undefined;
      try {
        const payload: unknown =
          name === "me"
            ? demo.me()
            : name === "otpStart"
              ? demo.start(body)
              : name === "otpVerify"
                ? demo.verify(body)
                : name === "mvpState"
                  ? demo.state(options.query?.requestId?.toString())
                  : name === "mvpCommand"
                    ? demo.command(body)
                    : undefined;
        if (payload === undefined)
          throw new ApiError(
            "AI_UNAVAILABLE",
            "This operation is unavailable in browser DEMO",
            503,
            false,
          );
        const parsed = contract.response.safeParse(payload);
        if (!parsed.success)
          throw new ApiError("BAD_RESPONSE", "Invalid browser demo response", 500, false);
        return parsed.data as ApiResponse<N>;
      } catch (error) {
        if (error instanceof DemoFailure)
          throw new ApiError(error.code as ErrorCode, error.message, error.status, false);
        throw error;
      }
    }
    const path = contract.path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
      const value = options.params?.[key];
      if (!value || value === "." || value === "..")
        throw new Error(`Invalid route parameter: ${key}`);
      return encodeURIComponent(value);
    });
    const url = new URL(path, this.origin);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.demoKey) headers["x-demo-key"] = options.demoKey;
    const init: RequestInit = { method: contract.method, credentials: "same-origin", headers };
    if (options.signal) init.signal = options.signal;
    if ("body" in contract) {
      init.body = JSON.stringify(contract.body.parse(options.body ?? {}));
      headers["Content-Type"] = "application/json";
    }
    if (options.query) {
      const query = options.query;
      for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    }
    let response: Response;
    try {
      response = await this.fetcher(url, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ApiError("NETWORK", "Unable to reach the server", 0, true);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    if (!response.ok) {
      const parsed = ErrorEnvelopeSchema.safeParse(payload);
      throw new ApiError(
        parsed.success ? parsed.data.error.code : "INTERNAL",
        parsed.success ? parsed.data.error.message : "Request failed",
        response.status,
        parsed.success ? parsed.data.error.retryable : response.status >= 500,
      );
    }
    const parsed = contract.response.safeParse(payload);
    if (!parsed.success)
      throw new ApiError(
        "BAD_RESPONSE",
        "The server returned an invalid response",
        response.status,
        false,
      );
    return parsed.data as ApiResponse<N>;
  }
}
