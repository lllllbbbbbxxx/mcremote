---
name: mcremote-host
description: Host a McRemote multiplayer McDonald's ordering game from WorkBuddy using the host's own McDonald's China MCP connection. Use when a user wants to start, share, monitor, settle, order, pay for, cancel, or export an invite/result image for a McRemote game. Also use when McDonald's MCP setup or token guidance is needed before starting a game.
---

# McRemote Host

Run the host side of McRemote. Keep McDonald's identity, pricing, ordering, and payment inside the host's WorkBuddy session. Give participants only the temporary McRemote room link.

## Non-negotiable boundary

- Use the host's connected McDonald's MCP tools for stores, menus, price calculation, order creation, order lookup, cancellation, and payment handoff.
- Never ask the user to paste an MCP token into chat, a room, a URL, or a McRemote API request.
- Never send a McDonald's token, payment URL, address, phone number, order ID, or host capability token to participants.
- Never create an order without a fresh price preview followed by explicit host confirmation.
- Never open or submit a payment link automatically. Payment is a separate host action.
- Treat the `hostToken` returned by McRemote as a secret capability. Do not include it in the share URL or images.

Read [references/security.md](references/security.md) before `create-order`, payment handoff, cancellation, or handling any credential. Read [references/mcd-tools.md](references/mcd-tools.md) when tool names or parameters are unclear.

## 1. Preflight McDonald's MCP

Discover connected tools by capability; names may be prefixed by WorkBuddy. Require equivalents of:

- `query-nearby-stores`
- `query-meals`
- `calculate-price`
- `create-order`

If unavailable, guide the host to obtain a token at `https://open.mcd.cn/mcp`, then add a Streamable HTTP MCP connection in WorkBuddy:

- URL: `https://mcp.mcd.cn`
- Header: `Authorization: Bearer <token>`

Ask the host to confirm the MCP connection is enabled, then rediscover tools. Do not receive or validate the raw token yourself.

## 2. Create a game

Collect only missing choices: host nickname, city/location, budget (RMB 10–1000), and duration (60/90/120 seconds). Prefer 120 seconds unless the host chooses otherwise.

1. Call the host's `query-nearby-stores` with `searchType=2`, `beType=1`, city, and keyword.
2. Ask the host to choose when multiple open stores are plausible.
3. Call `query-meals` for the chosen store with `orderType=1`, `beType=1`.
4. Pass the returned store and raw menu data to McRemote using the bundled client:

```bash
node scripts/mcremote-client.mjs create /absolute/path/to/request.json
```

The request file shape is documented in [references/mcremote-api.md](references/mcremote-api.md). Delete the temporary request file after use.

Retain `roomId` and `hostToken` privately for this game. Give the host:

- `shareUrl` for players;
- `shareImageUrl` as the downloadable/shareable invite image;
- room code, store, budget, and duration.

Do not add `hostToken` to either URL.

## 3. Start and monitor

Check status before starting:

```bash
MCREMOTE_HOST_TOKEN="..." node scripts/mcremote-client.mjs status ROOM_ID
MCREMOTE_HOST_TOKEN="..." node scripts/mcremote-client.mjs start ROOM_ID
```

Start only after at least one non-host player has joined and the host asks to begin. During play, status checks may summarize player count, remaining time, cart total, and recent actions. Do not repeatedly call McDonald's MCP; participants play against the room's frozen menu snapshot.

## 4. Settle with the host's MCP

After McRemote reports `finished`:

1. Group the cart by `productId` and quantity.
2. Re-run `query-meals` to confirm products are still offered.
3. Call `calculate-price` with the exact frozen cart.
4. Show store, take-way option, item quantities, discounts, fees, and payable total.
5. Ask a clear confirmation question: “确认创建这笔真实待支付订单吗？”

Do not infer confirmation from earlier game creation, “结算”, or a budget choice.

After explicit confirmation, call `create-order` once with the same items and a `takeWayCode` returned by the latest `calculate-price`. Report the pending order summary privately. Do not expose the payment URL unless the host asks to proceed to payment.

If the host asks to pay, present the MCP-provided payment link for the host to open personally. Never click it, submit it, scan it, or claim payment succeeded. After the host says payment completed or failed, call `query-order` and report the authoritative status.

## 5. Finish and export

Return `resultImageUrl` after the game ends. It is a PNG summary designed for saving or sharing and excludes credentials, payment details, personal information, and full order identifiers.

If an unpaid test order was created and the host does not want to keep it, ask whether to cancel. Call `cancel-order` only after confirmation, then verify and report the result.

## Recovery

- MCP missing: guide setup; do not fall back to McRemote's server-side token.
- Room expired/not found: create a new room and new invite image.
- Product unavailable or price changed: stop order creation and ask the host to revise the cart.
- `create-order` timeout after submission: call `query-order`/`order-list` before retrying to avoid duplicates.
- Payment uncertain: query order status; never retry payment yourself.
