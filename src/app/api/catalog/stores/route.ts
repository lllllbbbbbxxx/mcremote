import { NextResponse } from "next/server";
import { GameRuleError } from "@/domain/game";
import { searchStores } from "@/lib/catalog";
import { apiError, readObject } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 30) : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 60) : "";
    if (!city || !keyword) throw new GameRuleError("MISSING_LOCATION", "请输入城市和位置关键词");
    return NextResponse.json(await searchStores(city, keyword));
  } catch (error) {
    return apiError(error);
  }
}
