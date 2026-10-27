
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const {
  getDB,
  getTodayStats,
  closeDB
} = require("./db");

test("Daily sales aggregation", async (t) => {
  const database = await getDB();

  // Create a unique test collection.
  const collectionName =
    "person4_test_" + randomUUID().replace(/-/g, "");

  const collection =
    await database.createCollection(collectionName);

  // Fixed time: October 27, 2026, 12:30 PM IST.
  const options = {
    database,
    collectionName,
    now: new Date("2026-10-27T07:00:00Z")
  };

  try {
    // TEST 1: Empty collection
    await t.test("Empty collection returns zeros", async () => {
      const stats = await getTodayStats(options);

      assert.deepEqual(stats, {
        totalOrders: 0,
        completedOrders: 0,
        revenue: 0
      });
    });

    // Prepare sample orders.
    await collection.insertMany([
      {
        customer: "Student A",
        status: "completed",
        total: 120,
        createdAt: new Date("2026-10-26T18:30:00Z")
      },
      {
        customer: "Student B",
        status: "pending",
        total: 90,
        createdAt: new Date("2026-10-27T07:00:00Z")
      },
      {
        customer: "Student C",
        status: "cancelled",
        total: 55,
        createdAt: new Date("2026-10-27T09:00:00Z")
      },
      {
        customer: "Yesterday",
        status: "completed",
        total: 999,
        createdAt: new Date("2026-10-26T18:29:59Z")
      },
      {
        customer: "Tomorrow",
        status: "completed",
        total: 888,
        createdAt: new Date("2026-10-27T18:30:00Z")
      }
    ]);

    // TEST 2: Date filtering and completed revenue
    await t.test("Correct daily sales totals", async () => {
      const stats = await getTodayStats(options);

      assert.deepEqual(stats, {
        totalOrders: 3,
        completedOrders: 1,
        revenue: 120
      });
    });

  } finally {
    // Clean up only the temporary test collection.
    await collection.drop();
    await closeDB();
  }
});
