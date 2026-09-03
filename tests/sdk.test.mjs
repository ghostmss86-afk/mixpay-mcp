/**
 * SDK regression tests — the money path.
 * Zero new dependencies: node:test + globalThis.fetch stubbing.
 * Run: npm test  (builds dist first, then node --test)
 */
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  verifyPayment,
  createOneTimePayment,
  getPaymentResult,
  pollPayment,
  resolveAssetId,
  buildPayLink,
  MixPayError,
} from "../dist/sdk.js";

const realFetch = globalThis.fetch;
const PAYEE = "a0d77914-0877-6b47-eb1d-d3f94ed15d6a";
const USDT = "4d8c508b-91c5-375b-92b0-ee702ed2dac5";

/** Stub global fetch; returns captured calls. */
function stub(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(url, init);
  };
  return calls;
}
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const resultPayload = (overrides = {}) =>
  jsonResponse({ code: 0, success: true, message: "", data: { status: "unpaid", ...overrides } });

beforeEach(() => {});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("resolveAssetId", () => {
  test("maps known symbols to verified UUIDs", () => {
    assert.equal(resolveAssetId("usdt"), USDT);
    assert.equal(resolveAssetId("USDT"), USDT);
  });
  test("passes through unknown ids", () => {
    assert.equal(resolveAssetId("some-uuid"), "some-uuid");
  });
});

describe("createOneTimePayment", () => {
  test("sends JSON body with boolean strictMode (not string)", async () => {
    const calls = stub(() => jsonResponse({ success: true, data: { code: "c1" } }));
    await createOneTimePayment({ payeeId: PAYEE, quoteAmount: 10, orderId: "order-001" });
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.strictMode, true);
    assert.equal(body.isTemp, "1");
    assert.equal(body.settlementAssetId, USDT);
    assert.equal(body.orderId, "order-001");
    assert.match(calls[0].url, /\/one_time_payment$/);
  });

  test("clamps expiredSeconds into official range 10..172800", async () => {
    const calls = stub(() => jsonResponse({ success: true, data: { code: "c" } }));
    await createOneTimePayment({ payeeId: PAYEE, quoteAmount: 1, expiredSeconds: 999999 });
    assert.equal(JSON.parse(calls[0].init.body).expiredTimestamp, 172800);
    await createOneTimePayment({ payeeId: PAYEE, quoteAmount: 1, expiredSeconds: 1 });
    assert.equal(JSON.parse(calls[1].init.body).expiredTimestamp, 10);
  });

  test("truncates remark to 50 chars", async () => {
    const calls = stub(() => jsonResponse({ success: true, data: { code: "c" } }));
    await createOneTimePayment({ payeeId: PAYEE, quoteAmount: 1, remark: "x".repeat(80) });
    assert.equal(JSON.parse(calls[0].init.body).remark.length, 50);
  });

  test("empty-string asset ids fall back to defaults (env template bug guard)", async () => {
    const calls = stub(() => jsonResponse({ success: true, data: { code: "c" } }));
    await createOneTimePayment({
      payeeId: PAYEE,
      quoteAmount: 1,
      quoteAssetId: "",
      settlementAssetId: "",
    });
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.quoteAssetId, "usd");
    assert.equal(body.settlementAssetId, USDT);
  });

  test("API failure raises MixPayError with code", async () => {
    stub(() => jsonResponse({ success: false, message: "User does not exist", code: 10001 }));
    await assert.rejects(
      createOneTimePayment({ payeeId: PAYEE, quoteAmount: 1 }),
      (e) => e instanceof MixPayError && e.code === 10001 && /User does not exist/.test(e.message)
    );
  });

  test("rejects non-HTTPS callbackUrl before any network call", async () => {
    const calls = stub(() => jsonResponse({ success: true, data: { code: "c" } }));
    await assert.rejects(
      createOneTimePayment({ payeeId: PAYEE, quoteAmount: 1, callbackUrl: "http://evil.example/cb" }),
      (e) => e instanceof MixPayError && /HTTPS/.test(e.message)
    );
    assert.equal(calls.length, 0);
  });
});

describe("getPaymentResult — endpoint & status mapping", () => {
  test("uses the PLURAL /payments_result endpoint (regression: singular 404s)", async () => {
    const calls = stub(() => resultPayload());
    await getPaymentResult({ traceId: "t1" });
    assert.match(calls[0].url, /\/payments_result\?/);
    assert.doesNotMatch(calls[0].url, /\/payment_result\?/);
  });

  test("maps all five official statuses", async () => {
    for (const [api, expect] of [
      ["success", "success"],
      ["unpaid", "unpaid"],
      ["pending", "pending"],
      ["auditing", "auditing"],
      ["failed", "failed"],
    ]) {
      stub(() => resultPayload({ status: api }));
      const r = await getPaymentResult({ traceId: "t" });
      assert.equal(r.status, expect);
    }
  });

  test("omits payeeId param when not provided (traceId-only query)", async () => {
    const calls = stub(() => resultPayload());
    await getPaymentResult({ traceId: "t1" });
    assert.ok(!calls[0].url.includes("payeeId="));
  });
});

describe("verifyPayment — the delivery gate", () => {
  const paid = {
    status: "success",
    payeeId: PAYEE,
    quoteAmount: "10",
    quoteAssetId: "usd",
    surplusAmount: "0",
  };

  test("all-pass on exact match", async () => {
    stub(() => resultPayload(paid));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, true);
  });

  test("FAIL on underpayment", async () => {
    stub(() => resultPayload({ ...paid, quoteAmount: "9" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, false);
    assert.ok(v.checks.find((c) => c.name === "quoteAmount matches" && !c.pass));
  });

  test("FAIL on wrong currency", async () => {
    stub(() => resultPayload({ ...paid, quoteAssetId: "eur" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, false);
  });

  test("FAIL when payment went to a different payeeId", async () => {
    stub(() => resultPayload({ ...paid, payeeId: "attacker-uuid" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, false);
  });

  test("FAIL when status is not success (unpaid)", async () => {
    stub(() => resultPayload({ ...paid, status: "unpaid" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, false);
  });

  test("overpayment passes but surfaces surplus note", async () => {
    stub(() => resultPayload({ ...paid, quoteAmount: "10", surplusAmount: "0.5", surplusStatus: "pending" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, true);
    assert.ok(v.checks.find((c) => c.name === "surplus" && c.detail.includes("0.5")));
  });

  test("empty/missing quoteAmount fails closed (never passes on missing data)", async () => {
    stub(() => resultPayload({ ...paid, quoteAmount: "" }));
    const v = await verifyPayment({ traceId: "t" }, { payeeId: PAYEE, expectedQuoteAmount: 10, expectedQuoteAssetId: "usd" });
    assert.equal(v.ok, false);
  });
});

describe("pollPayment", () => {
  test("returns success as soon as status flips", async () => {
    let n = 0;
    stub(() => resultPayload({ status: n++ < 2 ? "unpaid" : "success", payeeId: PAYEE, quoteAmount: "1", quoteAssetId: "usd" }));
    const r = await pollPayment({ traceId: "t" }, { intervalSec: 0.01, timeoutSec: 2 });
    assert.equal(r.status, "success");
  });

  test("network errors NEVER abort polling and NEVER become a payment status", async () => {
    stub(() => { throw new TypeError("fetch failed"); });
    const r = await pollPayment({ traceId: "t" }, { intervalSec: 0.01, timeoutSec: 0.3 });
    assert.equal(r.status, "unknown");
    assert.ok(r.raw.note.includes("禁止自动判失败"));
  });

  test("keeps polling through pending/auditing until terminal state or timeout", async () => {
    stub(() => resultPayload({ status: "pending", confirmations: 1 }));
    const r = await pollPayment({ traceId: "t" }, { intervalSec: 0.01, timeoutSec: 0.3 });
    assert.equal(r.status, "pending");
  });
});

describe("buildPayLink", () => {
  test("static link contains resolved assets and truncated remark", () => {
    const url = buildPayLink({ payeeId: PAYEE, quoteAmount: 5, remark: "y".repeat(80) });
    const u = new URL(url);
    assert.equal(u.origin + u.pathname, "https://mixpay.me/pay");
    assert.equal(u.searchParams.get("settlementAssetId"), USDT);
    assert.equal(u.searchParams.get("remark").length, 50);
  });
});
