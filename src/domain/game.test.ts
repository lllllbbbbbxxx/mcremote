import { beforeEach, describe, expect, it } from "vitest";
import {
  addItem,
  beginCheckout,
  cartTotal,
  deleteItem,
  finishGame,
  type GameState,
  lockItem,
  swapItem,
} from "./game";

const now = new Date("2026-10-11T04:00:00.000Z");
const fries = { productId: "fries", name: "Fries", priceInCents: 1500, source: "mcd-mcp" as const };
const burger = {
  productId: "burger",
  name: "Burger",
  priceInCents: 2400,
  source: "mcd-mcp" as const,
};

let state: GameState;

beforeEach(() => {
  state = {
    roomId: "room-1",
    hostId: "host",
    storeId: "store-1",
    catalogMode: "mcd-mcp",
    budgetInCents: 3000,
    status: "playing",
    expiresAt: "2026-10-11T04:01:00.000Z",
    cart: [],
    events: [],
    players: [
      {
        id: "host",
        nickname: "Host",
        isHost: true,
        addTokensRemaining: 2,
        specialCard: null,
        specialCardUsed: false,
      },
      {
        id: "alice",
        nickname: "Alice",
        isHost: false,
        addTokensRemaining: 2,
        specialCard: "lock",
        specialCardUsed: false,
      },
      {
        id: "bob",
        nickname: "Bob",
        isHost: false,
        addTokensRemaining: 2,
        specialCard: "delete",
        specialCardUsed: false,
      },
      {
        id: "carol",
        nickname: "Carol",
        isHost: false,
        addTokensRemaining: 2,
        specialCard: "swap",
        specialCardUsed: false,
      },
    ],
  };
});

describe("game rules", () => {
  it("adds an MCP product and consumes an add token", () => {
    state = addItem(state, { playerId: "alice", product: fries, itemId: "item-1", now });
    expect(cartTotal(state)).toBe(1500);
    expect(state.players.find((player) => player.id === "alice")?.addTokensRemaining).toBe(1);
    expect(state.events[0].action).toBe("add");
  });

  it("rejects an operation that exceeds the budget", () => {
    state = addItem(state, { playerId: "alice", product: burger, itemId: "item-1", now });
    expect(() =>
      addItem(state, { playerId: "bob", product: fries, itemId: "item-2", now }),
    ).toThrowError(expect.objectContaining({ code: "OVER_BUDGET" }));
  });

  it("does not accept products outside the MCP menu", () => {
    const fake = { ...fries, source: "fixture" as "mcd-mcp" };
    expect(() =>
      addItem(state, { playerId: "alice", product: fake, itemId: "item-1", now }),
    ).toThrowError(expect.objectContaining({ code: "UNTRUSTED_PRODUCT" }));
  });

  it("prevents DELETE after an item is locked", () => {
    state = addItem(state, { playerId: "alice", product: fries, itemId: "item-1", now });
    state = lockItem(state, { playerId: "alice", itemId: "item-1", now });
    expect(() => deleteItem(state, { playerId: "bob", itemId: "item-1", now })).toThrowError(
      expect.objectContaining({ code: "ITEM_LOCKED" }),
    );
  });

  it("allows a budget-safe SWAP and marks the card used", () => {
    state = addItem(state, { playerId: "alice", product: fries, itemId: "item-1", now });
    state = swapItem(state, { playerId: "carol", itemId: "item-1", replacement: burger, now });
    expect(cartTotal(state)).toBe(2400);
    expect(state.players.find((player) => player.id === "carol")?.specialCardUsed).toBe(true);
  });

  it("stops mutations when time has expired", () => {
    const expired = new Date("2026-10-11T04:02:00.000Z");
    expect(() =>
      addItem(state, { playerId: "alice", product: fries, itemId: "item-1", now: expired }),
    ).toThrowError(expect.objectContaining({ code: "ROOM_EXPIRED" }));
  });

  it("allows only the host to proceed to checkout", () => {
    state = finishGame(state, new Date("2026-10-11T04:02:00.000Z"));
    expect(() => beginCheckout(state, "alice")).toThrowError(
      expect.objectContaining({ code: "HOST_ONLY" }),
    );
    expect(beginCheckout(state, "host").status).toBe("checkout");
  });
});
