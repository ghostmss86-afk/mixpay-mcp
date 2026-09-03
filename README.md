# mixpay-mcp

**给 AI 编程 agent 的加密货币收款层。** 让 Claude Code / Cursor / OpenCode / OpenClaw / Codex / WorkBuddy / 豆包 在你写网站、小项目时，一句话接入加密货币收款：任意钱包付款，稳定币结算，零密钥，零商户 KYC。

## 为什么是它

- **零密钥架构**：收款只需要一个 `payeeId`（收款账户 UUID），全程无私钥、无签名、无资金控制权暴露——代码可完全开源，agent 可安全调用。
- **无拒付**：链上结算，没有 chargeback。独立开发者收海外客户的钱，不再怕恶意退款。
- **付款方零门槛**：链上钱包、MetaMask、交易所提币、Binance Pay / KuCoin Pay / Gate Pay 都能付，15+ 链 50+ 币，付款人无需注册任何账号。
- **商家不扛币价波动**：默认结算 USDT（strictMode 强制锁定结算资产）。
- **无后端友好**：polling-first 设计，没有服务器的静态站/脚本项目也能用（`wait` 轮询确认）；有后端再升级 callback + 主动查询双确认。

## 三分钟上手

```bash
# 1. 拿 payeeId：注册 https://mixpay.me -> Dashboard -> Settings -> 复制 UUID
#    （或在 agent 里说"帮我配置收款"，agent 会按 PROVISION.md 主动引导你）
# 2. 配置
npx -y -p mixpay-mcp mixpay init --payee-id <你的UUID>
# 3. 冒烟自检（生成 0.01 测试单，人扫码走完整流程）
npx -y -p mixpay-mcp mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test
# 4. 日常收款
npx -y -p mixpay-mcp mixpay pay --amount 99 --currency usd --settle usdt --order-id order-20260903-001
# 5. 确认到账（发货/交付前必须确认）
npx -y -p mixpay-mcp mixpay wait --trace-id <上一步返回的traceId>
```

⚠️ **供应链安全**：CLI 调用永远带 `-p mixpay-mcp`。裸 `npx mixpay` 会执行 npm 上**别人的同名包**。

## 接入各 AI 工具

MCP 是跨工具通用基底，配置片段见 [`adapters/README.md`](adapters/README.md)：

| 工具 | 接入方式 | 配置位置 |
|---|---|---|
| Claude Code | MCP | `.mcp.json` 或 `claude mcp add mixpay -- npx -y mixpay-mcp` |
| Cursor | MCP | `.cursor/mcp.json` |
| OpenCode | MCP | `opencode.json` |
| OpenClaw | MCP | 复用 mcpServers 片段 |
| Codex CLI | MCP | `~/.codex/config.toml` |
| WorkBuddy | MCP | `~/.workbuddy/mcp.json`（加信任后生效） |
| 豆包 | CLI 兜底 | 系统提示里写明三行命令（MCP 支持状态待验证） |

## MCP 工具 / CLI 命令对照

| 能力 | MCP tool | CLI |
|---|---|---|
| 创建一次性收款 | `create_payment` | `mixpay pay` |
| 查询支付结果 | `get_payment` | `mixpay query` |
| 轮询确认到账 | `wait_payment` | `mixpay wait` |
| 查支持的币种 | `list_assets` | `mixpay assets` |
| 静态站收款链接 | —（用 SDK `buildPayLink`） | `mixpay link` |

## 安全模型

- **agent 永远不碰钱**：付款由人扫码完成，agent 只生成链接和查询结果，天然 human-in-the-loop。
- **双确认铁律**：webhook/页面回跳永远不可信，`wait_payment`（主动轮询 API）确认 success 后才能交付。
- **幂等**：`traceId` 防重复支付，`orderId+payeeId` 联合唯一。

## 合规边界

本工具面向**海外收款**场景。加密货币相关业务在中国境内属非法金融活动，请勿用于境内商用收单。

## 开发与测试

```bash
npm test   # 构建 + 20 项资金路径回归测试（node:test，零新增依赖）
```

测试覆盖（`tests/sdk.test.mjs`）：`verify_payment` 四项硬校验的正/反分支（少付、错币种、错收款方、未支付、多付 surplus）、状态机五态映射、`payments_result` 复数端点回归、`strictMode` 布尔 JSON 契约、`expiredTimestamp` 钳制、轮询网络容错（错误永不变成支付状态）、静态链接构造。

CI：`.github/workflows/ci.yml` —— push/PR 自动跑 Node 20/22 矩阵（构建 + 测试 + `npm audit`），repo 推上 GitHub 即生效。

## Roadmap

- [ ] `init` 向导接入 Dashboard OAuth
- [ ] x402 / BTCPay Server 后端适配（协议抽象层已预留：`settlementAssetId` 解析与 API BASE 可配置）
- [ ] Mixin Messenger 机器人收款（聊天内转账，秒到）
- [ ] 订阅/周期收款封装

## 已验证事实（2026-09 实测）

- API 端点：`https://api.mixpay.me/v1`（`one_time_payment` / `payments_result` / `setting/payment_assets`）
- 查询端点是**复数** `payments_result`（单数 404），已用测试锁死
- `strictMode` 必须经 JSON body 传真布尔值；表单字符串会被拒（实测踩坑）
- `callbackUrl` 官方强制 HTTPS，SDK 已做代码级拦截
- USDT 资产 UUID：ERC20 `4d8c508b-91c5-375b-92b0-ee702ed2dac5`（线上 assets 接口比对一致）
- 文档：https://mixpay.me/developers/guides/quote-assets

MIT License.
