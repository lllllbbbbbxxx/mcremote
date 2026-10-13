import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let agentRoomLimiter: Ratelimit | null | undefined;

function getAgentRoomLimiter() {
  if (agentRoomLimiter !== undefined) return agentRoomLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  agentRoomLimiter =
    url && token
      ? new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(12, "1 h"),
          prefix: "mcremote:ratelimit:agent-room",
        })
      : null;
  return agentRoomLimiter;
}

function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local-development";
}

export async function limitAgentRoomCreation(request: Request) {
  const limiter = getAgentRoomLimiter();
  if (!limiter) return { success: true, remaining: 12, reset: 0 };
  return limiter.limit(requestIp(request));
}
