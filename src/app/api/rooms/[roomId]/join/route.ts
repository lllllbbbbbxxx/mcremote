import { NextResponse } from "next/server";
import { apiError, readObject } from "@/lib/http";
import { joinRoom } from "@/lib/room-store";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const body = await readObject(request);
    const nickname = typeof body.nickname === "string" ? body.nickname : "";
    return NextResponse.json(joinRoom(roomId, nickname), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
