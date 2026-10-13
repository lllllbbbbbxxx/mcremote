# McDonald's MCP tool routing

Tool names can be prefixed by WorkBuddy. Match the final semantic name.

## Game setup

- `query-nearby-stores`: `{ searchType: 2, beType: 1, city, keyword }`
- `query-meals`: `{ storeCode, orderType: 1, beType: 1 }`

Keep the returned `storeCode`, display fields, category list, and `meals` map unchanged when sending them to McRemote.

## Settlement

- `calculate-price`: `{ storeCode, orderType: 1, beType: 1, needTableware, items }`
- `items[]`: `{ productCode, quantity }`, plus MCP-provided `roundList` or `modification` when the selected product requires them.
- Select `takeWayCode` only from the latest `data.takeWayList`.

## Order lifecycle

- `create-order`: use the same store/items as the accepted preview and include the selected `takeWayCode`.
- `query-order`: `{ orderId }` after a create timeout, or after the host reports payment completion/failure.
- `cancel-order`: `{ orderId, cancelReasonCode }` only after cancellation confirmation.

For `beType=1`/arrival pickup, do not invent an address or `beCode`. For delivery, require the host to choose an address through the MCP-supported address flow before pricing or ordering.
