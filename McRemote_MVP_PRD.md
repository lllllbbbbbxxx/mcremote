# McRemote / 麦麦遥控器 — MVP PRD

## 1. 产品一句话

**给朋友一笔预算，让他们决定你这一顿麦当劳吃什么。**

英文 tagline：

> **Give your friends a budget. Lose control of your lunch.**

核心不是“AI 推荐吃什么”，而是一个轻量多人小游戏：

- 房主选择真实麦当劳门店
- 设置总预算
- 分享房间给朋友
- 朋友在该门店当前真实可售菜单里加购
- 每位朋友获得 1 次随机特殊操作机会
- 整个购物车始终不能超过预算
- 游戏结束后生成趣味结算页
- 最终是否真实下单，只能由房主确认

---

## 2. 产品目标

### MVP 目标

快速做出一个：

- 一眼能懂
- 好玩
- 容易分享
- 有多人互动
- 真正使用麦当劳 MCP
- 能在 GitHub README / GIF 中清楚展示玩法

的参赛作品。

### 非目标

MVP 暂时不做：

- 营养规划
- AI 自动优化套餐
- 强制“必须有主食”
- 健康 / 合理饮食约束
- 好友支付
- 自动下单
- 复杂账号体系
- 排行榜
- 长期历史记录

这是游戏，不需要保证购物车“像正常的一顿饭”。

只需要保证：

1. 商品来自目标门店当前真实可售菜单
2. 总价不超过房主预算
3. 最终真实下单必须由房主本人确认

---


## 3. 赛事官方信息与提交要求

> 本节用于开发与提交时核对。**如活动页面与本 PRD 有冲突，以麦当劳官方 GitHub 仓库最新规则为准。**

### 3.1 官方地址

- CSDN / BuilderX 活动页：  
  https://builderx.csdn.net/activity-site/m-code/pages
- 麦当劳官方赛事 GitHub：  
  https://github.com/M-China/mcd-developer-innovation-challenge
- 官方赛事 README：  
  https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/README.md
- 完整活动规则：  
  https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/activityGuidelines.md
- 麦当劳 MCP Server 使用指南：  
  https://github.com/M-China/mcd-mcp-server
- 麦当劳 MCP 服务入口：  
  https://open.mcd.cn/mcp
- WorkBuddy：  
  https://www.workbuddy.cn/

### 3.2 赛事时间

北京时间：

- **报名及排名：2026-10-09 10:30 ～ 2026-10-25 23:59**
- **最终排行榜数据采集：2026-10-26 00:00**
- **奖品兑换 / 信息提交截止：2026-11-14**

因此本项目策略是：

> **先尽快完成合格 MVP 并报名，占住创意位置；报名后继续在同一 Public Repo 中迭代体验与展示。**

官方规则未要求报名成功后冻结仓库，但首次提交时必须已经满足基本参赛条件，不能只提交空 README 占位。

### 3.3 参赛项目基本要求

McRemote 必须满足：

1. 项目基于 **麦当劳 MCP** 开发，并且真实调用麦当劳 MCP 能力。
2. GitHub 仓库必须为 **Public**，公开可访问。
3. 项目创建时间必须位于：
   - 2025-12-25 00:00
   - 至 2026-10-25 23:59
4. 项目必须为原创或已取得合法授权。
5. 不能泄露：
   - MCP Token
   - API Key
   - 密码
   - 账号凭证
   - 他人个人信息
6. 不得使用脚本、机器人、批量账号等方式操纵 GitHub Star 或排行榜。
7. 项目不能冒充麦当劳官方产品，也避免使用贬损、讽刺麦当劳品牌或产品本身的表达。

McRemote 的趣味文案应针对“朋友制造的混乱”，例如：

> Your friends ruined your lunch.

避免写成攻击麦当劳品牌或食品本身的文案。

### 3.4 GitHub 仓库必备文件

为避免 README 与完整规则之间的清单差异，McRemote 按**最完整要求**准备：

```text
McRemote/
├── README.md
├── CONTEST_DECLARATION.md
├── MCP_INTEGRATION.md
├── mcp-config.example.json
├── workbuddy.md              # 参加 WorkBuddy 专项奖励时必须
├── .gitignore
├── src/ / app/ / scripts/    # 实际源代码，形式不限
└── ...
```

#### README.md

必须包含：

- 项目介绍
- 安装方法
- 使用示例
- 目标用户

建议 README 第一屏直接突出玩法与 GIF，而不是先堆技术说明：

> **McRemote 🍟**  
> Give your friends a budget. Lose control of your lunch.

#### CONTEST_DECLARATION.md

**必须使用官方版本：**

https://github.com/M-China/mcd-developer-innovation-challenge/blob/main/CONTEST_DECLARATION.md

要求：

- 文件名不可修改
- 文件内容不可修改

不要让 Codex 自己重新生成一份“类似版本”。

#### MCP_INTEGRATION.md

必须说明：

- 使用哪个麦当劳 MCP Server
- 实际调用哪些 Tool
- Tool 调用流程
- MCP 在 McRemote 中解决什么问题 / 带来什么业务价值

McRemote 可重点说明：

```text
Host selects target store
↓
MCP queries the real store / currently available menu
↓
Build multiplayer game menu
↓
Friends ADD / DELETE / SWAP / LOCK
↓
Game ends
↓
Re-check availability and calculate real price via MCP
↓
Host previews final order
↓
Host explicitly confirms
↓
create-order（若 MVP 接入真实下单）
```

核心说明：

> 好友端看到的候选商品必须来自房主所选目标门店的真实可售菜单，不能使用静态假菜单冒充实时商品。

#### mcp-config.example.json

只提供**脱敏配置示例**，真实 Token 绝不能进入仓库。

示例：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer ${MCD_MCP_TOKEN}"
      }
    }
  }
}
```

同时必须在 `.gitignore` 中排除真实环境文件，例如：

```text
.env
.env.local
*.env
```

#### workbuddy.md

普通参赛不是必须。

如果参加 **WorkBuddy 专项奖励**：

- 必须真实使用 WorkBuddy 参与开发
- 必须提交 `workbuddy.md`
- 内容用于记录 / 核验真实 WorkBuddy 开发过程

如果主体开发使用 Codex，可以让 WorkBuddy **真实承担一段明确工作**，例如 MCP 接入调试、Skill 结构检查或测试验证，再保存真实过程；不要伪造开发记录。

### 3.5 Skill 形式要求

官方对 “Skill” 定义很宽，不要求必须是纯 Prompt 或固定框架。

可以是：

- 应用程序
- 智能体
- 插件
- 自动化流程
- 工作流
- 其他软件功能模块

因此 **McRemote 做成多人 Web 游戏 + 麦当劳 MCP 完全符合形式要求**。

不需要为了比赛强行把产品压成一个聊天机器人。

### 3.6 报名 Issue 格式

项目达到可运行 MVP、仓库文件齐全后，在官方赛事仓库提交 Issue。

格式：

```text
【参赛申请】

项目名称：McRemote / 麦麦遥控器

项目地址：
https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO>

项目简介：
一个基于麦当劳 MCP 的多人社交点餐游戏。
房主选择真实门店并设置预算，把购物车控制权交给朋友。
朋友可以加购，并随机获得 DELETE / SWAP / LOCK 操作卡，
在预算内共同决定房主最终吃什么。
所有候选餐品来自目标门店真实可售菜单，
最终真实订单只能由房主本人确认。
```

提交后：

- 审核成功：进入有效参赛项目
- 审核失败：根据官方 Issue 回复修改后，可以重新提交报名

### 3.7 排名机制对产品策略的影响

官方主要按报名成功项目的 **公开 GitHub Star 数量**排名。

因此 McRemote 的产品优先级是：

1. **玩法一句话能懂**
2. **多人互动本身有趣**
3. **最终结果适合截图 / 录屏 / 分享**
4. README 第一屏有强视觉和 Demo GIF
5. 技术实现可靠，但不为了工程复杂度牺牲传播性

本项目的目标不是做“最完整的点餐 Agent”，而是做一个：

> **别人看到 10 秒就想拉朋友玩一下的麦当劳 MCP 游戏。**

---

## 4. 核心用户流程

### 4.1 房主创建房间

#### Step 1：选择门店

房主选择一个麦当劳门店。

系统通过麦当劳 MCP 获取：

- 目标门店
- 当前可售菜单
- 商品价格
- 必要的商品 / SKU / 套餐信息

后续朋友只能从该门店真实可售商品中选择。

#### Step 2：设置预算

房主输入总预算，例如：

> ¥50

预算是本局唯一硬限制之一。

#### Step 3：设置游戏时长

MVP 可先提供固定选项：

- 60 秒
- 90 秒
- 120 秒

默认 60 秒即可。

#### Step 4：创建房间

生成：

- Room ID
- 分享链接
- 二维码（如实现成本低）

房主看到：

> **Your lunch is no longer yours.**

然后把房间分享给朋友。

---

## 5. 好友端玩法

### 4.1 加入房间

好友通过链接进入。

MVP 可不要求登录。

进入时填写一个昵称即可：

> Alice / Bob / “你爹”

昵称只用于最后的“罪证展示”。

### 4.2 常规操作：加购

每位玩家可以从当前门店菜单中添加商品。

MVP 推荐规则：

> **每人最多 Add 2 次**

后续可以改成房主可设置 1 / 2 / 3 次，但第一版先固定 2 次。

允许：

- 多人添加相同商品
- 一个人加两份薯条
- 所有人都加甜品
- 最终没有主食
- 只要预算允许，可以出现非常荒谬的组合

系统不判断“是否合理”。

---

## 6. 特殊操作卡

每位朋友进入房间后，随机获得 **1 张一次性特殊卡**。

MVP 只做三种：

### 5.1 DELETE / 一票否决

删除购物车中的一个商品。

效果：

- 商品从购物车消失
- 对应金额重新释放回剩余预算

展示：

> 💥 Bob deleted Big Mac  
> +¥24 budget released

### 5.2 SWAP / 偷梁换柱

选择购物车中的一个商品，并换成另一个当前门店可售商品。

要求：

- 替换后的购物车总价不能超过预算
- 已被 LOCK 的商品不能被 SWAP

### 5.3 LOCK / 钉死

锁定购物车中的一个商品。

被锁定后：

- 不能被 DELETE
- 不能被 SWAP
- 游戏结束前始终保留

展示：

> 🔒 Carol locked McFlurry

---

## 7. 预算规则

预算是整个游戏最重要的实时资源。

界面持续展示：

> **¥37.5 / ¥50**

或：

> **¥12.5 left**

### 规则

任何 ADD / SWAP 操作都必须即时校验：

```text
操作后的总价 <= 房主预算
```

如果超预算：

- 操作不能执行
- 商品按钮禁用，或提示“预算不够”

DELETE 会释放预算。

### 不允许

- 超预算后让 AI 自动删东西
- 游戏结束后再修正预算
- 朋友先随便加，最后房主补差价

预算限制必须在游戏过程中实时成立。

---

## 8. 实时购物车

所有参与者共享同一个实时购物车状态。

购物车至少展示：

- 商品名称
- 数量
- 当前总价
- 剩余预算
- 添加者
- 是否已锁定

示例：

```text
¥41.5 / ¥50

🍟 Large Fries ×2
Added by Alice, Bob

🍦 McFlurry
Added by Bob
🔒 Locked by Carol

🍗 McNuggets
Added by David
```

---

## 9. 游戏结束

倒计时结束后：

- 禁止新的 ADD
- 禁止新的特殊卡操作
- 固定最终购物车状态

进入结算页。

---

## 10. Damage Report / 趣味结算页

这不是普通订单确认页，而是整个产品最重要的传播页面。

标题示例：

> # 🍟 THE DAMAGE

展示：

```text
Your friends spent:

¥49.5 / ¥50

🍟 Fries ×4
🍦 McFlurry ×2
🍗 McNuggets ×1
🥤 Coke Zero ×1

Main dishes: 0
```

然后展示“罪证”：

### Who did this?

```text
🍟 Fries ×2
Added by Alice

🍦 McFlurry
Added by Bob
🔒 Locked by Carol

~~Big Mac~~
Added by Alice
Deleted by David
```

再生成一些趣味统计，例如：

- 😈 最大破坏者：Bob
- 🔒 最顽固餐品：McFlurry
- 🗑️ 最惨餐品：Big Mac
- 💸 预算利用率：99%
- 👥 参与好友：5

MVP 可以先使用规则模板生成，不需要 LLM。

最后可以加一句 AI / 模板吐槽：

> “五个人拿到 ¥50，最后决定你最需要的是四份薯条。”

---

## 11. 最终下单

结算后只有房主看到：

> **接受命运，去结算**

点击后：

### Step 1：再次核验

重新调用 MCP：

- 商品是否仍可售
- 当前价格是否变化
- 商品 / 选配是否仍有效

如果发生库存 / 价格变化：

提示房主：

> 商品状态发生变化，请重新确认。

MVP 可以先回到结果页或展示可替换项。

### Step 2：展示最终真实订单 Preview

例如：

```text
XX 麦当劳

Large Fries ×4
McFlurry ×2
McNuggets ×1
Coke Zero ×1

Total: ¥49.5
```

### Step 3：房主明确确认

只有房主可以执行真实下单。

必须有：

> [确认下单]

朋友没有：

- 支付权限
- create-order 权限
- 最终确认权限

---

## 12. 麦当劳 MCP 使用

MVP 至少需要真实调用：

### 创建游戏前 / 菜单阶段

- 查询附近 / 指定门店
- 查询目标门店可售菜单
- 查询餐品详情 / 价格

### 最终结算阶段

- calculate-price / 官方价格核验
- 如接真实订单：create-order

具体 Tool 名称以当前麦当劳 MCP Server 实际 schema 为准。

### 核心原则

**所有好友看到的候选商品，都必须来自房主选择的目标门店真实可售菜单。**

不能：

- 使用静态写死菜单冒充真实菜单
- 游戏结束后才第一次检查库存

---

## 13. 权限模型

### 房主

可以：

- 选择门店
- 设置预算
- 创建房间
- 分享链接
- 查看游戏
- 最终确认 / 放弃订单

### 好友

可以：

- 加入房间
- 加购
- 使用一次特殊卡
- 查看实时购物车

不能：

- 修改预算
- 修改门店
- 付款
- 创建真实订单
- 代替房主确认

---

## 14. MVP 页面

第一版只需要 4 个核心页面。

### Page 1 — Create Room

内容：

- 选择门店
- 设置预算
- 游戏时长
- Create Room

核心文案：

> **How much do you trust your friends?**

### Page 2 — Share / Waiting Room

内容：

- Room ID
- 分享链接
- 二维码
- 当前加入人数

文案：

> **Your lunch is no longer yours.**

### Page 3 — Game Room

核心：

- 倒计时
- 剩余预算
- 实时购物车
- 菜单
- Add
- 当前玩家的特殊卡
- 实时事件日志

文案：

> **Spend Xuyun's money.**

### Page 4 — Damage Report

内容：

- 最终购物车
- 总价
- 每个商品的操作历史
- 趣味统计
- 接受命运 / 放弃

核心：

> **THE DAMAGE**

---

## 15. 最小数据模型

### Room

```text
id
host_id
store_id
budget
current_total
status
expires_at
created_at
```

status：

```text
waiting
playing
finished
checkout
```

### Player

```text
id
room_id
nickname
is_host
add_tokens_remaining
special_card
special_card_used
```

special_card：

```text
delete
swap
lock
```

### CartItem

```text
id
room_id
product_id
product_name
price
quantity
added_by
locked_by
```

### GameEvent

用于 Damage Report / 实时日志：

```text
id
room_id
player_id
action
product_id
timestamp
metadata
```

action：

```text
add
delete
swap
lock
```

---

## 16. MVP 验收标准

### 必须

- [ ] 房主能选择真实门店
- [ ] 从 MCP 获取该店真实可售菜单
- [ ] 房主能设置预算
- [ ] 创建可分享房间
- [ ] 多个好友可加入
- [ ] 好友可以加购
- [ ] 实时预算不会超支
- [ ] 每个好友随机获得 DELETE / SWAP / LOCK 中的一张
- [ ] 特殊卡只能使用一次
- [ ] LOCK 后不能删除 / 替换
- [ ] 倒计时结束后停止操作
- [ ] 生成 Damage Report
- [ ] 能追踪“谁加了 / 删了 / 锁了什么”
- [ ] 最终订单只能房主确认
- [ ] 下单前重新核验门店商品与价格

### 可以暂缓

- [ ] 真正支付完成
- [ ] 用户登录
- [ ] 历史房间
- [ ] 排行榜
- [ ] 好友头像
- [ ] 音效
- [ ] 复杂动画
- [ ] AI 自动生成吐槽
- [ ] 自定义卡牌
- [ ] 房主设置每人 Add 次数

---

## 17. 开发优先级

### P0 — 跑通单机逻辑

```text
选择门店
→ 获取菜单
→ 设置预算
→ 购物车 ADD
→ DELETE / SWAP / LOCK
→ 预算校验
→ Damage Report
```

### P1 — 多人实时

```text
创建 Room
→ 分享 URL
→ 多人进入
→ 同步 Cart / Budget / GameEvent
```

### P2 — MCP 真实结算

```text
重新查询库存
→ calculate-price
→ Host confirmation
→ create-order
```

### P3 — 打磨传播体验

```text
动画
事件提示
Damage Report 视觉
截图 / 分享
README GIF
```

---

## 18. 最重要的产品原则

> **朋友负责制造混乱，规则负责守住预算，MCP 负责保证现实世界可买，付款永远由房主决定。**

不要为了“实用”把游戏做合理。

如果预算允许：

**100 份薯条也是合法答案。**
