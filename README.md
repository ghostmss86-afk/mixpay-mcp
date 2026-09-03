<div align="center">

# mixpay-mcp

[English](./README.md) | [简体中文](./README.zh-CN.md)

**Accept crypto payments from any AI coding agent. Zero keys. Zero chargebacks. Settle in stablecoins.**

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

</div>

---

## What it is

An MCP server + CLI that lets AI coding agents (Claude Code, Cursor, Codex, OpenCode, OpenClaw, WorkBuddy, Doubao) add crypto payment collection to any project in one command. Payers can use 100+ cryptocurrencies across 20+ chains from any wallet or exchange (Binance Pay, KuCoin Pay, Gate Pay, Bybit Pay). You settle in USDT.

**What it is not:** the agent never touches outflow. The MCP server exposes no transfer tools — moving money is something an AI *cannot* do here, by design.

**How the money flows:** payer pays in any crypto → MixPay settles USDT directly into your wallet → you withdraw or sweep to cold storage yourself, on your own machine, with passphrase + PIN. The agent's job ends at "create payment link" and "verify settlement" — the money never routes through AI hands.

## Why it exists

Getting paid as an indie developer shipping for overseas clients is the painful part: Stripe needs a merchant account, PayPal freezes funds, crypto gateways demand KYC and weeks of integration. The 2026 agent-payments stack (Stripe MCP, PayPal MCP, Coinbase x402, AWS AgentCore) either requires merchant onboarding or targets machine-to-machine payments.

**The unfilled slot: an indie developer collecting from human customers through their coding agent — no merchant account, no chargebacks, stablecoin settlement.** That is this repo.

| | Cards / Stripe MCP | x402 | **mixpay-mcp** |
|---|---|---|---|
| Merchant onboarding | KYC + underwriting | Funded agent wallet | **A UUID, 3 minutes** |
| Who pays | Card holders | Other machines | **Any human, any wallet** |
| Chargebacks | Yes (you eat them) | n/a | **Impossible on-chain** |
| Payer friction | Card forms | HTTP 402 flows | **Any wallet / CEX, no signup** |
| Volatility risk | n/a | Stablecoin | **USDT settlement, locked** |
| Keys in your repo | API secrets | Agent wallet keys | **None — collection is zero-key** |

## Proof

- **The payment rail has real traction** — per MixPay, it is an official pay partner of Binance Pay, Gate Pay, KuCoin Pay, and Bybit Pay, serving 300+ merchants including OneKey, Coinsbee, and RedteaGO. KuCoin announced a strategic partnership in 2026.
- **Verified contracts, not vibes** — every API behavior here was probed against the live endpoint: the `/payments_result` plural path, boolean `strictMode` in JSON bodies, asset UUIDs cross-checked against the live asset list. Locked by 21 regression tests running on every push (Node 20/22 + `npm audit`).
- **Honest disclosure** — the Mixin ecosystem had a ~$200M cloud-provider breach in 2023 (partially repaid via debt tokens). So this repo is built as a *payment channel, not a vault*: collection only, sweep to cold storage regularly. Your exposure is a channel balance, never custody.

## Quickstart (60 seconds)

Prerequisite: a payeeId UUID — register at [mixpay.me](https://mixpay.me) → Dashboard → Settings → copy it (3 minutes, no merchant KYC).

```bash
npx -y -p mixpay-mcp mixpay init --payee-id <your-uuid>          # configure
npx -y -p mixpay-mcp mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test   # test order
npx -y -p mixpay-mcp mixpay wait --trace-id <traceId>            # confirm settlement
```

⚠️ Always `-p mixpay-mcp`. Bare `npx mixpay` runs someone else's package.

## Works with

| Tool | Integration |
|---|---|
| Claude Code | MCP — `claude mcp add mixpay -- npx -y mixpay-mcp` |
| Cursor | MCP — `.cursor/mcp.json` |
| OpenCode / OpenClaw | MCP — `opencode.json` |
| Codex CLI / IDE extension / ChatGPT desktop | **one shared config** — `~/.codex/config.toml` |
| WorkBuddy | MCP — `~/.workbuddy/mcp.json` |
| Doubao / any other agent | CLI fallback — any agent that can run shell |

Full snippets: [`adapters/README.md`](adapters/README.md). For Codex: `codex mcp add mixpay --env MIXPAY_PAYEE_ID=<uuid> -- npx -y mixpay-mcp` — one config serves CLI, IDE extension, and the ChatGPT desktop app (ChatGPT web and Codex cloud don't read local configs).

## Copy-paste for your agent

Paste into any coding agent — that's the whole integration:

```text
Install the mixpay-mcp MCP server and add crypto payment to this project.
Payee UUID: <your-payeeId>. Use one-time payment codes, settle in USDT,
confirm via verify_payment before fulfilling any order.
```

```text
Use mixpay (npx -y -p mixpay-mcp mixpay pay) to create a $49 USD payment
link settling in USDT for order-1001, give me the link, and wait for
confirmation before marking the order paid.
```

## Security model

- **Zero-key** — collecting needs only a public `payeeId`. Nothing to leak; your repo stays publishable.
- **Outflow is human-only** — the agent has no ability to move money. Sweeping funds onward is a deliberate manual step on your machine (CLI + passphrase + PIN), kept off the AI path by design.
- **Delivery gate** — `verify_payment` does a code-level check (status + payeeId + amount + currency). LLM judgment sits *outside* the money path.
- **No transfer tools, ever** — collection-only MCP server; the agent cannot move money. Sweeping onward is yours, done locally with passphrase + PIN.
- **Double confirmation** — webhooks are hints; only an active API query marks an order paid. Network errors never become fake verdicts.
- **Prompt-injection hardened** — API payloads entering agent context are labeled untrusted; payer remarks are fenced by skill rules.

## FAQ

**Custodial?** No. Funds settle to your wallet; mixpay-mcp cannot move them.
**Customer KYC?** None. Any wallet or exchange works, no signup.
**Backend required?** No — polling-first; static sites confirm via `wait`/`verify_payment`.
**Which cryptos?** 100+ across 20+ chains (BTC, ETH, USDT, USDC, SOL, DOGE, XMR, TON…); 27 stablecoins for settlement.
**Stripe MCP / x402 instead?** Different rails: Stripe moves cards (needs an account), x402 is machine-to-machine. This is humans paying your projects.
**Compliance?** Built for overseas collection; not for mainland-China domestic commerce.

## Roadmap

- [ ] `sweep` — local CLI command to withdraw/sweep settled funds to cold storage (passphrase + PIN, human-operated; withdraw via MixPay to your on-chain address)
- [ ] `provision` — one-command anonymous receiving accounts (Mixin network users, official API)
- [ ] x402 / BTCPay Server backends behind the protocol abstraction
- [ ] Mixin Messenger bot — in-chat payments, instant & free
- [ ] Subscriptions & recurring billing

---

If this saved you a payment integration, a star helps other indie hackers find it. If it didn't, [open an issue](https://github.com/ghostmss86-afk/mixpay-mcp/issues) — that's more valuable.

MIT © 2026 · Built on the [MixPay developer API](https://mixpay.me/developers/guides/quote-assets) · Not affiliated with MixPay or Mixin Network.
