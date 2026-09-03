<div align="center">

# mixpay-mcp

[English](./README.md) | [简体中文](./README.zh-CN.md)

**让你的 AI 编程助手一条命令给项目接入加密货币收款。**
客户用任意加密货币付款，你收 USDT，随时提现。

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

</div>

---

## 这适合你吗？

以下描述命中两条以上，这个工具就是为你做的：

- 你给**中国大陆以外的客户**做网站、机器人、工具，想收加密货币。
- 你没有（或不想折腾）Stripe/PayPal 商户账号——KYC 材料、冻结资金、拒付风险。
- 你已经在用 AI 编程助手（Claude Code、Cursor、Codex、WorkBuddy、豆包…），希望集成这件事交给它干。

一条都不中？那这个仓库帮不到你，不用浪费时间。

## 你怎么收到钱

1. 客户打开你的收款链接，用**他喜欢的任意加密货币**付款——BTC、ETH、USDT、SOL、DOGE…任意钱包，甚至直接用 Binance/KuCoin/Gate/Bybit 余额。
2. 款项自动兑换，**USDT 直接进你的钱包**——波动的币价跟你无关。
3. 你**随时可以提现**，用你自己的钱包，在你自己的电脑上操作。这一步属于你，不属于任何 AI。

**AI 的职责止于「生成收款链接」和「确认钱到了」。** 它没有移动你资金的能力——不是被限制了，而是移动资金的工具在它里面根本不存在。

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

完整配置片段：[`adapters/README.md`](adapters/README.md)。Codex 专用：`codex mcp add mixpay --env MIXPAY_PAYEE_ID=<uuid> -- npx -y mixpay-mcp`——一份配置同时服务 CLI、IDE 扩展和 ChatGPT 桌面版。

## 这样说，AI 就会用它

把对应的话直接说给你的编程助手——这些就是这个工具设计来回应的触发场景：

- 「我需要在我的网站**收加密货币**」/ "I need to accept crypto payments"
- 「**不办商户账号怎么收 USDT**」/ "How do I get paid in USDT without a merchant account"
- 「给这个项目加一个**收款链接 / 支付功能**」/ "Add a payment link / checkout to this project"
- 「客户在海外，**跨境收款**太麻烦」/ "My client is overseas and payment is a nightmare"

## 粘贴给你的 agent 即可集成

把下面任意一段贴进编程助手：

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

## 你的钱安全吗？

**AI 会偷走你的资金吗？** 不会。移动资金的工具在 agent 里根本不存在——没有东西可被攻击、被注入、被滥用。

**钱能取出来吗？** 能，随时。提现是你从自己钱包里做的正常操作——刻意保留在人的手里、在你自己的机器上完成。

**收款轨道被黑了怎么办？** 该问——这里是完整记录。2023 年 9 月，攻击者攻破了 Mixin 生态*云服务商*的数据库，从热钱包盗走约 $2 亿。事后的响应与整改：当日暂停充提；Google 应急响应团队与慢雾（SlowMist）介入调查；**旧的提现基础设施被永久停用**，用户整体迁移到重建后的新网络；热钱包托管被 **Mixin Safe** 取代——一套分布式冷架构（比特币多签 + 时间锁 + 去中心化 MPC），专门针对这次事故的攻击面而设计；密钥改由 TIP 去中心化密钥网络分片保管、TEE 签名，并持续进行安全审计。赔付方面：受影响用户获最高 50% 稳定币赔付 + Mixin 债务代币（MDT）——其中约 $2300 万的 MDTu 部分计划于 2026 年 9 月全额偿清，但 MDTb/MDTe 部分尚无时间表，这一点如实说明。此后未再发生新的安全事件（2026 年 2 月被盗币的转移是原始黑客的链上动作，不是 Mixin 被再次攻破）。

所以这个工具按「支付通道，不是金库」构建：用它收款，定期把资金转去你自己的冷钱包。你的敞口始终很小——而且可以独立验证。

**会被拒付吗？** 不会。链上支付不可逆——自由职业者最怕的「干完活被撤回付款」在这里不存在。

**客户要 KYC 吗？** 不要。任意钱包或交易所，免注册。

**没有后端能用吗？** 能。静态站和脚本用 `wait`/`verify_payment` 确认到账——21 项自动化测试覆盖了边界情况（少付、打错钱包、网络故障），每次改动 CI 都会重跑。

**和 Stripe MCP / x402 有什么不同？** Stripe 走银行卡、要商户账号；x402 是机器付机器。这里是「人类付你的项目」——不要商户账号，稳定币结算。

**合规？** 面向海外收款场景；不用于中国大陆境内商用。

## 路线图

- [ ] `sweep`——一条命令把已结算资金提现到冷钱包（你自己运行，口令 + PIN）
- [ ] `provision`——一条命令创建匿名收款账号
- [ ] x402 / BTCPay 后端 · Mixin Messenger 聊天内支付 · 订阅收款

---

如果它帮你省掉了一次支付集成的苦活，一个 star 能帮更多独立开发者找到它。如果没有，[提个 issue](https://github.com/ghostmss86-afk/mixpay-mcp/issues)——那更有价值。

MIT © 2026 · 基于 [MixPay 开发者 API](https://mixpay.me/developers/guides/quote-assets) · 与 MixPay / Mixin Network 无隶属关系。
