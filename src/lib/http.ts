import { NextResponse } from "next/server";
import { GameRuleError } from "@/domain/game";

export function apiError(error: unknown) {
  if (error instanceof GameRuleError) {
    const status =
      error.code === "ROOM_NOT_FOUND" ? 404 : error.code === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  const message = error instanceof Error ? error.message : "服务器发生未知错误";
  console.error(error);
  return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
}

export async function readObject(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) throw new GameRuleError("BODY_TOO_LARGE", "请求内容过大");
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new GameRuleError("INVALID_BODY", "请求格式不正确");
  }
  return body as Record<string, unknown>;
}

export function playerToken(request: Request) {
  return request.headers.get("x-player-token");
}
