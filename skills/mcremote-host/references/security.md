# Security and consent rules

## Secrets

- The McDonald's MCP token stays in WorkBuddy's MCP credential store.
- The McRemote `hostToken` authorizes room control only. Keep it in the host task context or a protected environment variable.
- Player links contain only `/room/{roomId}`.
- Invite/result images contain no secret, payment link, address, phone, or full order identifier.

## Confirmation gates

Require a new, explicit host confirmation immediately before each high-impact action:

| Action | Required confirmation |
| --- | --- |
| Create a real order | Confirm the final store, items, take-way, and current payable amount |
| Reveal payment link | Host explicitly asks to proceed to payment |
| Cancel an order | Confirm the target order and that cancellation is intended |

Game creation, starting a game, price calculation, and generating images do not authorize order creation or payment.

## Duplicate prevention

After any ambiguous `create-order` response, query recent/order state before retrying. A timeout does not prove failure. Never create a second order merely because the first response was lost.

## Public/private split

Safe for participants: room ID, store display name, budget, menu snapshot, cart, player nicknames, events, countdown, invite/result image.

Host-only: McDonald's MCP tools, token, exact order ID, payment ID/link, saved addresses, phone, coupons, order history, cancellation controls.
