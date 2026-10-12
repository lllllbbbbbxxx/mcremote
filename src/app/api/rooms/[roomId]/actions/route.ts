import { NextResponse } from "next/server";
import { GameRuleError } from "@/domain/game";
import { apiError, playerToken, readObject } from "@/lib/http";
import { roomAction } from "@/lib/room-store";

type RoomAction =
  | { type: "start" }
  | { type: "add"; productId: string }
  | { type: "delete"; itemId: string }
  | { type: "lock"; itemId: string }
  | { type: "swap"; itemId: string; productId: string };

function parseAction(body: Record<string, unknown>): RoomAction {
  if (body.type === "start") return { type: "start" };
  if (body.type === "add" && typeof body.productId === "string") {
    return { type: "add", productId: body.productId };
  }
  if ((body.type === "delete" || body.type === "lock") && typeof body.itemId === "string") {
    return { type: body.type, itemId: body.itemId };
  }
  if (
    body.type === "swap" &&
    typeof body.itemId === "string" &&
    typeof body.productId === "string"
  ) {
    return { type: "swap", itemId: body.itemId, productId: body.productId };
  }
  throw new GameRuleError("INVALID_ACTION", "游戏操作格式不正确");
}

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const action = parseAction(await readObject(request));
    return NextResponse.json(await roomAction(roomId, playerToken(request), action));
  } catch (error) {
    return apiError(error);
  }
}
