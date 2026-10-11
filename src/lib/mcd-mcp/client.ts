const DEFAULT_ENDPOINT = "https://mcp.mcd.cn";
const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id?: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

export const MCD_READ_TOOLS = [
  "query-nearby-stores",
  "query-meals",
  "query-meal-detail",
  "calculate-price",
] as const;

export type McdReadTool = (typeof MCD_READ_TOOLS)[number];

function getConfig() {
  const token = process.env.MCD_MCP_TOKEN?.trim();
  if (!token) throw new Error("MCD_MCP_TOKEN is not configured on the server");
  return {
    token,
    endpoint: process.env.MCD_MCP_URL?.trim() || DEFAULT_ENDPOINT,
  };
}

function parseEventStream(body: string) {
  const payloads = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");
  const lastPayload = payloads.at(-1);
  if (!lastPayload) throw new Error("MCP server returned an empty event stream");
  return JSON.parse(lastPayload) as JsonRpcResponse<unknown>;
}

async function readRpcResponse(response: Response) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`MCP request failed (${response.status}): ${body.slice(0, 240)}`);
  }
  if (!body) return null;
  const contentType = response.headers.get("content-type") ?? "";
  const rpc = contentType.includes("text/event-stream")
    ? parseEventStream(body)
    : (JSON.parse(body) as JsonRpcResponse<unknown>);
  if (rpc.error) throw new Error(`MCP error ${rpc.error.code}: ${rpc.error.message}`);
  return rpc;
}

async function postRpc(
  endpoint: string,
  token: string,
  payload: Record<string, unknown>,
  sessionId?: string,
) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const rpc = await readRpcResponse(response);
  return { rpc, sessionId: response.headers.get("Mcp-Session-Id") ?? sessionId };
}

export async function callMcdTool(name: McdReadTool, args: Record<string, unknown>) {
  const { token, endpoint } = getConfig();
  const initialized = await postRpc(endpoint, token, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "mcremote", version: "0.2.0" },
    },
  });
  if (!initialized.sessionId) throw new Error("MCP server did not issue a session id");

  await postRpc(
    endpoint,
    token,
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    initialized.sessionId,
  );

  const called = await postRpc(
    endpoint,
    token,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: args },
    },
    initialized.sessionId,
  );

  const result = called.rpc?.result as McpToolResult | undefined;
  if (!result) throw new Error("MCP tool returned no result");
  return result;
}
