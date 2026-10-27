const test = require("node:test");
const assert = require("node:assert/strict");
const { registerStatsRoute } = require("./stats-route");

test("GET /api/stats/today registers and returns the dashboard response", async () => {
  const registered = {};
  const app = { get(path, handler) { registered[path] = handler; } };
  const result = {
    date: "2026-10-27", orders: 2, sales: 210,
    topItems: [], byStatus: { placed: 1, preparing: 0, ready: 0, collected: 1 }
  };
  registerStatsRoute(app, async () => result);
  const response = {
    json(body) { this.body = body; return this; },
    status(code) { this.statusCode = code; return this; }
  };
  assert.equal(typeof registered["/api/stats/today"], "function");
  await registered["/api/stats/today"]({}, response);
  assert.deepEqual(response.body, result);
});

test("GET /api/stats/today safely handles database errors", async () => {
  const registered = {};
  const app = { get(path, handler) { registered[path] = handler; } };
  registerStatsRoute(app, async () => { throw new Error("test-only failure"); });
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  const original = console.error;
  console.error = () => {};
  try {
    await registered["/api/stats/today"]({}, response);
  } finally {
    console.error = original;
  }
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: "Failed to fetch daily statistics" });
});
