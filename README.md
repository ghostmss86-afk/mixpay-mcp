<div align="center">

# mixpay-mcp

**Accept crypto payments from any AI coding agent. Zero keys. Zero chargebacks. Settle in stablecoins.**

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

*Add crypto checkout to your project with one command — your AI agent does the rest.*

[Why](#why) · [Quickstart](#quickstart-60-seconds) · [Works with](#works-with) · [Copy-paste for your agent](#copy-paste-for-your-agent) · [Security](#security-model) · [FAQ](#faq) · [中文速览](#中文速览)

</div>

---

## Why

You ship websites, bots, and tools for overseas clients. Getting paid is the painful part: Stripe needs a merchant account, PayPal freezes funds, crypto gateways demand KYC paperwork and integration weeks.

**mixpay-mcp turns your AI coding agent into a payment integrator.** One command, and your project accepts payments from 50+ cryptocurrencies — paid from any wallet, MetaMask, or exchange (Binance Pay / KuCoin Pay / Gate Pay) — while you settle in USDT, immune to volatility.

| | Cards / Stripe | Typical crypto gateway | **mixpay-mcp** |
|---|---|---|---|
| Merchant onboarding | KYC + underwriting | KYC + contract | **A UUID, 3 minutes** |
| Integration | Days of plumbing | Weeks | **One command via your agent** |
| Chargebacks | Yes (you eat them) | Reduced | **Impossible on-chain** |
| Payer friction | Card forms | Wallet + registration | **Any wallet, no signup** |
| Volatility risk | n/a | Often yours | **Settled in USDT, locked** |
| Keys in your repo | API secrets | API secrets | **None — collection is zero-key** |

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
| Codex CLI | MCP — `~/.codex/config.toml` |
| WorkBuddy | MCP — `~/.workbuddy/mcp.json` |
| Doubao / any other agent | CLI fallback — any agent that can run shell |

Full config snippets in [`adapters/README.md`](adapters/README.md).

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
- **21 regression tests** cover underpayment, wrong payee, wrong currency, endpoint contract, and polling edge cases. CI runs them on every push (Node 20/22 + `npm audit`).

## FAQ

**Is this custodial?** No. Payments settle directly to your Mixin wallet. mixpay-mcp never holds funds and *cannot* move them — there are no transfer tools.

**Do my customers need KYC?** No. Payers use any wallet or exchange, no account required.

**Does it work without a backend?** Yes — polling-first by design. Static sites and scripts confirm payments via `wait`/`verify_payment` without any server.

**Which cryptocurrencies?** 50+ across 15+ chains: BTC, ETH, USDT, USDC, SOL, DOGE, LTC, XMR and more. Payers choose any of them; you receive USDT (or USDC/BTC — your choice).

**Why not just use x402 / Stripe?** Different problem. x402 is machines paying machines; Stripe is cards. mixpay-mcp is for *humans paying your projects* — with no merchant account and no chargebacks. Protocol adapters (x402, BTCPay) are on the roadmap.

**Compliance?** Built for overseas collection. Crypto business activity is not permitted for mainland-China domestic commerce.

## 中文速览

**mixpay-mcp**：让 AI 编程助手（Claude Code / Cursor / Codex / WorkBuddy / 豆包等）一句话给你的项目接入加密货币收款。任意钱包付款（50+ 币种、15+ 链），商家只收 USDT 稳定币；**零密钥、零拒付、付款方免注册、无后端可用**。三条铁律：只收款不付款（无转账工具）、到账只认代码级硬校验（`verify_payment`）、超时只转人工不误判失败。面向海外收款场景。

## Roadmap

- [ ] `provision` — one-command anonymous receiving accounts (Mixin network users, official API)
- [ ] x402 / BTCPay Server backends behind the protocol abstraction
- [ ] Mixin Messenger bot — in-chat payments, instant & free
- [ ] Subscriptions & recurring billing

## Star history note

If this saved you from building a payment integration by hand, a star helps other indie hackers find it. If it didn't, [tell us why](https://github.com/ghostmss86-afk/mixpay-mcp/issues) — that's more valuable.

MIT © 2026 — [mixpay.me/developers](https://mixpay.me/developers/guides/quote-assets) · Not affiliated with MixPay or Mixin Network.
