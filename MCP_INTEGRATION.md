# McRemote × 麦当劳 MCP

McRemote 接入麦当劳中国官方托管的 MCP Server：`https://mcp.mcd.cn`（Streamable HTTP）。Token 只保存在服务端环境变量 `MCD_MCP_TOKEN` 中，不会发给浏览器，也不会进入 Git。

## 使用的 Tools

| Tool | 阶段 | 作用 |
| --- | --- | --- |
| `query-nearby-stores` | 创建房间 | 按城市和关键词获取可用真实门店 |
| `query-meals` | 创建房间 / 游戏 | 获取目标门店当前可售餐品，生成好友端唯一候选菜单 |
| `query-meal-detail` | 后续套餐详情 | 获取套餐组成和可替换选项；已列入只读白名单 |
| `calculate-price` | 最终结算 | 房主确认前使用官方价格重新核验整个购物车 |
| `create-order` | WorkBuddy 房主结算 | 仅由房主自己的 MCP 在看过 Preview 并明确确认后调用；好友端永不具备该权限 |
| `query-order` / `cancel-order` | WorkBuddy 订单管理 | 支付后查询或经房主确认后取消订单 |

公开网页的 `src/app/api/mcd/call/route.ts` 仍使用显式只读 allowlist，永不暴露
`create-order`。安装在房主 WorkBuddy 中的 `mcremote-host` Skill 直接使用房主自己的麦当劳 MCP
完成核价、下单、支付交接、查询与取消；McRemote 服务器不会接收房主的 MCP Token。

## 调用流程

```text
房主输入位置
  → query-nearby-stores
  → 房主选择 storeCode
  → query-meals
  → 将 MCP 返回的 productCode / 名称 / 价格写入本局菜单
  → 好友 ADD / DELETE / SWAP / LOCK（每步本地事务校验预算）
  → 倒计时结束，购物车冻结
  → query-meals 复核供应状态
  → calculate-price 复核官方价格
  → 房主查看真实订单 Preview 并明确确认
  → 房主 WorkBuddy 调用 create-order
  → 支付链接仅返回房主；支付仍需房主单独操作
```

## MCP 带来的业务价值

- MCP 模式下，好友看到的是目标门店当下真实可售菜单；未配置 Token 时页面会明确显示 `DEMO MODE`。
- 游戏中使用官方商品编码和价格，预算约束能对应现实订单。
- 结算前再次查询供应和价格，避免把过期的游戏状态直接变成订单。
- MCP 把“多人小游戏”的结果安全地连接到真实点餐流程，同时保留房主的最终决定权。

## 代码位置与本地验证

- MCP Streamable HTTP 客户端：`src/lib/mcd-mcp/client.ts`
- MCP 数据标准化与菜单/核价服务：`src/lib/catalog.ts`
- 只读服务端代理：`src/app/api/mcd/call/route.ts`
- 自动化真实 MCP 测试：`scripts/test-mcp.mjs`
- 脱敏 MCP Client 示例：`mcp-config.example.json`

配置 `.env.local` 后启动项目，可以一条命令依次验证真实门店、菜单和核价：

```bash
npm run test:mcp
```

也可以用以下请求单独检查 Tool：

```bash
curl -X POST http://localhost:3000/api/mcd/call \
  -H 'Content-Type: application/json' \
  -d '{"tool":"query-nearby-stores","arguments":{"searchType":2,"beType":1,"city":"上海","keyword":"人民广场"}}'
```

生产环境还需在通用只读路由前增加用户会话和持久化限流。官方当前说明每个 Token 每分钟最多 600 次请求；McRemote 在创建房间时只拉取一次菜单，好友操作共享房间快照，不会为每位好友重复请求 MCP。

## Demo 与真实数据隔离

没有 `MCD_MCP_TOKEN` 时应用自动进入 Demo 模式，仅用于验证多人玩法：

- 首页、门店和结算页都会显示 `DEMO` 标记；
- Demo 商品使用 `source: "demo"`，真实商品使用 `source: "mcd-mcp"`；
- 领域规则拒绝把不同来源的商品加入同一房间；
- 一旦服务端配置 Token，新的门店查询和房间会自动使用真实 MCP。
