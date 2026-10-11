import { NextResponse } from "next/server";
import { catalogMode } from "@/lib/catalog";

export async function GET() {
  const mode = catalogMode();
  return NextResponse.json({
    mode,
    message:
      mode === "mcp"
        ? "麦当劳 MCP 已配置，门店、菜单与核价均使用实时数据。"
        : "当前为 Demo 模式。配置服务端 MCD_MCP_TOKEN 后自动切换到真实麦当劳 MCP。",
  });
}
