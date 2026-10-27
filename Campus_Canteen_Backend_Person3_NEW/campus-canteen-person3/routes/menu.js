// Person 3: Menu CRUD routes mounted under /api/menu.
const express = require('express');
const { ObjectId } = require('mongodb');

function objectIdOrNull(text) {
  return typeof text === 'string' && /^[a-f\d]{24}$/i.test(text)
    ? new ObjectId(text)
    : null;
}

// Validate and sanitize user input; never pass arbitrary client fields to MongoDB.
function validateMenu(body, updating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  const allowed = ['name', 'price', 'category', 'emoji', 'image', 'available'];
  const keys = Object.keys(body);
  if (keys.length === 0) return { error: 'Provide menu item fields' };
  if (keys.some((key) => !allowed.includes(key))) {
    return { error: 'Request contains unsupported menu fields' };
  }
  if (!updating && ['name', 'price', 'category'].some((key) => !(key in body))) {
    return { error: 'name, price and category are required' };
  }

  const data = {};
  for (const field of ['name', 'category']) {
    if (field in body) {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        return { error: `${field} must be a nonempty string` };
      }
      const trimmed = body[field].trim();
      if (trimmed.length > (field === 'name' ? 80 : 40)) {
        return { error: `${field} is too long` };
      }
      data[field] = trimmed;
    }
  }
  if ('price' in body) {
    const price = body.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 100000 ||
        Math.abs(price * 100 - Math.round(price * 100)) > 1e-7) {
      return { error: 'price must be a positive number with at most 2 decimal places' };
    }
    data.price = Math.round(price * 100) / 100;
  }
  for (const field of ['emoji', 'image']) {
    if (field in body) {
      if (typeof body[field] !== 'string' || body[field].length > (field === 'emoji' ? 16 : 500)) {
        return { error: `${field} must be a short string` };
      }
      data[field] = body[field];
    }
  }
  if ('available' in body) {
    if (typeof body.available !== 'boolean') {
      return { error: 'available must be true or false' };
    }
    data.available = body.available;
  }
  if (!updating) {
    data.emoji = data.emoji ?? '🍽️';
    data.image = data.image ?? '';
    data.available = data.available ?? true;
  }
  return { data };
}

module.exports = function makeMenuRouter(menu) {
  const router = express.Router();

  // GET /api/menu
  router.get('/', async (req, res) => {
    const items = await menu.find({}).sort({ category: 1, name: 1 }).toArray();
    return res.json(items);
  });

  // POST /api/menu
  router.post('/', async (req, res) => {
    const { error, data } = validateMenu(req.body);
    if (error) return res.status(400).json({ error });

    const now = new Date();
    const doc = { ...data, createdAt: now, updatedAt: now };
    const result = await menu.insertOne(doc);
    return res.status(201).json({ ...doc, _id: result.insertedId });
  });

  // PUT /api/menu/:id  (accepts any nonempty subset of editable fields)
  router.put('/:id', async (req, res) => {
    const id = objectIdOrNull(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid menu item ID' });
    const { error, data } = validateMenu(req.body, true);
    if (error) return res.status(400).json({ error });

    const result = await menu.updateOne(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    return res.json(await menu.findOne({ _id: id }));
  });

  // DELETE /api/menu/:id
  router.delete('/:id', async (req, res) => {
    const id = objectIdOrNull(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid menu item ID' });

    const result = await menu.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    return res.json({ message: 'Menu item deleted' });
  });

  return router;
};
