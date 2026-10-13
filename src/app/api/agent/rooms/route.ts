import { NextResponse } from "next/server";
import { GameRuleError, type MenuProduct } from "@/domain/game";
import { apiError, readObject } from "@/lib/http";
import { limitAgentRoomCreation } from "@/lib/rate-limit";
import { createRoom } from "@/lib/room-store";
import type { StoreOption } from "@/types/mvp";

interface RawMeal {
  name?: unknown;
  image?: unknown;
  currentPrice?: unknown;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseStore(value: unknown): StoreOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GameRuleError("INVALID_STORE", "Skill 未提供有效门店");
  }
  const raw = value as Record<string, unknown>;
  const storeCode = text(raw.storeCode, 80);
  const storeName = text(raw.storeName, 120);
  if (!storeCode || !storeName) {
    throw new GameRuleError("INVALID_STORE", "Skill 提供的门店缺少编码或名称");
  }
  return {
    storeCode,
    beCode: text(raw.beCode, 80),
    storeName,
    address: text(raw.address, 240) || "门店地址以麦当劳 MCP 返回为准",
    distance: text(raw.distance, 40) || undefined,
    businessStatus: raw.businessStatus !== false,
    source: "mcp",
  };
}

function trustedImage(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "menu-img.mcd.cn") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function parseNormalizedProducts(value: unknown): MenuProduct[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 300).flatMap<MenuProduct>((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const raw = entry as Record<string, unknown>;
    const productId = text(raw.productId ?? raw.productCode, 100);
    const name = text(raw.name, 160);
    const priceInCents = Number(raw.priceInCents);
    if (!productId || !name || !Number.isInteger(priceInCents) || priceInCents < 0) return [];
    return [
      {
        productId,
        name,
        priceInCents,
        category: text(raw.category, 80) || "其他",
        imageUrl: trustedImage(raw.imageUrl ?? raw.image),
        tags: Array.isArray(raw.tags)
          ? raw.tags
              .flatMap((tag) => (typeof tag === "string" ? [tag.slice(0, 40)] : []))
              .slice(0, 3)
          : undefined,
        source: "mcd-mcp",
      },
    ];
  });
}

function parseRawMcpMenu(value: unknown): MenuProduct[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = value as Record<string, unknown>;
  const categoryByCode = new Map<string, string>();
  const tagsByCode = new Map<string, string[]>();
  if (Array.isArray(raw.categories)) {
    for (const categoryValue of raw.categories) {
      if (!categoryValue || typeof categoryValue !== "object" || Array.isArray(categoryValue))
        continue;
      const category = categoryValue as Record<string, unknown>;
      const categoryName = text(category.name, 80) || "其他";
      if (!Array.isArray(category.meals)) continue;
      for (const mealValue of category.meals) {
        if (!mealValue || typeof mealValue !== "object" || Array.isArray(mealValue)) continue;
        const meal = mealValue as Record<string, unknown>;
        const code = text(meal.code, 100);
        if (!code) continue;
        if (!categoryByCode.has(code)) categoryByCode.set(code, categoryName);
        if (Array.isArray(meal.tags)) {
          tagsByCode.set(
            code,
            meal.tags
              .flatMap((tag) => (typeof tag === "string" ? [tag.slice(0, 40)] : []))
              .slice(0, 3),
          );
        }
      }
    }
  }
  if (!raw.meals || typeof raw.meals !== "object" || Array.isArray(raw.meals)) return [];
  return Object.entries(raw.meals as Record<string, RawMeal>)
    .slice(0, 300)
    .flatMap<MenuProduct>(([productId, meal]) => {
      const name = text(meal.name, 160);
      const yuan = Number(meal.currentPrice);
      if (!productId || !name || !Number.isFinite(yuan) || yuan < 0) return [];
      return [
        {
          productId: productId.slice(0, 100),
          name,
          priceInCents: Math.round(yuan * 100),
          category: categoryByCode.get(productId) || "其他",
          imageUrl: trustedImage(meal.image),
          tags: tagsByCode.get(productId),
          source: "mcd-mcp",
        },
      ];
    });
}

function parseMenu(body: Record<string, unknown>) {
  const normalized = parseNormalizedProducts(body.products);
  if (normalized.length) return normalized;
  const raw = parseRawMcpMenu(body.menu);
  if (raw.length) return raw;
  throw new GameRuleError("EMPTY_MENU", "Skill 未提供可用的麦当劳 MCP 菜单");
}

export async function POST(request: Request) {
  try {
    const limit = await limitAgentRoomCreation(request);
    if (!limit.success) {
      return NextResponse.json(
        { error: "开房过于频繁，请稍后重试", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
            "X-RateLimit-Remaining": String(limit.remaining),
          },
        },
      );
    }
    const body = await readObject(request);
    const result = await createRoom({
      hostNickname: text(body.hostNickname, 20) || "WorkBuddy Host",
      budgetInCents: Math.round(Number(body.budgetYuan) * 100),
      durationSeconds: Number(body.durationSeconds),
      store: parseStore(body.store),
      menu: parseMenu(body),
    });
    const origin = new URL(request.url).origin;
    const roomId = result.snapshot.roomId;
    return NextResponse.json(
      {
        roomId,
        hostToken: result.token,
        status: result.snapshot.status,
        menuItems: result.snapshot.menu.length,
        shareUrl: `${origin}/room/${roomId}`,
        shareImageUrl: `${origin}/api/rooms/${roomId}/cards/share`,
        resultImageUrl: `${origin}/api/rooms/${roomId}/cards/result`,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
