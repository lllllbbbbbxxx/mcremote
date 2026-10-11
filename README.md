# McRemote 🍟 / 麦麦遥控器

> **Give your friends a budget. Lose control of your lunch.**

给朋友一笔预算，让他们决定你这一顿麦当劳吃什么。McRemote 是一款基于麦当劳 MCP 的轻量多人点餐游戏：房主选择真实门店并设定预算，朋友在当前可售菜单中加购，并用 `DELETE`、`SWAP`、`LOCK` 卡制造一点善意的混乱。

菜单与价格来自麦当劳 MCP；预算永远不能超；最终真实下单只能由房主本人确认。

## 当前状态

这是 `0.1.0` 初始仓库，已经包含：

- 可运行、响应式的 Next.js 项目首页
- 麦当劳 MCP Streamable HTTP 服务端客户端
- 仅允许查询门店、菜单、详情和核价的安全 Tool allowlist
- ADD / DELETE / SWAP / LOCK、预算、倒计时与房主结算的纯领域规则
- 覆盖关键规则的自动化测试
- 参赛必需声明、MCP 接入说明和脱敏配置

多人房间持久化、实时同步、4 个完整游戏页面和真实下单将在后续里程碑完成。

## 目标用户

- 想把聚餐选择变成社交小游戏的朋友群
- 不想自己决定“今天吃什么”的房主
- 想体验麦当劳 MCP 真实业务能力的开发者

## 玩法示例

```text
房主：选择目标门店 → 预算 ¥50 → 倒计时 60 秒 → 分享链接
Alice：添加薯条，再用 LOCK 锁住它
Bob：添加麦旋风，用 DELETE 删掉另一件未锁餐品
Carol：用 SWAP 偷梁换柱（替换后仍不得超过 ¥50）
时间到：生成 THE DAMAGE → 重新核价 → 只有房主能确认订单
```

## 本地安装

要求 Node.js 22.12 或更高版本。

```bash
git clone https://github.com/lllllbbbbbxxx/mcremote.git
cd mcremote
npm install
cp .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。

如需调用真实麦当劳 MCP，请先前往 [麦当劳 MCP 开放平台](https://open.mcd.cn/mcp) 申请 Token，并只在本地 `.env.local` 中配置：

```dotenv
MCD_MCP_TOKEN=your_private_token
MCD_MCP_URL=https://mcp.mcd.cn
```

不要把 Token 写入源码、`mcp-config.example.json` 或任何提交。

## 常用命令

```bash
npm run dev        # 启动开发服务器
npm run test       # 运行游戏规则测试
npm run typecheck  # TypeScript 严格类型检查
npm run lint       # Biome 静态检查
npm run build      # 生产构建
```

## 技术结构

```text
src/
├── app/
│   ├── api/mcd/call/route.ts   # MCP 只读 Tool 服务端网关
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # 初始展示页
├── domain/
│   ├── game.ts                 # 无 UI 依赖的游戏规则
│   └── game.test.ts
└── lib/mcd-mcp/client.ts       # Streamable HTTP MCP 客户端
```

金额在领域层统一使用整数分（`priceInCents`），避免浮点误差。菜单商品必须带有 `source: "mcd-mcp"`，不会用静态假菜单冒充真实可售数据。

## 路线图

- [x] 参赛合规仓库骨架与品牌无关的原创界面
- [x] MCP 客户端和核心游戏规则
- [ ] Create Room / Waiting Room / Game Room / Damage Report
- [ ] 房间数据持久化与 WebSocket 实时同步
- [ ] 下单前供应状态与价格二次核验
- [ ] 房主身份校验和明确确认后的 `create-order`
- [ ] Demo GIF、部署地址与报名 Issue

## 参赛资料

- [MCP 接入说明](./MCP_INTEGRATION.md)
- [官方原样参赛声明](./CONTEST_DECLARATION.md)
- [脱敏 MCP 配置](./mcp-config.example.json)
- [产品需求](./McRemote_MVP_PRD.md)

## 免责声明

本项目是麦当劳程序员创意开发大赛参赛作品，由参赛者独立开发，非麦当劳官方产品。餐品信息、价格和供应状态以麦当劳官方渠道的实时结果为准。项目不提供营养或医疗建议。

## License

[MIT](./LICENSE)
