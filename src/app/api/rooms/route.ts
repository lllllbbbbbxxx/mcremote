import { NextResponse } from "next/server";
import { GameRuleError } from "@/domain/game";
import { getMenu } from "@/lib/catalog";
import { apiError, readObject } from "@/lib/http";
import { createRoom } from "@/lib/room-store";
import type { StoreOption } from "@/types/mvp";

function parseStore(value: unknown): StoreOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GameRuleError("INVALID_STORE", "请选择一个门店");
  }
  const store = value as Record<string, unknown>;
  if (
    typeof store.storeCode !== "string" ||
    typeof store.storeName !== "string" ||
    (store.source !== "mcp" && store.source !== "demo")
  ) {
    throw new GameRuleError("INVALID_STORE", "门店数据不完整");
  }
  return {
    storeCode: store.storeCode,
    beCode: typeof store.beCode === "string" ? store.beCode : "",
    storeName: store.storeName,
    address: typeof store.address === "string" ? store.address : "",
    distance: typeof store.distance === "string" ? store.distance : undefined,
    businessStatus: store.businessStatus !== false,
    source: store.source,
  };
}

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const store = parseStore(body.store);
    const { mode, products } = await getMenu(store);
    const normalizedStore = { ...store, source: mode };
    const budgetYuan = Number(body.budgetYuan);
    const result = createRoom({
      hostNickname: typeof body.hostNickname === "string" ? body.hostNickname : "",
      budgetInCents: Math.round(budgetYuan * 100),
      durationSeconds: Number(body.durationSeconds),
      store: normalizedStore,
      menu: products,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
