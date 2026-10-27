// Person 3: Express API entry point for Campus Canteen Orders.
// Run from the repository root: node server.js
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const makeMenuRouter = require('./routes/menu');
const makeOrdersRouter = require('./routes/orders');

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'campus_canteen';

async function start() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const menu = db.collection('menu');
  const orders = db.collection('orders');

  // Shared with Member 4: move this index to their DB setup if desired.
  // Prevents duplicate menu names, even when capitalization differs.
  await menu.createIndex(
    { name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
  );

  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, database: DB_NAME });
  });
  app.use('/api/menu', makeMenuRouter(menu));
  app.use('/api/orders', makeOrdersRouter(menu, orders));

  // Member 4 implements routes/stats.js and, after merging, we enable:
  // app.use('/api/stats', require('./routes/stats')(db));

  // Member 1 places index.html/style.css in public/;
  // Member 2 places app.js in public/.
  app.use(express.static(path.join(__dirname, 'public')));

  // Error-handling middleware must be after all routes.
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A menu item with that name already exists' });
    }
    console.error('Unexpected API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Canteen API running at http://127.0.0.1:${PORT}`);
    console.log(`MongoDB connected: ${DB_NAME}`);
  });

  // Close the MongoDB connection when the app is stopped.
  process.on('SIGINT', () => {
    server.close(() => client.close().finally(() => process.exit(0)));
  });
}

start().catch((err) => {
  console.error('Could not start server:', err.message);
  process.exit(1);
});
