const { getTodayStats } = require("./db");

/**
 * Person 3: call registerStatsRoute(app) after express() initialization.
 * No Express dependency is required in the database package itself.
 */
function registerStatsRoute(app, getStats = getTodayStats) {
  app.get("/api/stats/today", async (_req, res) => {
    try {
      res.json(await getStats());
    } catch (error) {
      console.error("Daily statistics failed:", error);
      res.status(500).json({ error: "Failed to fetch daily statistics" });
    }
  });
}

module.exports = { registerStatsRoute };
