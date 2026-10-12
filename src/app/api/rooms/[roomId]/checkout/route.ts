import { NextResponse } from "next/server";
import { calculateOfficialPrice, getMenu } from "@/lib/catalog";
import { apiError, playerToken } from "@/lib/http";
import { prepareCheckout, savePriceCheck } from "@/lib/room-store";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await context.params;
    const token = playerToken(request);
    const { record, items } = await prepareCheckout(roomId, token);
    const currentMenu = await getMenu(record.store);
    const availableCodes = new Set(currentMenu.products.map((product) => product.productId));
    const menuAvailable = items.every((item) => availableCodes.has(item.productId));
    const check = await calculateOfficialPrice(record.store, items);
    check.available = check.available && menuAvailable;
    if (!menuAvailable) {
      check.message = `${check.message} 部分餐品已不在当前可售菜单中。`;
    }
    return NextResponse.json(await savePriceCheck(roomId, token, check));
  } catch (error) {
    return apiError(error);
  }
}
