const express = require("express");

module.exports = function (ordersCollection) {
  const router = express.Router();

  router.get("/today", async (req, res) => {
    try {
      const orders = await ordersCollection.find({}).toArray();

      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
      });

      const todaysOrders = orders.filter((order) => {
        if (!order.createdAt) return false;

        return (
          new Date(order.createdAt).toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata"
          }) === today
        );
      });

      const sales = todaysOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      const byStatus = {
        placed: 0,
        preparing: 0,
        ready: 0,
        collected: 0
      };

      const itemCounts = {};

      for (const order of todaysOrders) {
        if (Object.hasOwn(byStatus, order.status)) {
          byStatus[order.status]++;
        }

        for (const item of order.items || []) {
          const key = item.name;

          if (!itemCounts[key]) {
            itemCounts[key] = {
              name: item.name,
              emoji: item.emoji || "",
              qty: 0
            };
          }

          itemCounts[key].qty += item.qty;
        }
      }

      const topItems = Object.values(itemCounts)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      res.status(200).json({
        date: today,
        sales,
        orders: todaysOrders.length,
        byStatus,
        topItems
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to calculate statistics" });
    }
  });

  return router;
};