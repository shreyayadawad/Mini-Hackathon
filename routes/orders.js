const express = require("express");

module.exports = function (menuCollection, ordersCollection) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const orders = await ordersCollection.find({}).toArray();

    res.json(orders);
  });

  return router;
};