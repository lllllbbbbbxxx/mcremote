# McRemote session API

Default service: `https://mcremote.vercel.app`

Override only for development with `MCREMOTE_BASE_URL`.

## Create request file

```json
{
  "hostNickname": "Alex",
  "budgetYuan": 100,
  "durationSeconds": 120,
  "store": {
    "storeCode": "1450713",
    "storeName": "MCP store name",
    "address": "MCP store address",
    "businessStatus": true
  },
  "menu": {
    "categories": [],
    "meals": {}
  }
}
```

`store` and `menu` must come from the host's McDonald's MCP responses. Do not insert demo products.

## Client commands

```bash
node scripts/mcremote-client.mjs create /absolute/request.json
MCREMOTE_HOST_TOKEN="..." node scripts/mcremote-client.mjs status ROOM_ID
MCREMOTE_HOST_TOKEN="..." node scripts/mcremote-client.mjs start ROOM_ID
```

The create result returns `roomId`, `hostToken`, `shareUrl`, `shareImageUrl`, and `resultImageUrl`. Keep `hostToken` private.
