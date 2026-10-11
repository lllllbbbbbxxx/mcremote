import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import {
  addItem,
  beginCheckout,
  cartTotal,
  deleteItem,
  finishGame,
  GameRuleError,
  type GameState,
  lockItem,
  type MenuProduct,
  type SpecialCard,
  swapItem,
} from "@/domain/game";
import type { PriceCheck, RoomSnapshot, StoreOption } from "@/types/mvp";

interface RoomRecord {
  game: GameState;
  store: StoreOption;
  menu: MenuProduct[];
  durationSeconds: number;
  createdAt: string;
  playerTokens: Map<string, string>;
  priceCheck?: PriceCheck;
}

declare global {
  var __mcremoteRooms: Map<string, RoomRecord> | undefined;
}

const rooms = globalThis.__mcremoteRooms ?? new Map<string, RoomRecord>();
globalThis.__mcremoteRooms = rooms;

const cards: SpecialCard[] = ["delete", "swap", "lock"];

function roomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function playerToken() {
  return randomBytes(24).toString("base64url");
}

function nickname(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!cleaned) throw new GameRuleError("INVALID_NICKNAME", "请输入昵称");
  return cleaned;
}

function getRecord(id: string) {
  const record = rooms.get(id.toUpperCase());
  if (!record) throw new GameRuleError("ROOM_NOT_FOUND", "房间不存在或服务已重启");
  if (record.game.status === "playing" && Date.now() >= new Date(record.game.expiresAt).getTime()) {
    record.game = finishGame(record.game, new Date());
  }
  return record;
}

function viewerId(record: RoomRecord, token: string | null) {
  if (!token) return null;
  for (const [playerId, storedToken] of record.playerTokens) {
    if (storedToken === token) return playerId;
  }
  return null;
}

function publicSnapshot(record: RoomRecord, token: string | null): RoomSnapshot {
  const id = viewerId(record, token);
  const total = cartTotal(record.game);
  return {
    roomId: record.game.roomId,
    store: record.store,
    menu: record.menu,
    budgetInCents: record.game.budgetInCents,
    totalInCents: total,
    remainingInCents: record.game.budgetInCents - total,
    status: record.game.status,
    expiresAt: record.game.expiresAt,
    durationSeconds: record.durationSeconds,
    players: record.game.players,
    cart: record.game.cart,
    events: record.game.events,
    viewer: id ? (record.game.players.find((player) => player.id === id) ?? null) : null,
    priceCheck: record.priceCheck,
  };
}

export function createRoom(input: {
  hostNickname: string;
  budgetInCents: number;
  durationSeconds: number;
  store: StoreOption;
  menu: MenuProduct[];
}) {
  if (
    !Number.isInteger(input.budgetInCents) ||
    input.budgetInCents < 1000 ||
    input.budgetInCents > 100_000
  ) {
    throw new GameRuleError("INVALID_BUDGET", "预算须在 ¥10–¥1000 之间");
  }
  if (![60, 90, 120].includes(input.durationSeconds)) {
    throw new GameRuleError("INVALID_DURATION", "游戏时长仅支持 60 / 90 / 120 秒");
  }
  if (!input.menu.length) throw new GameRuleError("EMPTY_MENU", "门店菜单为空");
  const id = roomId();
  const hostId = randomUUID();
  const token = playerToken();
  const record: RoomRecord = {
    game: {
      roomId: id,
      hostId,
      storeId: input.store.storeCode,
      catalogMode: input.store.source === "mcp" ? "mcd-mcp" : "demo",
      budgetInCents: input.budgetInCents,
      status: "waiting",
      expiresAt: new Date(Date.now() + input.durationSeconds * 1000).toISOString(),
      players: [
        {
          id: hostId,
          nickname: nickname(input.hostNickname),
          isHost: true,
          addTokensRemaining: 0,
          specialCard: null,
          specialCardUsed: false,
        },
      ],
      cart: [],
      events: [],
    },
    store: input.store,
    menu: input.menu,
    durationSeconds: input.durationSeconds,
    createdAt: new Date().toISOString(),
    playerTokens: new Map([[hostId, token]]),
  };
  rooms.set(id, record);
  return { token, snapshot: publicSnapshot(record, token) };
}

export function joinRoom(id: string, rawNickname: string) {
  const record = getRecord(id);
  if (record.game.status !== "waiting") {
    throw new GameRuleError("ROOM_ALREADY_STARTED", "本局已经开始，不能再加入");
  }
  if (record.game.players.length >= 12) {
    throw new GameRuleError("ROOM_FULL", "房间最多 12 人");
  }
  const name = nickname(rawNickname);
  if (record.game.players.some((player) => player.nickname.toLowerCase() === name.toLowerCase())) {
    throw new GameRuleError("NICKNAME_TAKEN", "这个昵称已经有人用了");
  }
  const playerId = randomUUID();
  const token = playerToken();
  const card = cards[randomBytes(1)[0] % cards.length];
  record.game.players.push({
    id: playerId,
    nickname: name,
    isHost: false,
    addTokensRemaining: 2,
    specialCard: card,
    specialCardUsed: false,
  });
  record.playerTokens.set(playerId, token);
  return { token, snapshot: publicSnapshot(record, token) };
}

export function getRoom(id: string, token: string | null) {
  return publicSnapshot(getRecord(id), token);
}

function requireViewer(record: RoomRecord, token: string | null) {
  const id = viewerId(record, token);
  if (!id) throw new GameRuleError("UNAUTHORIZED", "玩家凭证无效，请重新加入");
  return id;
}

function requireMenuProduct(record: RoomRecord, productId: string) {
  const product = record.menu.find((entry) => entry.productId === productId);
  if (!product) throw new GameRuleError("PRODUCT_NOT_FOUND", "本局菜单中没有该餐品");
  return product;
}

export function roomAction(
  id: string,
  token: string | null,
  action:
    | { type: "start" }
    | { type: "add"; productId: string }
    | { type: "delete"; itemId: string }
    | { type: "lock"; itemId: string }
    | { type: "swap"; itemId: string; productId: string },
) {
  const record = getRecord(id);
  const playerId = requireViewer(record, token);
  const now = new Date();
  if (action.type === "start") {
    if (playerId !== record.game.hostId) throw new GameRuleError("HOST_ONLY", "只有房主能开始游戏");
    if (record.game.status !== "waiting")
      throw new GameRuleError("ROOM_NOT_WAITING", "游戏已经开始");
    if (record.game.players.length < 2)
      throw new GameRuleError("NEED_PLAYER", "至少邀请一位朋友再开始");
    record.game.status = "playing";
    record.game.expiresAt = new Date(now.getTime() + record.durationSeconds * 1000).toISOString();
  } else if (action.type === "add") {
    record.game = addItem(record.game, {
      playerId,
      product: requireMenuProduct(record, action.productId),
      itemId: randomUUID(),
      now,
    });
  } else if (action.type === "delete") {
    record.game = deleteItem(record.game, { playerId, itemId: action.itemId, now });
  } else if (action.type === "lock") {
    record.game = lockItem(record.game, { playerId, itemId: action.itemId, now });
  } else {
    record.game = swapItem(record.game, {
      playerId,
      itemId: action.itemId,
      replacement: requireMenuProduct(record, action.productId),
      now,
    });
  }
  return publicSnapshot(record, token);
}

export function prepareCheckout(id: string, token: string | null) {
  const record = getRecord(id);
  const playerId = requireViewer(record, token);
  beginCheckout(record.game, playerId);
  const grouped = new Map<
    string,
    { productId: string; quantity: number; name: string; priceInCents: number }
  >();
  for (const item of record.game.cart) {
    const group = grouped.get(item.productId);
    if (group) group.quantity += 1;
    else
      grouped.set(item.productId, {
        productId: item.productId,
        quantity: 1,
        name: item.name,
        priceInCents: item.priceInCents,
      });
  }
  return { record, items: [...grouped.values()] };
}

export function savePriceCheck(id: string, token: string | null, check: PriceCheck) {
  const record = getRecord(id);
  const playerId = requireViewer(record, token);
  record.game = beginCheckout(record.game, playerId);
  record.priceCheck = check;
  return publicSnapshot(record, token);
}
