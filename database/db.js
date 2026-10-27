const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "campus_canteen";
const client = new MongoClient(MONGO_URI);
let connectionPromise = null;

async function getDB() {
  if (!connectionPromise) {
    connectionPromise = client.connect()
      .then(() => client.db(DB_NAME))
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }
  return connectionPromise;
}

function indiaDay(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const { year, month, day } = values;
  const start = new Date(Date.UTC(+year, +month - 1, +day) - 330 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { date: year + "-" + month + "-" + day, start, end };
}

/**
 * Summarize today's orders using Indian Standard Time.
 * Frontend contract: date, orders, sales, topItems, byStatus.
 * Legacy diagnostic fields: totalOrders, completedOrders, revenue.
 * sales = value of all non-cancelled orders (not confirmed payments).
 * revenue = value of collected/completed orders (also not proof of payment).
 * Tests may inject a temporary database/collection and fixed timestamp.
 */
async function getTodayStats(options = {}) {
  const database = options.database || await getDB();
  const collectionName = options.collectionName || "orders";
  const { date, start, end } = indiaDay(options.now || new Date());

  const [data] = await database.collection(collectionName).aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $facet: {
        summary: [{
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            orders: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] } },
            sales: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0] } },
            completedOrders: {
              $sum: { $cond: [{ $in: ["$status", ["completed", "collected"]] }, 1, 0] }
            },
            revenue: {
              $sum: { $cond: [{ $in: ["$status", ["completed", "collected"]] }, "$total", 0] }
            }
          }
        }],
        statuses: [
          { $match: { status: { $in: ["placed", "preparing", "ready", "collected"] } } },
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        topItems: [
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: { name: "$items.name", emoji: "$items.emoji" },
              qty: { $sum: "$items.qty" }
            }
          },
          { $sort: { qty: -1, "_id.name": 1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              name: "$_id.name",
              emoji: { $ifNull: ["$_id.emoji", "🍽️"] },
              qty: 1
            }
          }
        ]
      }
    }
  ]).toArray();

  const totals = data.summary[0] || {
    totalOrders: 0,
    orders: 0,
    sales: 0,
    completedOrders: 0,
    revenue: 0
  };
  const byStatus = { placed: 0, preparing: 0, ready: 0, collected: 0 };
  for (const entry of data.statuses) byStatus[entry._id] = entry.count;

  return {
    date,
    orders: totals.orders,
    sales: totals.sales,
    topItems: data.topItems,
    byStatus,
    totalOrders: totals.totalOrders,
    completedOrders: totals.completedOrders,
    revenue: totals.revenue
  };
}

async function closeDB() {
  await client.close();
  connectionPromise = null;
}

module.exports = { getDB, getTodayStats, closeDB, indiaDay };
