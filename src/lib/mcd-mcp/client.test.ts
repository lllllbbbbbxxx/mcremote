import { afterEach, describe, expect, it, vi } from "vitest";
import { callMcdTool } from "./client";

const originalToken = process.env.MCD_MCP_TOKEN;
const originalUrl = process.env.MCD_MCP_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken === undefined) delete process.env.MCD_MCP_TOKEN;
  else process.env.MCD_MCP_TOKEN = originalToken;
  if (originalUrl === undefined) delete process.env.MCD_MCP_URL;
  else process.env.MCD_MCP_URL = originalUrl;
});

describe("McDonald's MCP transport", () => {
  it("supports a stateless server that does not issue a session id", async () => {
    process.env.MCD_MCP_TOKEN = "test-token";
    process.env.MCD_MCP_URL = "https://mcp.test";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: { protocolVersion: "2025-06-18", capabilities: {} },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            result: { content: [{ type: "text", text: '{"success":true}' }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callMcdTool("query-nearby-stores", { city: "上海" });

    expect(result.content[0].text).toContain("success");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const thirdHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);
    expect(thirdHeaders.get("Authorization")).toBe("Bearer test-token");
    expect(thirdHeaders.has("Mcp-Session-Id")).toBe(false);
  });

  it("keeps the session id and selects the matching JSON-RPC event from SSE", async () => {
    process.env.MCD_MCP_TOKEN = "test-token";
    process.env.MCD_MCP_URL = "https://mcp.test";
    const initializeSse = [
      'data: {"jsonrpc":"2.0","method":"notifications/message","params":{}}',
      'data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18"}}',
      "",
    ].join("\n");
    const toolSse = [
      'data: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"ok"}]}}',
      'data: {"jsonrpc":"2.0","method":"notifications/message","params":{}}',
      "",
    ].join("\n");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(initializeSse, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Mcp-Session-Id": "session-1" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(
        new Response(toolSse, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callMcdTool("query-meals", { storeCode: "123" });

    expect(result.content[0].text).toBe("ok");
    const notificationHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
    const toolHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);
    expect(notificationHeaders.get("Mcp-Session-Id")).toBe("session-1");
    expect(toolHeaders.get("Mcp-Session-Id")).toBe("session-1");
  });

  it("surfaces a Tool-level error", async () => {
    process.env.MCD_MCP_TOKEN = "test-token";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            result: { isError: true, content: [{ type: "text", text: "invalid store" }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callMcdTool("query-meals", {})).rejects.toThrow("invalid store");
  });
});
