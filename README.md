<div align="center">

# mixpay-mcp

[English](./README.md) | [简体中文](./README.zh-CN.md)

**Let your AI coding agent add crypto payment to any project — in one command.**
Your customers pay in any crypto. You receive USDT. You withdraw anytime.

[![CI](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ghostmss86-afk/mixpay-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](package.json)
[![tests](https://img.shields.io/badge/tests-21%20passing-success)](tests/sdk.test.mjs)

</div>

---

## Is this for you?

You'll benefit if two or more of these describe you:

- You build websites, bots, or tools for clients **outside mainland China**, and want to get paid in crypto.
- You don't have (or don't want) a Stripe/PayPal merchant account — KYC paperwork, frozen funds, chargebacks.
- You already work with an AI coding agent (Claude Code, Cursor, Codex, WorkBuddy, Doubao…) and want it to handle the integration for you.

If none of these fit, this repo won't help you — no hard feelings.

## How you get paid

1. A customer opens your payment link and pays in **any crypto they like** — BTC, ETH, USDT, SOL, DOGE… from any wallet or even Binance/KuCoin/Gate/Bybit.
2. The payment auto-converts and **USDT lands in your wallet** — you never touch volatile coins.
3. You **withdraw whenever you want**, from your own wallet, on your own machine. That step belongs to you, not to any AI.

**The AI's job ends at "create payment link" and "confirm the money arrived."** It has no ability to move your funds — not because it's restricted, but because the tools for that simply don't exist inside it.

## 60-second setup

Prerequisite: a payeeId UUID — register at [mixpay.me](https://mixpay.me) → Dashboard → Settings → copy it (3 minutes, no merchant KYC).

**Install (from source — works today):**

```bash
git clone https://github.com/ghostmss86-afk/mixpay-mcp && cd mixpay-mcp
npm ci && npm link        # makes `mixpay` and `mixpay-mcp` available globally
```

**Configure and smoke-test:**

```bash
mixpay init --payee-id <your-uuid>          # configure
mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test   # test order
mixpay wait --trace-id <traceId>            # confirm the money arrived
```

> Once the package is on npm, `npx -y -p mixpay-mcp mixpay …` works anywhere without cloning. ⚠️ Always `-p mixpay-mcp` — bare `npx mixpay` runs someone else's package.

## Works with

| Tool | Integration |
|---|---|
| Claude Code | MCP — `claude mcp add mixpay -- npx -y mixpay-mcp` |
| Cursor | MCP — `.cursor/mcp.json` |
| OpenCode / OpenClaw | MCP — `opencode.json` |
| Codex CLI / IDE extension / ChatGPT desktop | **one shared config** — `~/.codex/config.toml` |
| WorkBuddy | MCP — `~/.workbuddy/mcp.json` |
| Doubao / any other agent | CLI fallback — any agent that can run shell |

Full snippets: [`adapters/README.md`](adapters/README.md). For Codex: `codex mcp add mixpay --env MIXPAY_PAYEE_ID=<uuid> -- npx -y mixpay-mcp` — one config serves CLI, IDE extension, and the ChatGPT desktop app.

## Use this when

Copy the matching line into your agent, or use these words when asking it for help — they're the triggers this tool is built to answer:

- "I need to **accept crypto payments** on my site" / 我想在项目里**收加密货币**
- "**How do I get paid in USDT** without a merchant account" / 不办商户账号怎么收 **USDT**
- "Add a **payment link / checkout** to this project" / 给这个项目加一个**收款链接**
- "My client is overseas and bank transfer is a nightmare" / 客户在海外，**跨境收款**太麻烦

## Copy-paste for your agent

The fastest way to integrate — paste into any coding agent:

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

## Is your money safe?

**Can the AI steal your funds?** No. The tools for moving money don't exist inside the agent — there is nothing to hack, prompt-inject, or misuse.

**Can you get your money out?** Yes, anytime. Withdrawal is a normal step you do yourself from your own wallet — deliberately kept in human hands, on your machine.

**What if the rail gets hacked?** Fair question — here's the full record. In Sept 2023, attackers compromised the *cloud provider's* database of the Mixin ecosystem and drained ~$200M from hot wallets. The response and fixes: deposits/withdrawals were suspended the same day; Google's incident-response team and SlowMist ran the investigation; the legacy withdrawal infrastructure was **permanently disabled** and users migrated to a rebuilt network; hot-wallet custody was replaced by **Mixin Safe**, a distributed cold architecture (Bitcoin multisig + timelock + decentralized MPC) designed specifically to survive that class of compromise; keys are now sharded via the TIP decentralized key network with TEE signing, under an ongoing audit process. On accountability: affected users were offered up to 50% in stablecoins plus Mixin Debt Tokens — the ~$23M MDTu tranche is on track for full repayment by Sept 2026, though the MDTb/MDTe tranches still have no schedule. No new breach has occurred since (a Feb 2026 movement of stolen coins was the original attacker, not a Mixin compromise).

So this tool is built as a *payment channel, not a vault*: you collect through it and move funds to your own cold storage regularly. Your exposure stays small — and independently verifiable.

**Will you be charged back?** No. On-chain payments are final — the classic freelance nightmare disappears.

**Do customers need KYC?** No. Any wallet or exchange, no signup.

**No backend required.** Static sites and scripts confirm payments via `wait`/`verify_payment` — 21 automated tests cover the edge cases (underpayment, wrong wallet, network failures), and CI re-runs them on every change.

**How is this different from Stripe MCP or x402?** Stripe moves cards and needs a merchant account. x402 is machines paying machines. This is for humans paying your projects — no merchant account, stablecoin settlement.

**Compliance?** Built for overseas collection; not for mainland-China domestic commerce.

## Roadmap

- [ ] `sweep` — one command to withdraw settled funds to cold storage (you run it, passphrase + PIN)
- [ ] `provision` — one command to create anonymous receiving accounts
- [ ] x402 / BTCPay backends · Mixin Messenger in-chat payments · subscriptions

---

If this saved you a payment integration, a star helps other indie hackers find it. If it didn't, [open an issue](https://github.com/ghostmss86-afk/mixpay-mcp/issues) — that's more valuable.

MIT © 2026 · Built on the [MixPay developer API](https://mixpay.me/developers/guides/quote-assets) · Not affiliated with MixPay or Mixin Network.
