
const { MongoClient } = require("mongodb");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGO_URI);

let connectionPromise = null;

// Reuse one connection instead of connecting for every query.
async function getDB() {
  if (!connectionPromise) {
    connectionPromise = client.connect()
      .then(() => client.db("campus_canteen"))
      .catch(error => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

// Calculate today's sales using Indian Standard Time.
async function getTodayStats() {
  const db = await getDB();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );

  const { year, month, day } = values;

  // Start of today in IST, represented in UTC.
  const start = new Date(
    Date.UTC(+year, +month - 1, +day) -
    330 * 60 * 1000
  );

  const end = new Date(
    start.getTime() + 24 * 60 * 60 * 1000
  );

  const results = await db.collection("orders")
    .aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lt: end
          }
        }
      },
      {
        $group: {
          _id: null,

          totalOrders: { $sum: 1 },

          completedOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0
              ]
            }
          },

          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                "$total",
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          completedOrders: 1,
          revenue: 1
        }
      }
    ])
    .toArray();

  return results[0] || {
    totalOrders: 0,
    completedOrders: 0,
    revenue: 0
  };
}

async function closeDB() {
  await client.close();
  connectionPromise = null;
}

module.exports = {
  getDB,
  getTodayStats,
  closeDB
};
