// Person 3: Order placement, orders board and status transitions.
const express = require('express');
const { ObjectId } = require('mongodb');

const FLOW = ['placed', 'preparing', 'ready', 'collected'];

function objectIdOrNull(text) {
  return typeof text === 'string' && /^[a-f\d]{24}$/i.test(text)
    ? new ObjectId(text)
    : null;
}

module.exports = function makeOrdersRouter(menu, orders) {
  const router = express.Router();

  // POST /api/orders
  router.post('/', async (req, res) => {
    const { customer, items } = req.body ?? {};
    if (typeof customer !== 'string' || !customer.trim() || customer.trim().length > 80) {
      return res.status(400).json({ error: 'customer is required (max 80 characters)' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: 'items must be an array of 1–30 entries' });
    }

    const requested = [];
    const seen = new Set();
    for (const entry of items) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return res.status(400).json({ error: 'Each item must be a JSON object' });
      }
      const id = objectIdOrNull(entry.menuId);
      if (!id || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > 20) {
        return res.status(400).json({ error: 'Each item needs a valid menuId and qty from 1 to 20' });
      }
      if (seen.has(id.toHexString())) {
        return res.status(400).json({ error: 'Duplicate menuId; combine quantities in one entry' });
      }
      seen.add(id.toHexString());
      requested.push({ id, qty: entry.qty });
    }

    // Prices come only from MongoDB, not from the customer's browser.
    const docs = await menu.find({ _id: { $in: requested.map((x) => x.id) } }).toArray();
    const byId = new Map(docs.map((doc) => [doc._id.toHexString(), doc]));
    const orderItems = [];
    let totalPaise = 0;

    for (const entry of requested) {
      const item = byId.get(entry.id.toHexString());
      if (!item) {
        return res.status(404).json({ error: `Menu item ${entry.id} not found` });
      }
      if (item.available !== true) {
        return res.status(409).json({ error: `${item.name} is not available` });
      }
      const unitPaise = Math.round(item.price * 100);
      const subtotalPaise = unitPaise * entry.qty;
      totalPaise += subtotalPaise;
      orderItems.push({
        menuId: item._id,
        name: item.name,
        price: unitPaise / 100,
        qty: entry.qty,
        subtotal: subtotalPaise / 100
      });
    }

    const now = new Date();
    const order = {
      customer: customer.trim(),
      items: orderItems,
      total: totalPaise / 100,
      status: 'placed',
      createdAt: now,
      updatedAt: now
    };
    const result = await orders.insertOne(order);
    return res.status(201).json({ ...order, _id: result.insertedId });
  });

  // GET /api/orders           GET /api/orders?status=ready
  router.get('/', async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && (typeof status !== 'string' || !FLOW.includes(status))) {
      return res.status(400).json({ error: `status must be one of: ${FLOW.join(', ')}` });
    }
    const filter = status ? { status } : {};
    const result = await orders.find(filter).sort({ createdAt: -1 }).toArray();
    return res.json(result);
  });

  // PATCH /api/orders/:id/status     body: { "status": "preparing" }
  router.patch('/:id/status', async (req, res) => {
    const id = objectIdOrNull(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid order ID' });
    const nextStatus = req.body?.status;
    if (typeof nextStatus !== 'string' || !FLOW.includes(nextStatus)) {
      return res.status(400).json({ error: `status must be one of: ${FLOW.join(', ')}` });
    }

    const currentOrder = await orders.findOne({ _id: id });
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });
    if (FLOW.indexOf(nextStatus) !== FLOW.indexOf(currentOrder.status) + 1) {
      return res.status(400).json({
        error: `Invalid transition: ${currentOrder.status} -> ${nextStatus}`
      });
    }

    // Atomic conditional update prevents two staff requests racing each other.
    const result = await orders.updateOne(
      { _id: id, status: currentOrder.status },
      { $set: { status: nextStatus, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(409).json({ error: 'Order changed; refresh and try again' });
    }
    return res.json(await orders.findOne({ _id: id }));
  });

  return router;
};
