<div align="center">

# mixpay-mcp

[English](./README.md) | [简体中文](./README.zh-CN.md)

**让 AI 编程助手一句话接入加密货币收款。零密钥。零拒付。稳定币结算。**

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

</div>

---

## 这是什么

一套 MCP server + CLI，让 AI 编程助手（Claude Code、Cursor、Codex、OpenCode、OpenClaw、WorkBuddy、豆包）一条命令给任何项目接入加密货币收款。付款方可用 20+ 链上的 100+ 币种，来自任意钱包或交易所（Binance Pay、KuCoin Pay、Gate Pay、Bybit Pay）。你只收 USDT。

**它不是什么**：它永远不会把钱转出去。MCP server 按设计只收款——没有转账工具、没有托管、没有任何私钥。

## 为什么存在

独立开发者给海外客户交付项目，收款是最痛的一环：Stripe 要商户账号，PayPal 冻结资金，传统加密网关要 KYC 和数周集成。2026 年的 agent 支付版图（Stripe MCP、PayPal MCP、Coinbase x402、AWS AgentCore）要么要商户入驻，要么是机器对机器。

**空着的位置：独立开发者经由编程助手收人类客户的付款——不要商户账号、没有拒付、稳定币结算。** 这个仓库填的就是它。

| | 银行卡 / Stripe MCP | x402 | **mixpay-mcp** |
|---|---|---|---|
| 商户入驻 | KYC + 审核 | 充值的 agent 钱包 | **一个 UUID，3 分钟** |
| 谁来付款 | 持卡人 | 其他机器 | **任何人、任何钱包** |
| 拒付风险 | 有（你承担） | 不适用 | **链上结算，不可能拒付** |
| 付款方门槛 | 卡表单 | HTTP 402 流程 | **任意钱包/交易所，免注册** |
| 币价波动 | 不适用 | 稳定币 | **USDT 结算，强制锁定** |
| 仓库里的密钥 | API secret | agent 钱包私钥 | **没有——收款零密钥** |

## 证明

- **收款轨道有真实业务**——按 MixPay 官方口径，它是 Binance Pay、Gate Pay、KuCoin Pay、Bybit Pay 的官方合作支付伙伴，服务 OneKey、Coinsbee、RedteaGO 等 300+ 商户，KuCoin 2026 年官宣战略合作。
- **实测过的契约，不是感觉**——本仓库所有 API 行为都在线上端点验证过：`/payments_result` 复数路径、JSON body 里的布尔 `strictMode`、与线上资产列表核对的资产 UUID。21 项回归测试在每次 push 时运行（Node 20/22 + `npm audit`）。
- **如实披露**——Mixin 生态 2023 年发生过约 $2 亿的云服务商被盗事件（已通过债务代币部分赔付）。所以本仓库按「支付通道、非金库」构建：只收款，定期归集冷存。你的敞口是通道余额，永远不是托管。

## 60 秒上手

前提：一个 payeeId UUID——在 [mixpay.me](https://mixpay.me) 注册 → Dashboard → Settings → 复制（3 分钟，无商户 KYC）。

```bash
npx -y -p mixpay-mcp mixpay init --payee-id <你的UUID>          # 配置
npx -y -p mixpay-mcp mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test   # 测试单
npx -y -p mixpay-mcp mixpay wait --trace-id <traceId>            # 确认到账
```

⚠️ 必须带 `-p mixpay-mcp`。裸 `npx mixpay` 会执行 npm 上别人的同名包。

## 支持的工具

| 工具 | 接入方式 |
|---|---|
| Claude Code | MCP — `claude mcp add mixpay -- npx -y mixpay-mcp` |
| Cursor | MCP — `.cursor/mcp.json` |
| OpenCode / OpenClaw | MCP — `opencode.json` |
| Codex CLI / IDE 扩展 / ChatGPT 桌面版 | **一份共享配置** — `~/.codex/config.toml` |
| WorkBuddy | MCP — `~/.workbuddy/mcp.json` |
| 豆包 / 其他任何 agent | CLI 兜底 — 能跑 shell 就能用 |

完整配置片段：[`adapters/README.md`](adapters/README.md)。Codex 专用：`codex mcp add mixpay --env MIXPAY_PAYEE_ID=<uuid> -- npx -y mixpay-mcp`——一份配置同时服务 CLI、IDE 扩展和 ChatGPT 桌面版（ChatGPT 网页版与 Codex 云端不读本地配置）。

## 粘贴给你的 agent 即可

把下面任意一段贴进编程助手——集成就完成了：

```text
安装 mixpay-mcp MCP server，给这个项目加上加密货币收款。
收款 UUID：<你的payeeId>。使用一次性支付码，结算 USDT，
交付前必须通过 verify_payment 确认到账。
```

```text
用 mixpay（npx -y -p mixpay-mcp mixpay pay）创建一张 49 美元的
支付链接（USDT 结算），订单号 order-1001，把链接给我，确认到账后
再标记订单完成。
```

## 安全模型

- **零密钥**——收款只需要公开的 `payeeId`。没有可泄漏的东西，仓库可以放心公开。
- **交付闸门**——`verify_payment` 做代码级校验（状态 + 收款方 + 金额 + 币种）。LLM 的判断在资金路径之外。
- **永远没有转账工具**——MCP server 只收款；出金只在本机 CLI，口令 + PIN 双因素。
- **双确认**——webhook 和页面回跳只是提示；只有主动 API 查询才判定到账。网络错误永远不会变成假的「未支付」结论。
- **抗提示注入**——进入 agent 上下文的 API 数据都标注为不可信；付款人备注这一经典注入入口被技能规则隔离。

## FAQ

**有托管吗？** 没有。资金直接结算到你的钱包，mixpay-mcp 无法动它们。
**客户要 KYC 吗？** 不要。任意钱包或交易所直接付，免注册。
**没有后端能用吗？** 能——轮询优先设计，静态站用 `wait`/`verify_payment` 确认。
**支持哪些币？** 20+ 链 100+ 币（BTC、ETH、USDT、USDC、SOL、DOGE、XMR、TON…）；27 种稳定币可用于结算。
**用 Stripe MCP / x402 不行吗？** 轨道不同：Stripe 走卡（要账号），x402 是机器对机器。这里是「人类付你的项目」。
**合规？** 面向海外收款场景；不用于中国大陆境内商用。

## 路线图

- [ ] `provision`——一条命令创建匿名收款账号（Mixin 网络用户，官方 API）
- [ ] x402 / BTCPay Server 后端适配（协议抽象层）
- [ ] Mixin Messenger 机器人——聊天内转账，秒到免费
- [ ] 订阅与周期收款

---

如果它帮你省掉了一次支付集成的苦活，一个 star 能帮更多独立开发者找到它。如果没有，[提个 issue](https://github.com/ghostmss86-afk/mixpay-mcp/issues)——那更有价值。

MIT © 2026 · 基于 [MixPay 开发者 API](https://mixpay.me/developers/guides/quote-assets) · 与 MixPay / Mixin Network 无隶属关系。
