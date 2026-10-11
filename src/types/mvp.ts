import type { GameState, MenuProduct } from "@/domain/game";

export type CatalogMode = "mcp" | "demo";

export interface StoreOption {
  storeCode: string;
  beCode: string;
  storeName: string;
  address: string;
  distance?: string;
  businessStatus: boolean;
  source: CatalogMode;
}

export interface PriceCheck {
  source: CatalogMode;
  checkedAt: string;
  priceInCents: number;
  originalPriceInCents: number;
  discountInCents: number;
  available: boolean;
  message: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    subtotalInCents: number;
  }>;
}

export interface RoomSnapshot {
  roomId: string;
  store: StoreOption;
  menu: MenuProduct[];
  budgetInCents: number;
  totalInCents: number;
  remainingInCents: number;
  status: GameState["status"];
  expiresAt: string;
  durationSeconds: number;
  players: GameState["players"];
  cart: GameState["cart"];
  events: GameState["events"];
  viewer: GameState["players"][number] | null;
  priceCheck?: PriceCheck;
}
