const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { getDB, getTodayStats, closeDB, indiaDay } = require("./db");

test("IST day boundaries", () => {
  const day = indiaDay(new Date("2026-10-27T07:00:00Z"));
  assert.equal(day.date, "2026-10-27");
  assert.equal(day.start.toISOString(), "2026-10-26T18:30:00.000Z");
  assert.equal(day.end.toISOString(), "2026-10-27T18:30:00.000Z");
});

test("Daily sales aggregation", async (t) => {
  const database = await getDB();
  const collectionName = "person4_test_" + randomUUID().replace(/-/g, "");
  let collection;
  try {
    collection = await database.createCollection(collectionName);
    const options = {
      database,
      collectionName,
      now: new Date("2026-10-27T07:00:00Z")
    };
    await t.test("No orders returns dashboard-safe defaults", async () => {
      assert.deepEqual(await getTodayStats(options), {
        date: "2026-10-27",
        orders: 0,
        sales: 0,
        topItems: [],
        byStatus: { placed: 0, preparing: 0, ready: 0, collected: 0 },
        totalOrders: 0,
        completedOrders: 0,
        revenue: 0
      });
    });
    await collection.insertMany([
      {
        status: "completed", total: 120,
        items: [{ name: "Veg Burger", emoji: "🍔", qty: 2 }],
        createdAt: new Date("2026-10-26T18:30:00Z")
      },
      {
        status: "placed", total: 90,
        items: [
          { name: "Masala Dosa", emoji: "🥞", qty: 1 },
          { name: "Cold Coffee", emoji: "🥤", qty: 1 }
        ],
        createdAt: new Date("2026-10-27T07:00:00Z")
      },
      {
        status: "cancelled", total: 55,
        items: [{ name: "French Fries", emoji: "🍟", qty: 5 }],
        createdAt: new Date("2026-10-27T09:00:00Z")
      },
      {
        status: "preparing", total: 45,
        items: [{ name: "Veg Sandwich", emoji: "🥪", qty: 1 }],
        createdAt: new Date("2026-10-27T10:00:00Z")
      },
      {
        status: "ready", total: 60,
        items: [{ name: "Veg Burger", emoji: "🍔", qty: 1 }],
        createdAt: new Date("2026-10-27T11:00:00Z")
      },
      {
        status: "collected", total: 40,
        items: [{ name: "Cold Coffee", emoji: "🥤", qty: 1 }],
        createdAt: new Date("2026-10-27T12:00:00Z")
      },
      { status: "completed", total: 999, createdAt: new Date("2026-10-26T18:29:59Z") },
      { status: "collected", total: 888, createdAt: new Date("2026-10-27T18:30:00Z") }
    ]);
    await t.test("Sales, statuses and top items match the frontend contract", async () => {
      assert.deepEqual(await getTodayStats(options), {
        date: "2026-10-27",
        orders: 5,
        sales: 355,
        topItems: [
          { name: "Veg Burger", emoji: "🍔", qty: 3 },
          { name: "Cold Coffee", emoji: "🥤", qty: 2 },
          { name: "Masala Dosa", emoji: "🥞", qty: 1 },
          { name: "Veg Sandwich", emoji: "🥪", qty: 1 }
        ],
        byStatus: { placed: 1, preparing: 1, ready: 1, collected: 1 },
        totalOrders: 6,
        completedOrders: 2,
        revenue: 160
      });
    });
    await t.test("Tomorrow starts exactly at midnight IST", async () => {
      const stats = await getTodayStats({
        database, collectionName, now: new Date("2026-10-27T18:30:00Z")
      });
      assert.equal(stats.date, "2026-10-28");
      assert.equal(stats.orders, 1);
      assert.equal(stats.sales, 888);
      assert.equal(stats.completedOrders, 1);
    });
  } finally {
    if (collection) await collection.drop();
    await closeDB();
  }
});
