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
  playerTokens: Record<string, string>;
  priceCheck?: PriceCheck;
  revision: number;
}

declare global {
  var __mcremoteRooms: Map<string, RoomRecord> | undefined;
}

const localRooms = globalThis.__mcremoteRooms ?? new Map<string, RoomRecord>();
globalThis.__mcremoteRooms = localRooms;

const cards: SpecialCard[] = ["delete", "swap", "lock"];
const roomTtlSeconds = 24 * 60 * 60;
const maxMutationAttempts = 6;

type RedisResult<T> = { result?: T; error?: string };

function redisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function roomKey(id: string) {
  return `mcremote:room:${id.toUpperCase()}`;
}

async function redisCommand<T>(command: Array<string | number>) {
  const credentials = redisCredentials();
  if (!credentials) throw new Error("Redis 持久化环境变量未配置");
  const response = await fetch(credentials.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const payload = (await response.json()) as RedisResult<T>;
  if (!response.ok || payload.error) {
    throw new Error(`Redis 请求失败：${payload.error ?? response.statusText}`);
  }
  return payload.result as T;
}

function requirePersistenceInProduction() {
  if (process.env.VERCEL && !redisCredentials()) {
    throw new Error("生产环境缺少 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  }
}

async function loadRecord(id: string) {
  const normalizedId = id.toUpperCase();
  const credentials = redisCredentials();
  let record: RoomRecord | undefined;
  if (credentials) {
    const serialized = await redisCommand<string | null>(["GET", roomKey(normalizedId)]);
    record = serialized ? (JSON.parse(serialized) as RoomRecord) : undefined;
  } else {
    requirePersistenceInProduction();
    record = localRooms.get(normalizedId);
  }
  if (!record) throw new GameRuleError("ROOM_NOT_FOUND", "房间不存在或已过期");
  return record;
}

async function createRecord(record: RoomRecord) {
  if (redisCredentials()) {
    return (
      (await redisCommand<string | null>([
        "SET",
        roomKey(record.game.roomId),
        JSON.stringify(record),
        "EX",
        roomTtlSeconds,
        "NX",
      ])) === "OK"
    );
  }
  requirePersistenceInProduction();
  if (localRooms.has(record.game.roomId)) return false;
  localRooms.set(record.game.roomId, structuredClone(record));
  return true;
}

const compareAndSetScript = `
local current = redis.call("GET", KEYS[1])
if not current then return -1 end
local decoded = cjson.decode(current)
if tonumber(decoded.revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;

async function saveRecord(record: RoomRecord, expectedRevision: number) {
  if (redisCredentials()) {
    return await redisCommand<number>([
      "EVAL",
      compareAndSetScript,
      1,
      roomKey(record.game.roomId),
      expectedRevision,
      JSON.stringify(record),
      roomTtlSeconds,
    ]);
  }
  requirePersistenceInProduction();
  const current = localRooms.get(record.game.roomId);
  if (!current) return -1;
  if (current.revision !== expectedRevision) return 0;
  localRooms.set(record.game.roomId, structuredClone(record));
  return 1;
}

async function mutateRecord<T>(id: string, mutation: (record: RoomRecord) => T) {
  for (let attempt = 0; attempt < maxMutationAttempts; attempt += 1) {
    const current = await loadRecord(id);
    const expectedRevision = current.revision;
    const next = structuredClone(current);
    const result = mutation(next);
    next.revision = expectedRevision + 1;
    const saved = await saveRecord(next, expectedRevision);
    if (saved === 1) return { record: next, result };
    if (saved === -1) throw new GameRuleError("ROOM_NOT_FOUND", "房间不存在或已过期");
  }
  throw new GameRuleError("ROOM_BUSY", "多人同时操作，请重试");
}

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

function finishExpiredGame(record: RoomRecord) {
  if (record.game.status === "playing" && Date.now() >= new Date(record.game.expiresAt).getTime()) {
    record.game = finishGame(record.game, new Date());
    return true;
  }
  return false;
}

function viewerId(record: RoomRecord, token: string | null) {
  if (!token) return null;
  return (
    Object.entries(record.playerTokens).find(([, storedToken]) => storedToken === token)?.[0] ??
    null
  );
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

export async function createRoom(input: {
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
  const hostName = nickname(input.hostNickname);
  for (let attempt = 0; attempt < 8; attempt += 1) {
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
            nickname: hostName,
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
      playerTokens: { [hostId]: token },
      revision: 1,
    };
    if (await createRecord(record)) return { token, snapshot: publicSnapshot(record, token) };
  }
  throw new Error("无法生成唯一房间号，请重试");
}

export async function joinRoom(id: string, rawNickname: string) {
  const name = nickname(rawNickname);
  const { record, result } = await mutateRecord(id, (draft) => {
    finishExpiredGame(draft);
    if (draft.game.status !== "waiting")
      throw new GameRuleError("ROOM_ALREADY_STARTED", "本局已经开始，不能再加入");
    if (draft.game.players.length >= 12) throw new GameRuleError("ROOM_FULL", "房间最多 12 人");
    if (draft.game.players.some((player) => player.nickname.toLowerCase() === name.toLowerCase())) {
      throw new GameRuleError("NICKNAME_TAKEN", "这个昵称已经有人用了");
    }
    const playerId = randomUUID();
    const token = playerToken();
    const card = cards[randomBytes(1)[0] % cards.length];
    draft.game.players.push({
      id: playerId,
      nickname: name,
      isHost: false,
      addTokensRemaining: 2,
      specialCard: card,
      specialCardUsed: false,
    });
    draft.playerTokens[playerId] = token;
    return token;
  });
  return { token: result, snapshot: publicSnapshot(record, result) };
}

export async function getRoom(id: string, token: string | null) {
  const record = await loadRecord(id);
  if (!finishExpiredGame(record)) return publicSnapshot(record, token);
  const finished = await mutateRecord(id, (draft) => {
    finishExpiredGame(draft);
  });
  return publicSnapshot(finished.record, token);
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

export async function roomAction(
  id: string,
  token: string | null,
  action:
    | { type: "start" }
    | { type: "add"; productId: string }
    | { type: "delete"; itemId: string }
    | { type: "lock"; itemId: string }
    | { type: "swap"; itemId: string; productId: string },
) {
  const { record } = await mutateRecord(id, (draft) => {
    finishExpiredGame(draft);
    const playerId = requireViewer(draft, token);
    const now = new Date();
    if (action.type === "start") {
      if (playerId !== draft.game.hostId)
        throw new GameRuleError("HOST_ONLY", "只有房主能开始游戏");
      if (draft.game.status !== "waiting")
        throw new GameRuleError("ROOM_NOT_WAITING", "游戏已经开始");
      if (draft.game.players.length < 2)
        throw new GameRuleError("NEED_PLAYER", "至少邀请一位朋友再开始");
      draft.game.status = "playing";
      draft.game.expiresAt = new Date(now.getTime() + draft.durationSeconds * 1000).toISOString();
    } else if (action.type === "add") {
      draft.game = addItem(draft.game, {
        playerId,
        product: requireMenuProduct(draft, action.productId),
        itemId: randomUUID(),
        now,
      });
    } else if (action.type === "delete") {
      draft.game = deleteItem(draft.game, { playerId, itemId: action.itemId, now });
    } else if (action.type === "lock") {
      draft.game = lockItem(draft.game, { playerId, itemId: action.itemId, now });
    } else {
      draft.game = swapItem(draft.game, {
        playerId,
        itemId: action.itemId,
        replacement: requireMenuProduct(draft, action.productId),
        now,
      });
    }
  });
  return publicSnapshot(record, token);
}

export async function prepareCheckout(id: string, token: string | null) {
  const record = await loadRecord(id);
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

export async function savePriceCheck(id: string, token: string | null, check: PriceCheck) {
  const { record } = await mutateRecord(id, (draft) => {
    const playerId = requireViewer(draft, token);
    draft.game = beginCheckout(draft.game, playerId);
    draft.priceCheck = check;
  });
  return publicSnapshot(record, token);
}
