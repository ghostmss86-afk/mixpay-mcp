/**
 * MixPay core SDK — zero-key collection layer.
 *
 * Only ever needs a payeeId (receiver account UUID). No private keys,
 * no signing. The payer completes payment by scanning the link; the
 * agent only creates links and queries results. Polling-first design
 * so it works for projects without a backend.
 *
 * API reference (verified 2026-09):
 *   https://mixpay.me/developers/guides/quote-assets
 *   https://mixpay.me/developers/api/payments/one-time-payment
 *   https://mixpay.me/developers/api/assets/payment-assets
 */
import { randomUUID } from "node:crypto";

// Security: the API base is pinned to the official endpoint on purpose.
// Allowing an env override would let a tampered .env redirect result queries
// to an attacker server that simply replies "success" — a fake-payment vector.
export const API_BASE = "https://api.mixpay.me/v1";

/** Hard HTTP deadline so a hung API call can never block an MCP tool forever. */
const HTTP_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
}

/** Common asset UUIDs. Always resolvable at runtime via listPaymentAssets(). */
export const KNOWN_ASSETS: Record<string, string> = {
  usdt: "4d8c508b-91c5-375b-92b0-ee702ed2dac5",
  usdc: "9b180ab6-6abe-3dc0-a13f-04169eb34bfa",
  btc: "c6d0c728-2624-429b-8e0d-d9d19b6592fa",
  eth: "43d61dcd-e413-450d-80b8-101d5e903357",
  doge: "6770a1e5-6086-44d5-b60f-545f9d9e8ffd",
  ltc: "76c802a2-7c88-447f-a93e-c29c9e5dd9c8",
};

export class MixPayError extends Error {
  constructor(message: string, public code: number = -1) {
    super(message);
    this.name = "MixPayError";
  }
}

export function resolveAssetId(input: string): string {
  return KNOWN_ASSETS[input.toLowerCase()] ?? input;
}

export interface CreatePaymentOptions {
  /** Receiver account UUID (from MixPay Dashboard). Required. */
  payeeId: string;
  /** Amount in quote asset. */
  quoteAmount: number | string;
  /** Quote asset: fiat code ("usd") or asset UUID. Default "usd". */
  quoteAssetId?: string;
  /** Settlement asset: symbol ("usdt") or asset UUID. Default "usdt". */
  settlementAssetId?: string;
  /** Force settlement to settlementAssetId exactly. Default true. */
  strictSettlement?: boolean;
  /** Your order id, unique with payeeId. 6-36 chars, no spaces. */
  orderId?: string;
  /** UUID for idempotency + result query. Auto-generated if omitted. */
  traceId?: string;
  /** HTTPS callback notified after payment success (server mode). */
  callbackUrl?: string;
  /** Redirect after payment success (browser mode). */
  returnTo?: string;
  /** Redirect after payment failure. */
  failedReturnTo?: string;
  /** Memo visible to payee. Max 50 chars. */
  remark?: string;
  /** Payment expiry in seconds. Official range: 10s ~ 172800s (48h).
   *  Unset = payer can pay at any time; set it to keep orders bounded. */
  expiredSeconds?: number;
}

export interface CreatedPayment {
  /** Short code used in the checkout URL. */
  code: string;
  /** Send this to the payer. */
  paymentUrl: string;
  traceId: string;
  orderId?: string;
}

export async function createOneTimePayment(o: CreatePaymentOptions): Promise<CreatedPayment> {
  // MixPay officially requires HTTPS callbacks. Enforce here so no caller
  // (CLI/MCP) can downgrade it — a plaintext callback is readable and
  // forgeable on the wire.
  if (o.callbackUrl && !o.callbackUrl.startsWith("https://")) {
    throw new MixPayError("callbackUrl 必须是 HTTPS（官方安全要求）", -2);
  }
  const traceId = o.traceId ?? randomUUID();
  // `||` (not ??) on purpose: an empty-string env var must fall back to the
  // default too. .env templates ship MIXPAY_SETTLE_ASSET="" and users copy them.
  const payload: Record<string, unknown> = {
    payeeId: o.payeeId,
    quoteAssetId: o.quoteAssetId || "usd",
    quoteAmount: String(o.quoteAmount),
    settlementAssetId: resolveAssetId(o.settlementAssetId || "usdt"),
    traceId,
    isTemp: "1",
  };
  if (o.orderId) payload.orderId = o.orderId;
  // Empirically verified 2026-09: strictMode must be a real boolean via JSON body;
  // sending the string "true" in form-urlencoded is rejected by the API.
  payload.strictMode = o.strictSettlement !== false;
  if (o.callbackUrl) payload.callbackUrl = o.callbackUrl;
  if (o.returnTo) payload.returnTo = o.returnTo;
  if (o.failedReturnTo) payload.failedReturnTo = o.failedReturnTo;
  if (o.remark) payload.remark = o.remark.slice(0, 50);
  if (o.expiredSeconds) payload.expiredTimestamp = Math.min(172800, Math.max(10, Math.round(o.expiredSeconds)));

  const res = await fetchWithTimeout(`${API_BASE}/one_time_payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!json.success) {
    throw new MixPayError(json.message ?? `HTTP ${res.status}`, json.code);
  }
  return {
    code: json.data.code,
    paymentUrl: `https://mixpay.me/code/${json.data.code}`,
    traceId,
    orderId: o.orderId,
  };
}

export type PaymentStatus =
  | "unpaid"
  | "pending"   // paid, waiting on-chain confirmations
  | "auditing"  // under review by MixPay
  | "success"
  | "failed"
  | "unknown";

export interface PaymentResult {
  status: PaymentStatus;
  raw: any;
}

export async function getPaymentResult(q: {
  payeeId?: string;
  traceId?: string;
  orderId?: string;
}): Promise<PaymentResult> {
  const params = new URLSearchParams();
  if (q.payeeId) params.set("payeeId", q.payeeId);
  if (q.traceId) params.set("traceId", q.traceId);
  if (q.orderId) params.set("orderId", q.orderId);
  // Verified 2026-09: the endpoint is /payments_result (plural). The singular
  // path returns 404 {"message":"The address you visited does not exist."}.
  const res = await fetchWithTimeout(`${API_BASE}/payments_result?${params}`);
  const json = (await res.json().catch(() => ({}))) as any;
  if (!json.success) {
    throw new MixPayError(json.message ?? `HTTP ${res.status}`, json.code);
  }
  const s = String(json.data?.status ?? "").toLowerCase();
  const status: PaymentStatus =
    s === "success" ? "success" :
    s === "unpaid" ? "unpaid" :
    s === "pending" ? "pending" :
    s === "auditing" ? "auditing" :
    s === "failed" ? "failed" : "unknown";
  return { status, raw: json.data ?? json };
}

export interface VerifyExpectation {
  payeeId: string;
  expectedQuoteAmount: number | string;
  expectedQuoteAssetId?: string;
}

export interface VerifyCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface VerifyOutcome {
  ok: boolean;
  status: PaymentStatus;
  checks: VerifyCheck[];
}

/**
 * Deterministic post-payment verification — implements MixPay's official
 * security guidelines as code, so no LLM judgment sits on the money path:
 *   1. data.status === "success"
 *   2. data.payeeId is ours
 *   3. data.quoteAmount + data.quoteAssetId match the order
 * Underpayment (quoteAmount below expected) fails the check. Overpayment
 * passes but surplusAmount > 0 means a refund is owed to the payer.
 */
export async function verifyPayment(
  q: { traceId?: string; orderId?: string },
  exp: VerifyExpectation
): Promise<VerifyOutcome> {
  const r = await getPaymentResult({ payeeId: exp.payeeId, traceId: q.traceId, orderId: q.orderId });
  const d = r.raw ?? {};
  const checks: VerifyCheck[] = [];

  checks.push({ name: "status==success", pass: r.status === "success", detail: r.status });

  const payee = String(d.payeeId ?? "");
  checks.push({
    name: "payeeId is ours",
    pass: payee === exp.payeeId,
    detail: payee || "(empty)",
  });

  if (exp.expectedQuoteAssetId) {
    const qa = String(d.quoteAssetId ?? "").toLowerCase();
    const want = exp.expectedQuoteAssetId.toLowerCase();
    checks.push({ name: "quoteAssetId matches", pass: qa === want, detail: `${qa || "(empty)"} vs ${want}` });
  }

  const actual = Number(d.quoteAmount);
  const expected = Number(exp.expectedQuoteAmount);
  const amountOk =
    Number.isFinite(actual) &&
    Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-9);
  checks.push({
    name: "quoteAmount matches",
    pass: amountOk,
    detail: `${d.quoteAmount ?? "(empty)"} vs ${exp.expectedQuoteAmount}`,
  });

  const surplus = Number(d.surplusAmount);
  const surplusNote =
    Number.isFinite(surplus) && surplus > 0
      ? `付款人多付了 ${d.surplusAmount}，MixPay 退款状态: ${d.surplusStatus ?? "unknown"}`
      : null;

  return {
    ok: checks.every((c) => c.pass),
    status: r.status,
    checks: surplusNote ? [...checks, { name: "surplus", pass: true, detail: surplusNote }] : checks,
  };
}

export interface PollOptions {
  intervalSec?: number;
  timeoutSec?: number;
  onPoll?: (r: PaymentResult) => void;
}

/**
 * Poll-first confirmation. Iron rule: never trust a webhook alone —
 * always confirm via active query before marking an order paid.
 */
export async function pollPayment(
  q: { payeeId?: string; traceId?: string; orderId?: string },
  opts: PollOptions = {}
): Promise<PaymentResult> {
  const intervalSec = opts.intervalSec ?? 5;
  const timeoutSec = opts.timeoutSec ?? 300;
  const deadline = Date.now() + timeoutSec * 1000;
  let last: PaymentResult = { status: "unknown", raw: {} };
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      last = await getPaymentResult(q);
      lastError = null;
      if (opts.onPoll) opts.onPoll(last);
      if (last.status === "success" || last.status === "failed") return last;
    } catch (e) {
      // Security fix: a network error or API hiccup must never be reported as
      // a payment result, and must not abort confirmation. Keep polling until
      // timeout; the caller then treats timeout as "needs manual review".
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  if (lastError) {
    return { status: "unknown", raw: { error: String((lastError as Error)?.message ?? lastError), note: "查询持续失败，需人工核对，禁止自动判失败" } };
  }
  return last;
}

/**
 * Static pay link for serverless/static sites. No API call needed.
 * Query results later via payeeId + orderId.
 */
export function buildPayLink(o: {
  payeeId: string;
  quoteAmount: number | string;
  quoteAssetId?: string;
  settlementAssetId?: string;
  remark?: string;
}): string {
  const p = new URLSearchParams({
    payeeId: o.payeeId,
    quoteAssetId: o.quoteAssetId ?? "usd",
    quoteAmount: String(o.quoteAmount),
    settlementAssetId: resolveAssetId(o.settlementAssetId ?? "usdt"),
  });
  if (o.remark) p.set("remark", o.remark.slice(0, 50));
  return `https://mixpay.me/pay?${p}`;
}

export interface PaymentAsset {
  symbol: string;
  name: string;
  assetId: string;
  network: string;
  onChainSupported: boolean;
  minPaymentAmount: string;
  maxPaymentAmount: string;
}

export async function listPaymentAssets(): Promise<PaymentAsset[]> {
  const res = await fetchWithTimeout(`${API_BASE}/setting/payment_assets`);
  const json = (await res.json().catch(() => ({}))) as any;
  if (!json.success) {
    throw new MixPayError(json.message ?? `HTTP ${res.status}`, json.code);
  }
  return json.data ?? [];
}
