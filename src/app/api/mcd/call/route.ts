import { NextResponse } from "next/server";
import { callMcdTool, MCD_READ_TOOLS, type McdReadTool } from "@/lib/mcd-mcp/client";

export const runtime = "nodejs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 32_000) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }
    const body: unknown = await request.json();
    if (!isPlainObject(body) || typeof body.tool !== "string" || !isPlainObject(body.arguments)) {
      return NextResponse.json({ error: "Expected { tool, arguments }" }, { status: 400 });
    }
    if (!MCD_READ_TOOLS.includes(body.tool as McdReadTool)) {
      return NextResponse.json({ error: "Tool is not allowed by this endpoint" }, { status: 403 });
    }
    const result = await callMcdTool(body.tool as McdReadTool, body.arguments);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MCP error";
    const isConfigError = message.includes("MCD_MCP_TOKEN");
    return NextResponse.json(
      { error: isConfigError ? message : "McDonald's MCP request failed" },
      { status: isConfigError ? 503 : 502 },
    );
  }
}
