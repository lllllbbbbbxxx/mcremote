import assert from "node:assert/strict";

const baseUrl = process.env.MCREMOTE_BASE_URL || "http://localhost:3000";

async function request(path, { token, body, expected = 200, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "x-player-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(payload)}`);
  return payload;
}

const status = await request("/api/catalog/status");
assert.ok(status.mode === "demo" || status.mode === "mcp");

const catalog = await request("/api/catalog/stores", {
  body: { city: "上海", keyword: "人民广场" },
});
assert.ok(catalog.stores.length > 0, "catalog should return at least one store");

const created = await request("/api/rooms", {
  body: {
    hostNickname: "Smoke Host",
    budgetYuan: 100,
    durationSeconds: 60,
    store: catalog.stores[0],
  },
  expected: 201,
});
const roomId = created.snapshot.roomId;
assert.equal(created.snapshot.status, "waiting");
assert.equal(created.snapshot.viewer.isHost, true);

const alice = await request(`/api/rooms/${roomId}/join`, {
  body: { nickname: "Alice" },
  expected: 201,
});
const bob = await request(`/api/rooms/${roomId}/join`, {
  body: { nickname: "Bob" },
  expected: 201,
});
assert.equal(bob.snapshot.players.length, 3);
assert.ok(alice.snapshot.viewer.specialCard, "guest should receive a special card");

await request(`/api/rooms/${roomId}/actions`, {
  token: alice.token,
  body: { type: "start" },
  expected: 400,
});

const started = await request(`/api/rooms/${roomId}/actions`, {
  token: created.token,
  body: { type: "start" },
});
assert.equal(started.status, "playing");

const firstProduct = started.menu[0];
const secondProduct = started.menu[1];
const afterAliceAdd = await request(`/api/rooms/${roomId}/actions`, {
  token: alice.token,
  body: { type: "add", productId: firstProduct.productId },
});
const afterBobAdd = await request(`/api/rooms/${roomId}/actions`, {
  token: bob.token,
  body: { type: "add", productId: secondProduct.productId },
});
assert.equal(afterBobAdd.cart.length, 2);
assert.equal(
  afterBobAdd.totalInCents,
  firstProduct.priceInCents + secondProduct.priceInCents,
  "shared cart total should match both players' actions",
);
assert.equal(afterAliceAdd.viewer.addTokensRemaining, 1);

const actor = alice.snapshot.viewer.specialCard === "delete" ? alice : bob;
const card = actor.snapshot.viewer.specialCard;
const actorToken = actor.token;
const target = afterBobAdd.cart[0];
let afterCard;
if (card === "delete") {
  afterCard = await request(`/api/rooms/${roomId}/actions`, {
    token: actorToken,
    body: { type: "delete", itemId: target.id },
  });
} else if (card === "lock") {
  afterCard = await request(`/api/rooms/${roomId}/actions`, {
    token: actorToken,
    body: { type: "lock", itemId: target.id },
  });
} else {
  afterCard = await request(`/api/rooms/${roomId}/actions`, {
    token: actorToken,
    body: { type: "swap", itemId: target.id, productId: started.menu[2].productId },
  });
}
assert.equal(afterCard.viewer.specialCardUsed, true, "special card should be consumed");

await request(`/api/rooms/${roomId}/actions`, {
  token: actorToken,
  body:
    card === "delete"
      ? { type: "delete", itemId: afterCard.cart[0]?.id || target.id }
      : card === "lock"
        ? { type: "lock", itemId: afterCard.cart[0]?.id || target.id }
        : {
            type: "swap",
            itemId: afterCard.cart[0]?.id || target.id,
            productId: started.menu[3].productId,
          },
  expected: 400,
});

await request(`/api/rooms/${roomId}/actions`, {
  token: "invalid-token",
  body: { type: "add", productId: firstProduct.productId },
  expected: 401,
});

const finalSnapshot = await request(`/api/rooms/${roomId}`, { token: created.token });
assert.equal(finalSnapshot.events.length >= 3, true);
assert.equal(finalSnapshot.viewer.isHost, true);

console.log(
  JSON.stringify({
    ok: true,
    roomId,
    catalogMode: status.mode,
    players: finalSnapshot.players.length,
    cartItems: finalSnapshot.cart.length,
    events: finalSnapshot.events.length,
    exercisedCard: card,
  }),
);
