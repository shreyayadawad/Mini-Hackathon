# Campus Canteen — MongoDB database and sales dashboard

This folder is maintained by Person 4. It provides MongoDB initialization, a reusable Node.js database client, today's sales aggregation, automated tests, and a small Express integration adapter.

## Local setup

Install MongoDB 8 (running on `127.0.0.1:27017`) and Node.js 22+.

From the **project root**:

```bash
npm --prefix database ci
mongosh "mongodb://127.0.0.1:27017" --file database/setup.mongodb.js
npm --prefix database test
npm --prefix database run smoke
```

The setup script is rerunnable and seeds six example dishes. It never wipes existing menu items or orders. Keep the database bound to localhost in development; this local setup does not enable MongoDB authentication.

Configuration:

- `MONGO_URI` defaults to `mongodb://127.0.0.1:27017`.
- `MONGO_DB_NAME` defaults to `campus_canteen`.

## Collections and schema

**menu**: `_id` (ObjectId), `name` (unique string), `price` (number in INR), `category` (string), `emoji` (string), `image` (string URL), `available` (boolean).

**orders**: `_id` (ObjectId), `customer` (string), `items` (array of item snapshots), `total` (server-calculated number), `status` (string), `createdAt` (BSON Date). Each item should include `menuId` (ObjectId or agreed string), `name`, `emoji`, `price`, and `qty` (positive integer).

The order API must calculate prices from current menu records, not from the client's request. Store item snapshots so later menu edits do not change past orders. Do not insert development test orders into production.

Indexes: unique `menu.name`; `orders.createdAt`; compound `orders.status, orders.createdAt`.

## Daily sales: frontend and backend contract

Call `getTodayStats()` from `database/db.js` to calculate today's numbers using `Asia/Kolkata` (IST). The frontend at `feature/js-client/public/app.js` expects:

```json
{
  "date": "2026-10-27",
  "orders": 2,
  "sales": 210,
  "topItems": [{"name":"Veg Burger","emoji":"🍔","qty":2}],
  "byStatus": {"placed":1,"preparing":0,"ready":0,"collected":1},
  "totalOrders": 2,
  "completedOrders": 1,
  "revenue": 120
}
```

**Semantics:**

- `orders` and `sales`: number and sum of order totals, excluding orders marked `cancelled`.
- `topItems`: top five dishes by quantity among non-cancelled orders.
- `byStatus`: counts for `placed`, `preparing`, `ready`, `collected`.
- `totalOrders`: all orders placed today including any cancelled ones.
- `completedOrders`/`revenue`: orders marked `collected` or the legacy `completed` status, and their totals.

`sales` and `revenue` are operational totals, **not verified payments**. If a payment mechanism is introduced, paid revenue must be calculated using payment records instead of status.

Dates and boundaries are computed in IST and matched against MongoDB Date values using an indexed range.

## Person 3: attach route to Express

After creating `app = express()`, and after the database dependency is installed:

```js
const { registerStatsRoute } = require("./database/stats-route");
registerStatsRoute(app);
```

The helper registers `GET /api/stats/today`, sends the JSON contract above, and returns 500 without exposing internal errors if the database is unavailable. This file does not modify Person 3's `server.js`.

The Node MongoDB driver lives under `database/node_modules`; run `npm --prefix database ci` before launching the backend.

Other frontend API requirements owned by Person 3: `GET/POST /api/menu`, `PUT/DELETE /api/menu/:id`, `GET/POST /api/orders`, and `PATCH /api/orders/:id/status`. The backend should validate MongoDB ObjectIds, customer strings, and positive quantities, and use the status flow `placed → preparing → ready → collected`.

## Tests

`npm --prefix database test` runs real MongoDB aggregation assertions against a uniquely named temporary collection, plus route-adapter contract tests. The temporary test collection is dropped afterward. `npm --prefix database run smoke` checks the current live database without asserting fixed counts.

The repository also contains `stats.mongodb.js` and `test-orders.mongodb.js`, designed to run via `mongosh`. The latter intentionally inserts *development* orders only and should not run against production.

## Integration and GitHub

Work stays on `feature/database` and is reviewed through PR #1 targeting `main`. Re-run `npm --prefix database test` after integrating Person 3's API. From the completed Express server, verify:

```bash
curl -i http://localhost:3000/api/stats/today
```

A 200 response must contain `date`, `orders`, `sales`, `topItems`, and `byStatus`. Do not merge unfinished frontend/backend branches solely to make this route work.
