<div align="center">

# mixpay-mcp

**Accept crypto payments from any AI coding agent. Zero keys. Zero chargebacks. Settle in stablecoins.**

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

*Add crypto checkout to your project with one command — your AI agent does the rest.*

[Why](#why) · [Proof](#proof) · [Quickstart](#quickstart-60-seconds) · [Works with](#works-with) · [Copy-paste for your agent](#copy-paste-for-your-agent) · [Security](#security-model) · [FAQ](#faq) · [中文速览](#中文速览)

</div>

---

## Why

You ship websites, bots, and tools for overseas clients. Getting paid is the painful part: Stripe needs a merchant account, PayPal freezes funds, most crypto gateways demand KYC paperwork and weeks of integration.

**mixpay-mcp turns your AI coding agent into a payment integrator.** One command, and your project accepts payments in 100+ cryptocurrencies across 20+ chains — paid from any wallet, MetaMask, or exchange (Binance Pay / KuCoin Pay / Gate Pay / Bybit Pay) — while you settle in USDT, immune to volatility.

**The gap this fills:** the agent-payments stack is filling up fast — Stripe MCP, PayPal MCP, Coinbase x402, Amazon AgentCore. But every one of them either needs a merchant account + KYC (Stripe/PayPal/Square) or is machine-to-machine (x402). **None serves the indie developer collecting from human customers via their coding agent, with no merchant account and no chargebacks.** That is exactly this repo.

| | Cards / Stripe MCP | x402 | **mixpay-mcp** |
|---|---|---|---|
| Merchant onboarding | KYC + underwriting | Funded agent wallet | **A UUID, 3 minutes** |
| Who pays | Card holders | Other machines | **Any human, any wallet** |
| Chargebacks | Yes (you eat them) | n/a | **Impossible on-chain** |
| Payer friction | Card forms | HTTP 402 flows | **Any wallet / CEX, no signup** |
| Volatility risk | n/a | Stablecoin | **USDT settlement, locked** |
| Keys in your repo | API secrets | Agent wallet keys | **None — collection is zero-key** |

## Proof

- **MixPay rail, real traction** — per MixPay, the rail is an official pay partner of **Binance Pay, Gate Pay, KuCoin Pay, Bybit Pay**, serves **300+ merchants** including OneKey, Coinsbee, and RedteaGO, and KuCoin announced a strategic partnership with MixPay in 2026.
- **Verified contracts, not vibes** — every API behavior in this repo was probed against the live endpoint: the `/payments_result` plural path, boolean `strictMode` in JSON bodies, asset UUIDs cross-checked against the live asset list. Regressions are locked by 21 tests that run on every push.
- **Honest disclosure** — the Mixin ecosystem suffered a ~$200M cloud-provider breach in 2023 (compensation via debt tokens, partially repaid). The rail is alive and processing, but treat it as a *payment channel*, not a vault: sweep to cold storage. This repo is designed so your exposure is a channel balance, never custody.

## Quickstart (60 seconds)

```bash
# 1. Get your payeeId: register at https://mixpay.me → Dashboard → Settings → copy UUID
# 2. Configure
npx -y -p mixpay-mcp mixpay init --payee-id <your-uuid>
# 3. Smoke test: creates a 0.01 order — scan it with any wallet
npx -y -p mixpay-mcp mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test
# 4. Confirm settlement (do this before delivering anything)
npx -y -p mixpay-mcp mixpay wait --trace-id <traceId-from-step-3>
```

⚠️ Always `-p mixpay-mcp`. Bare `npx mixpay` runs someone else's package.

## Works with

| Tool | Integration |
|---|---|
| Claude Code | MCP — `claude mcp add mixpay -- npx -y mixpay-mcp` |
| Cursor | MCP — `.cursor/mcp.json` |
| OpenCode / OpenClaw | MCP — `opencode.json` |
| **Codex CLI / IDE extension / ChatGPT desktop** | **one shared config** — see below |
| WorkBuddy | MCP — `~/.workbuddy/mcp.json` |
| Doubao / any other agent | CLI fallback — any agent that can run shell |

**Codex (all three surfaces, one config).** Per OpenAI's docs, Codex CLI, the IDE extension, and the ChatGPT desktop app share `~/.codex/config.toml`:

```toml
[mcp_servers.mixpay]
command = "npx"
args = ["-y", "mixpay-mcp"]
env = { MIXPAY_PAYEE_ID = "<your-uuid>" }
```

Or one line on the CLI: `codex mcp add mixpay --env MIXPAY_PAYEE_ID=<your-uuid> -- npx -y mixpay-mcp`. Verify with `codex mcp list`, then `/mcp` inside the TUI. Caveats (official): ChatGPT **web** doesn't read local Codex configs (hosted plugins only); Codex **cloud** can't proxy local stdio MCP servers yet — run locally, delegate the rest.

Full config snippets for every tool: [`adapters/README.md`](adapters/README.md).

## Copy-paste for your agent

The fastest way to use this repo: paste one of these into your agent.

**Add crypto checkout to a project:**
```text
Install the mixpay-mcp MCP server and add crypto payment to this project.
Payee UUID: <your-payeeId>. Use one-time payment codes, settle in USDT,
confirm via verify_payment before fulfilling any order.
```

**Collect a payment right now (no project needed):**
```text
Use mixpay (npx -y -p mixpay-mcp mixpay pay) to create a $49 USD payment
link settling in USDT for order-1001, give me the link, and wait for
confirmation before marking the order paid.
```

That's the whole integration. Your agent handles creation, confirmation, and double-verification — you never touch private keys, because collection doesn't need any.

## Security model

- **Zero-key architecture** — collecting needs only a public `payeeId`. No private keys, no signing, nothing to leak. Your repo stays publishable.
- **Delivery gate** — `verify_payment` is a code-level check (status + payeeId + amount + currency), implementing MixPay's official security guidelines. LLM judgment sits *outside* the money path.
- **No transfer tools, ever** — the MCP server is collection-only by design. Outflow stays in the local CLI with passphrase + PIN.
- **Double confirmation** — webhooks and page redirects are treated as hints; only an active API query marks an order paid. Network errors never become fake "unpaid" verdicts.
- **Prompt-injection hardened** — every API payload entering agent context is labeled untrusted data; payer remarks are a known injection vector and are fenced by skill rules.
- **21 regression tests** cover underpayment, wrong payee, wrong currency, endpoint contracts, and polling edge cases. CI runs them on every push (Node 20/22 + `npm audit`).

## FAQ

**Is this custodial?** No. Payments settle directly to your wallet. mixpay-mcp never holds funds and *cannot* move them — there are no transfer tools.

**Do my customers need KYC?** No. Payers use any wallet or exchange, no account required.

**Does it work without a backend?** Yes — polling-first by design. Static sites and scripts confirm payments via `wait`/`verify_payment` without any server.

**Which cryptocurrencies?** 100+ across 20+ chains: BTC, ETH, USDT, USDC, SOL, DOGE, LTC, XMR, TON and more (27 stablecoins supported for settlement). Payers choose any of them; you receive USDT (or USDC/BTC — your choice).

**Why not just use Stripe MCP / x402?** Different rails for different jobs. Stripe MCP moves cards and needs a Stripe account; x402 is machines paying machines. mixpay-mcp is for *humans paying your projects* — no merchant account, no chargebacks, stablecoin settlement.

**Compliance?** Built for overseas collection. Crypto business activity is not permitted for mainland-China domestic commerce.

## 中文速览

**mixpay-mcp**：让 AI 编程助手（Claude Code / Cursor / Codex 三端 / WorkBuddy / 豆包等）一句话给你的项目接入加密货币收款。任意钱包付款（100+ 币种、20+ 链，含 Binance/KuCoin/Gate/Bybit Pay），商家只收 USDT 等稳定币；**零密钥、零拒付、付款方免注册、无后端可用**。

**为什么是空白位**：Stripe/PayPal 官方 MCP 都要商户账号 + KYC，x402 是机器付机器——「独立开发者经由编程 agent 收人类的加密货币付款」没有现成方案，这个仓库填的就是这个位置。

**收款轨道的可靠性**：MixPay 官方口径为 Binance/Gate/KuCoin/Bybit Pay 官方合作支付伙伴，服务 OneKey、Coinsbee、RedteaGO 等 300+ 商户。我们如实披露 Mixin 生态 2023 年的 $2 亿安全事件——所以本仓库按「支付通道、非金库」设计：只收款不付款，余额定期归集冷存。

**三条安全铁律**：只收款不付款（无转账工具）；到账只认代码级硬校验（`verify_payment`，LLM 判断不在资金路径上）；超时只转人工不误判失败。

## Roadmap

- [ ] `provision` — one-command anonymous receiving accounts (Mixin network users, official API)
- [ ] x402 / BTCPay Server backends behind the protocol abstraction
- [ ] Mixin Messenger bot — in-chat payments, instant & free
- [ ] Subscriptions & recurring billing

## Star history note

If this saved you from building a payment integration by hand, a star helps other indie hackers find it. If it didn't, [tell us why](https://github.com/ghostmss86-afk/mixpay-mcp/issues) — that's more valuable.

MIT © 2026 — [MixPay developer docs](https://mixpay.me/developers/guides/quote-assets) · Not affiliated with MixPay or Mixin Network.
