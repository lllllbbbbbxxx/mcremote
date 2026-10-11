import { NextResponse } from "next/server";
import { apiError, playerToken } from "@/lib/http";
import { getRoom } from "@/lib/room-store";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    return NextResponse.json(getRoom(roomId, playerToken(request)));
  } catch (error) {
    return apiError(error);
  }
}
