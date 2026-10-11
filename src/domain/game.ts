export type SpecialCard = "delete" | "swap" | "lock";
export type RoomStatus = "waiting" | "playing" | "finished" | "checkout";

export interface MenuProduct {
  productId: string;
  name: string;
  priceInCents: number;
  source: "mcd-mcp" | "demo";
  category?: string;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  addTokensRemaining: number;
  specialCard: SpecialCard | null;
  specialCardUsed: boolean;
}

export interface CartItem extends MenuProduct {
  id: string;
  addedBy: string;
  lockedBy: string | null;
}

export interface GameEvent {
  id: string;
  playerId: string;
  action: "add" | "delete" | "swap" | "lock";
  productId: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface GameState {
  roomId: string;
  hostId: string;
  storeId: string;
  catalogMode: "mcd-mcp" | "demo";
  budgetInCents: number;
  status: RoomStatus;
  expiresAt: string;
  players: Player[];
  cart: CartItem[];
  events: GameEvent[];
}

export class GameRuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GameRuleError";
  }
}

export const cartTotal = (state: GameState) =>
  state.cart.reduce((total, item) => total + item.priceInCents, 0);

const clone = (state: GameState): GameState => structuredClone(state);

function assertPlaying(state: GameState, now: Date) {
  if (state.status !== "playing") {
    throw new GameRuleError("ROOM_NOT_PLAYING", "房间当前不可操作");
  }
  if (now.getTime() >= new Date(state.expiresAt).getTime()) {
    throw new GameRuleError("ROOM_EXPIRED", "本局倒计时已结束");
  }
}

function requirePlayer(state: GameState, playerId: string) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) throw new GameRuleError("PLAYER_NOT_FOUND", "玩家不在房间中");
  return player;
}

function requireItem(state: GameState, itemId: string) {
  const item = state.cart.find((entry) => entry.id === itemId);
  if (!item) throw new GameRuleError("ITEM_NOT_FOUND", "购物车中没有该餐品");
  return item;
}

function eventId(state: GameState) {
  return `event-${state.events.length + 1}`;
}

function assertCatalogProduct(state: GameState, product: MenuProduct) {
  if (product.source !== state.catalogMode) {
    throw new GameRuleError("UNTRUSTED_PRODUCT", "餐品来源与本局菜单不一致");
  }
  if (!Number.isInteger(product.priceInCents) || product.priceInCents < 0) {
    throw new GameRuleError("INVALID_PRICE", "餐品价格无效");
  }
}

function consumeCard(state: GameState, playerId: string, expected: SpecialCard) {
  const player = requirePlayer(state, playerId);
  if (player.specialCard !== expected) {
    throw new GameRuleError("WRONG_CARD", `玩家没有 ${expected.toUpperCase()} 卡`);
  }
  if (player.specialCardUsed) {
    throw new GameRuleError("CARD_ALREADY_USED", "特殊卡每局只能使用一次");
  }
  player.specialCardUsed = true;
}

export function addItem(
  state: GameState,
  input: { playerId: string; product: MenuProduct; itemId: string; now: Date },
) {
  assertPlaying(state, input.now);
  assertCatalogProduct(state, input.product);
  const next = clone(state);
  const player = requirePlayer(next, input.playerId);
  if (player.addTokensRemaining <= 0) {
    throw new GameRuleError("NO_ADD_TOKENS", "每位朋友最多加购两次");
  }
  if (cartTotal(next) + input.product.priceInCents > next.budgetInCents) {
    throw new GameRuleError("OVER_BUDGET", "本次加购会超过预算");
  }
  player.addTokensRemaining -= 1;
  next.cart.push({ ...input.product, id: input.itemId, addedBy: input.playerId, lockedBy: null });
  next.events.push({
    id: eventId(next),
    playerId: input.playerId,
    action: "add",
    productId: input.product.productId,
    timestamp: input.now.toISOString(),
  });
  return next;
}

export function deleteItem(
  state: GameState,
  input: { playerId: string; itemId: string; now: Date },
) {
  assertPlaying(state, input.now);
  const next = clone(state);
  const item = requireItem(next, input.itemId);
  if (item.lockedBy) throw new GameRuleError("ITEM_LOCKED", "已锁定餐品不能删除");
  consumeCard(next, input.playerId, "delete");
  next.cart = next.cart.filter((entry) => entry.id !== input.itemId);
  next.events.push({
    id: eventId(next),
    playerId: input.playerId,
    action: "delete",
    productId: item.productId,
    timestamp: input.now.toISOString(),
    metadata: { releasedInCents: item.priceInCents },
  });
  return next;
}

export function lockItem(state: GameState, input: { playerId: string; itemId: string; now: Date }) {
  assertPlaying(state, input.now);
  const next = clone(state);
  const item = requireItem(next, input.itemId);
  if (item.lockedBy) throw new GameRuleError("ITEM_LOCKED", "该餐品已经被锁定");
  consumeCard(next, input.playerId, "lock");
  item.lockedBy = input.playerId;
  next.events.push({
    id: eventId(next),
    playerId: input.playerId,
    action: "lock",
    productId: item.productId,
    timestamp: input.now.toISOString(),
  });
  return next;
}

export function swapItem(
  state: GameState,
  input: { playerId: string; itemId: string; replacement: MenuProduct; now: Date },
) {
  assertPlaying(state, input.now);
  assertCatalogProduct(state, input.replacement);
  const next = clone(state);
  const item = requireItem(next, input.itemId);
  if (item.lockedBy) throw new GameRuleError("ITEM_LOCKED", "已锁定餐品不能替换");
  const nextTotal = cartTotal(next) - item.priceInCents + input.replacement.priceInCents;
  if (nextTotal > next.budgetInCents) {
    throw new GameRuleError("OVER_BUDGET", "本次替换会超过预算");
  }
  consumeCard(next, input.playerId, "swap");
  const previousProductId = item.productId;
  Object.assign(item, input.replacement);
  next.events.push({
    id: eventId(next),
    playerId: input.playerId,
    action: "swap",
    productId: input.replacement.productId,
    timestamp: input.now.toISOString(),
    metadata: { previousProductId },
  });
  return next;
}

export function finishGame(state: GameState, now: Date) {
  if (state.status !== "playing") return state;
  if (now.getTime() < new Date(state.expiresAt).getTime()) {
    throw new GameRuleError("TIMER_RUNNING", "倒计时尚未结束");
  }
  return { ...clone(state), status: "finished" as const };
}

export function beginCheckout(state: GameState, playerId: string) {
  if (state.status !== "finished") {
    throw new GameRuleError("GAME_NOT_FINISHED", "只能从结算页进入订单确认");
  }
  if (playerId !== state.hostId) {
    throw new GameRuleError("HOST_ONLY", "最终订单只能由房主确认");
  }
  return { ...clone(state), status: "checkout" as const };
}
