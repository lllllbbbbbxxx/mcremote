import "server-only";

import type { MenuProduct } from "@/domain/game";
import { callMcdTool, type McpToolResult } from "@/lib/mcd-mcp/client";
import type { CatalogMode, PriceCheck, StoreOption } from "@/types/mvp";

interface McdEnvelope<T> {
  success?: boolean;
  code?: number;
  message?: string;
  data?: T;
}

interface McdStore {
  storeCode?: string;
  beCode?: string;
  storeName?: string;
  address?: string;
  distance?: string;
  businessStatus?: boolean;
}

interface McdMeal {
  name?: string;
  currentPrice?: string | number;
}

interface McdMenuData {
  categories?: Array<{ name?: string; meals?: Array<{ code?: string }> }>;
  meals?: Record<string, McdMeal>;
}

interface McdPriceData {
  productOriginalPrice?: number;
  productPrice?: number;
  originalPrice?: number;
  discount?: number;
  price?: number;
  takeWayList?: unknown[];
  productList?: Array<{
    productCode?: string;
    productName?: string;
    quantity?: number;
    originalSubtotal?: number;
    subtotal?: number;
  }>;
}

const demoStores: StoreOption[] = [
  {
    storeCode: "DEMO-SH-001",
    beCode: "DEMO",
    storeName: "上海人民广场演示门店",
    address: "演示数据 · 配置 MCD_MCP_TOKEN 后显示真实门店",
    distance: "Demo",
    businessStatus: true,
    source: "demo",
  },
  {
    storeCode: "DEMO-BJ-001",
    beCode: "DEMO",
    storeName: "北京国贸演示门店",
    address: "演示数据 · 配置 MCD_MCP_TOKEN 后显示真实门店",
    distance: "Demo",
    businessStatus: true,
    source: "demo",
  },
];

const demoProducts: MenuProduct[] = [
  ["demo-01", "经典牛肉汉堡", 1450, "汉堡"],
  ["demo-02", "双层牛肉汉堡", 2450, "汉堡"],
  ["demo-03", "香脆鸡腿堡", 2200, "汉堡"],
  ["demo-04", "麦香鱼风味汉堡", 2100, "汉堡"],
  ["demo-05", "薯条（中）", 1350, "小食"],
  ["demo-06", "麦乐鸡风味小食（5块）", 1550, "小食"],
  ["demo-07", "玉米杯", 1200, "小食"],
  ["demo-08", "香芋派", 950, "甜品"],
  ["demo-09", "圆筒冰淇淋", 650, "甜品"],
  ["demo-10", "奥利奥风味冰旋", 1450, "甜品"],
  ["demo-11", "可乐（中）", 1100, "饮品"],
  ["demo-12", "无糖可乐（中）", 1100, "饮品"],
].map(([productId, name, priceInCents, category]) => ({
  productId: String(productId),
  name: String(name),
  priceInCents: Number(priceInCents),
  category: String(category),
  source: "demo" as const,
}));

export function catalogMode(): CatalogMode {
  return process.env.MCD_MCP_TOKEN?.trim() ? "mcp" : "demo";
}

export function extractToolPayload<T>(result: McpToolResult): McdEnvelope<T> {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent as McdEnvelope<T>;
  }
  for (const block of result.content) {
    if (block.type !== "text" || typeof block.text !== "string") continue;
    try {
      const parsed = JSON.parse(block.text) as McdEnvelope<T>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Ignore explanatory text blocks and continue looking for the JSON payload.
    }
  }
  throw new Error("麦当劳 MCP 未返回可解析的 JSON 数据");
}

function assertSuccessful<T>(payload: McdEnvelope<T>) {
  if (payload.success === false || (payload.code && payload.code >= 400)) {
    throw new Error(payload.message || `麦当劳 MCP 返回错误 ${payload.code}`);
  }
  if (payload.data === undefined) throw new Error("麦当劳 MCP 响应缺少 data");
  return payload.data;
}

export async function searchStores(city: string, keyword: string) {
  if (catalogMode() === "demo") {
    const needle = `${city}${keyword}`.toLowerCase();
    const matched = demoStores.filter((store) =>
      `${store.storeName}${store.address}`.toLowerCase().includes(needle),
    );
    return { mode: "demo" as const, stores: matched.length ? matched : demoStores };
  }

  const result = await callMcdTool("query-nearby-stores", {
    searchType: 2,
    beType: 1,
    city,
    keyword,
  });
  const rows = assertSuccessful(extractToolPayload<McdStore[]>(result));
  const stores = rows.flatMap<StoreOption>((store) => {
    if (!store.storeCode || !store.storeName || store.businessStatus === false) return [];
    return [
      {
        storeCode: store.storeCode,
        beCode: store.beCode || "",
        storeName: store.storeName,
        address: store.address || "地址以麦当劳 MCP 返回为准",
        distance: store.distance,
        businessStatus: true,
        source: "mcp",
      },
    ];
  });
  return { mode: "mcp" as const, stores };
}

export async function getMenu(store: StoreOption) {
  const activeMode = catalogMode();
  if (activeMode === "demo") {
    return { mode: "demo" as const, products: demoProducts };
  }
  if (store.source !== "mcp") {
    throw new Error("MCP 实时模式不接受 Demo 门店，请重新查询门店");
  }
  const result = await callMcdTool("query-meals", {
    storeCode: store.storeCode,
    beCode: store.beCode,
    orderType: 1,
    beType: 1,
  });
  const data = assertSuccessful(extractToolPayload<McdMenuData>(result));
  const categoryByCode = new Map<string, string>();
  for (const category of data.categories ?? []) {
    for (const meal of category.meals ?? []) {
      if (meal.code) categoryByCode.set(meal.code, category.name || "其他");
    }
  }
  const products = Object.entries(data.meals ?? {})
    .map<MenuProduct | null>(([productId, meal]) => {
      const price = Number(meal.currentPrice);
      if (!meal.name || !Number.isFinite(price) || price < 0) return null;
      return {
        productId,
        name: meal.name,
        priceInCents: Math.round(price * 100),
        category: categoryByCode.get(productId) || "其他",
        source: "mcd-mcp",
      };
    })
    .filter((product): product is MenuProduct => product !== null);
  if (!products.length) throw new Error("该门店当前没有可用餐品");
  return { mode: "mcp" as const, products };
}

export async function calculateOfficialPrice(
  store: StoreOption,
  items: Array<{ productId: string; quantity: number; name: string; priceInCents: number }>,
): Promise<PriceCheck> {
  if (catalogMode() === "demo") {
    const priceInCents = items.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
    return {
      source: "demo",
      checkedAt: new Date().toISOString(),
      priceInCents,
      originalPriceInCents: priceInCents,
      discountInCents: 0,
      available: true,
      message: "Demo 核价完成；配置 MCD_MCP_TOKEN 后将调用 calculate-price。",
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        subtotalInCents: item.priceInCents * item.quantity,
      })),
    };
  }

  const result = await callMcdTool("calculate-price", {
    storeCode: store.storeCode,
    beCode: store.beCode,
    orderType: 1,
    beType: 1,
    items: items.map((item) => ({ productCode: item.productId, quantity: item.quantity })),
  });
  const data = assertSuccessful(extractToolPayload<McdPriceData>(result));
  const returnedItems = data.productList ?? [];
  const returnedCodes = new Set(returnedItems.map((item) => item.productCode));
  return {
    source: "mcp",
    checkedAt: new Date().toISOString(),
    priceInCents: data.price ?? data.productPrice ?? 0,
    originalPriceInCents: data.originalPrice ?? data.productOriginalPrice ?? 0,
    discountInCents: data.discount ?? 0,
    available: items.every((item) => returnedCodes.has(item.productId)),
    message: "已通过麦当劳 MCP calculate-price 实时核价。",
    items: returnedItems.map((item) => ({
      productId: item.productCode || "unknown",
      name: item.productName || "餐品",
      quantity: item.quantity ?? 1,
      subtotalInCents: item.subtotal ?? item.originalSubtotal ?? 0,
    })),
  };
}
