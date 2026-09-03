#!/usr/bin/env node
/**
 * MixPay CLI — the universal fallback entry that ANY agent capable of
 * running shell commands can use (Doubao, CI, cron, plain scripts).
 *
 * Commands:
 *   mixpay init    --payee-id <uuid> [--callback-url <url>]   write .env
 *   mixpay pay     --amount 10 [--currency usd] [--settle usdt] [--order-id x] [--remark x]
 *   mixpay query   --trace-id x | --order-id x
 *   mixpay wait    --trace-id x [--timeout 300] [--interval 5]
 *   mixpay assets
 */
import {
  createOneTimePayment,
  getPaymentResult,
  pollPayment,
  listPaymentAssets,
  buildPayLink,
} from "./sdk.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function loadEnv(): void {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

function payeeId(explicit?: string): string {
  const id = explicit ?? process.env.MIXPAY_PAYEE_ID;
  if (!id) {
    console.error("缺少 payeeId。先运行: npx -y -p mixpay-mcp mixpay init --payee-id <你的收款UUID>");
    process.exit(1);
  }
  return id;
}

loadEnv();
const [cmd, ...rest] = process.argv.slice(2);
const f = parseFlags(rest);

try {
  switch (cmd) {
    case "init": {
      const pid = f["payee-id"];
      if (!pid) {
        console.error("用法: mixpay init --payee-id <uuid> [--callback-url <https://...>]");
        process.exit(1);
      }
      // Merge instead of overwrite: preserve unrelated keys a project may
      // already keep in .env (DB URLs, API keys, ...). Only MIXPAY_* is ours.
      const updates: Record<string, string> = { MIXPAY_PAYEE_ID: pid };
      if (f["callback-url"]) updates.MIXPAY_CALLBACK_URL = f["callback-url"];
      const existing = existsSync(".env") ? readFileSync(".env", "utf8").split("\n") : [];
      const seen = new Set<string>();
      const merged = existing
        .map((line) => {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
          if (m && updates[m[1]] !== undefined) {
            seen.add(m[1]);
            return `${m[1]}=${updates[m[1]]}`;
          }
          return line;
        })
        .filter((line) => line.trim() !== "" || true);
      for (const [k, v] of Object.entries(updates)) {
        if (!seen.has(k)) merged.push(`${k}=${v}`);
      }
      writeFileSync(".env", merged.filter((l) => l !== "").join("\n") + "\n");
      console.log("已写入 .env（保留原有其他变量）");
      console.log("自检（生成 0.01 USDT 计价的测试单，人工扫码走一遍完整流程）:");
      console.log("  npx -y -p mixpay-mcp mixpay pay --amount 0.01 --currency usd --settle usdt --remark smoke-test");
      break;
    }
    case "pay": {
      if (!f.amount) {
        console.error("用法: mixpay pay --amount 10 [--currency usd] [--settle usdt] [--order-id x] [--remark x]");
        process.exit(1);
      }
      const p = await createOneTimePayment({
        payeeId: payeeId(f["payee-id"]),
        quoteAmount: f.amount,
        quoteAssetId: f.currency ?? "usd",
        settlementAssetId: f.settle ?? "usdt",
        orderId: f["order-id"],
        remark: f.remark,
        expiredSeconds: f.expire ? Number(f.expire) : undefined,
        callbackUrl: f["callback-url"] ?? process.env.MIXPAY_CALLBACK_URL,
        returnTo: f["return-to"],
      });
      console.log(`支付链接: ${p.paymentUrl}`);
      console.log(`traceId:  ${p.traceId}`);
      if (p.orderId) console.log(`orderId:  ${p.orderId}`);
      console.log(`确认到账: npx mixpay wait --trace-id ${p.traceId}`);
      break;
    }
    case "link": {
      if (!f.amount || !f["payee-id"]) {
        console.error("用法: mixpay link --payee-id <uuid> --amount 10 [--currency usd] [--settle usdt]");
        process.exit(1);
      }
      const url = buildPayLink({
        payeeId: f["payee-id"],
        quoteAmount: f.amount,
        quoteAssetId: f.currency,
        settlementAssetId: f.settle,
        remark: f.remark,
      });
      console.log(url);
      console.log("");
      console.log("⚠️  注意：link 模式无 traceId/orderId 绑定，无法用 verify_payment 做订单级硬校验。");
      console.log("    只用于打赏/捐赠等无需交付核验的场景；订单交付一律用 mixpay pay（一次性支付码）。");
      break;
    }
    case "query": {
      if (!f["trace-id"] && !f["order-id"]) {
        console.error("用法: mixpay query --trace-id x | --order-id x（二选一）");
        process.exit(1);
      }
      const pid = f["payee-id"] ?? process.env.MIXPAY_PAYEE_ID;
      if (f["order-id"] && !pid) {
        console.error("使用 --order-id 查询需要配置 payeeId（.env 或 --payee-id）");
        process.exit(1);
      }
      const r = await getPaymentResult({
        payeeId: pid,
        traceId: f["trace-id"],
        orderId: f["order-id"],
      });
      console.log(`状态: ${r.status}`);
      console.log(JSON.stringify(r.raw, null, 2));
      break;
    }
    case "wait": {
      if (!f["trace-id"] && !f["order-id"]) {
        console.error("用法: mixpay wait --trace-id x | --order-id x（二选一）");
        process.exit(1);
      }
      const pid = f["payee-id"] ?? process.env.MIXPAY_PAYEE_ID;
      if (f["order-id"] && !pid) {
        console.error("使用 --order-id 查询需要配置 payeeId（.env 或 --payee-id）");
        process.exit(1);
      }
      const r = await pollPayment(
        { payeeId: pid, traceId: f["trace-id"], orderId: f["order-id"] },
        { intervalSec: Number(f.interval ?? 5), timeoutSec: Number(f.timeout ?? 300) }
      );
      console.log(`最终状态: ${r.status}`);
      console.log(JSON.stringify(r.raw, null, 2));
      if (r.status !== "success") process.exit(2);
      break;
    }
    case "assets": {
      const assets = await listPaymentAssets();
      console.log("symbol\tname\tnetwork\tassetId");
      for (const a of assets.slice(0, 40)) {
        console.log(`${a.symbol}\t${a.name}\t${a.network}\t${a.assetId}`);
      }
      break;
    }
    default:
      console.log("mixpay <init|pay|link|query|wait|assets>");
      process.exit(cmd ? 1 : 0);
  }
} catch (e: any) {
  console.error(`出错: ${e?.message ?? e}`);
  process.exit(1);
}
