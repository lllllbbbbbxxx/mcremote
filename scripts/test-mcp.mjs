import assert from "node:assert/strict";

const baseUrl = process.env.MCREMOTE_BASE_URL || "http://localhost:3000";
const city = process.env.MCREMOTE_TEST_CITY || "上海";
const keyword = process.env.MCREMOTE_TEST_KEYWORD || "人民广场";

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  assert.equal(response.ok, true, `${path}: ${JSON.stringify(payload)}`);
  return payload;
}

function toolData(result) {
  if (result.structuredContent?.data) return result.structuredContent.data;
  for (const block of result.content || []) {
    if (block.type !== "text") continue;
    try {
      const payload = JSON.parse(block.text);
      if (payload.data) return payload.data;
    } catch {
      // Ignore non-JSON tool narration.
    }
  }
  throw new Error("MCP tool response does not contain a JSON data payload");
}

const statusResponse = await fetch(`${baseUrl}/api/catalog/status`);
const status = await statusResponse.json();
assert.equal(
  status.mode,
  "mcp",
  "MCP is not configured. Add MCD_MCP_TOKEN to .env.local and restart the app.",
);

const storesResult = await post("/api/mcd/call", {
  tool: "query-nearby-stores",
  arguments: { searchType: 2, beType: 1, city, keyword },
});
const stores = toolData(storesResult);
assert.ok(Array.isArray(stores) && stores.length > 0, "query-nearby-stores returned no stores");
const store = stores.find((entry) => entry.businessStatus !== false) || stores[0];

const menuResult = await post("/api/mcd/call", {
  tool: "query-meals",
  arguments: {
    storeCode: store.storeCode,
    beCode: store.beCode || "",
    orderType: 1,
    beType: 1,
  },
});
const menu = toolData(menuResult);
const productEntry = Object.entries(menu.meals || {}).find(
  ([, meal]) => Number(meal.currentPrice) > 0,
);
assert.ok(productEntry, "query-meals returned no priced products");
const [productCode, product] = productEntry;

const priceResult = await post("/api/mcd/call", {
  tool: "calculate-price",
  arguments: {
    storeCode: store.storeCode,
    beCode: store.beCode || "",
    orderType: 1,
    beType: 1,
    items: [{ productCode, quantity: 1 }],
  },
});
const price = toolData(priceResult);
assert.ok(Number.isInteger(price.price) || Number.isInteger(price.productPrice));

console.log(
  JSON.stringify({
    ok: true,
    source: "mcd-mcp",
    store: store.storeName,
    product: product.name,
    menuPrice: product.currentPrice,
    calculatedPriceInCents: price.price ?? price.productPrice,
  }),
);
