# McRemote × 麦当劳 MCP

McRemote 接入麦当劳中国官方托管的 MCP Server：`https://mcp.mcd.cn`（Streamable HTTP）。Token 只保存在服务端环境变量 `MCD_MCP_TOKEN` 中，不会发给浏览器，也不会进入 Git。

## 使用的 Tools

| Tool | 阶段 | 作用 |
| --- | --- | --- |
| `query-nearby-stores` | 创建房间 | 按城市和关键词获取可用真实门店 |
| `query-meals` | 创建房间 / 游戏 | 获取目标门店当前可售餐品，生成好友端唯一候选菜单 |
| `query-meal-detail` | 选品 | 获取套餐组成和可替换选项 |
| `calculate-price` | 选品 / 最终结算 | 使用官方价格校验购物车；房主确认前再次调用 |
| `create-order` | 后续可选 | 仅在房主看过 Preview 并明确确认后调用；好友端永不具备该权限 |

当前初始仓库已实现前四个只读 Tool 的服务端 MCP 调用通道。为了避免任何客户端请求越权创建订单，`src/app/api/mcd/call/route.ts` 使用显式 allowlist，暂不暴露 `create-order`。

## 调用流程

```text
房主输入位置
  → query-nearby-stores
  → 房主选择 storeCode
  → query-meals + query-meal-detail
  → 将 MCP 返回的 productCode / 名称 / 价格写入本局菜单
  → 好友 ADD / DELETE / SWAP / LOCK（每步本地事务校验预算）
  → 倒计时结束，购物车冻结
  → query-meals 复核供应状态
  → calculate-price 复核官方价格
  → 房主查看真实订单 Preview 并明确确认
  → create-order（接入真实下单后，仅由受保护的房主操作触发）
```

## MCP 带来的业务价值

- 好友看到的不是静态演示数据，而是目标门店当下真实可售菜单。
- 游戏中使用官方商品编码和价格，预算约束能对应现实订单。
- 结算前再次查询供应和价格，避免把过期的游戏状态直接变成订单。
- MCP 把“多人小游戏”的结果安全地连接到真实点餐流程，同时保留房主的最终决定权。

## 代码位置与本地验证

- MCP Streamable HTTP 客户端：`src/lib/mcd-mcp/client.ts`
- 只读服务端代理：`src/app/api/mcd/call/route.ts`
- 脱敏 MCP Client 示例：`mcp-config.example.json`

配置 `.env.local` 后启动项目，可用以下请求检查真实连接（参数应按 MCP 最新 Tool schema 填写）：

```bash
curl -X POST http://localhost:3000/api/mcd/call \
  -H 'Content-Type: application/json' \
  -d '{"tool":"query-nearby-stores","arguments":{"searchType":2,"beType":1,"city":"上海","keyword":"人民广场"}}'
```

生产环境还需在此路由前增加用户会话、房间权限和持久化限流。官方当前说明每个 Token 每分钟最多 600 次请求，McRemote 会缓存门店菜单并避免为每位好友重复拉取。
