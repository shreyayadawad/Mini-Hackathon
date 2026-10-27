# Person 3 — Backend and Postman

This directory contains **only Person 3's work**. Copy `server.js`, `routes/menu.js`, `routes/orders.js` into the existing repository. Do not overwrite your teammates' `public/` files or their `package.json` changes without checking.

## Branch workflow

```bash
git clone <YOUR-CAMPUS-CANTEEN-REPO-URL>
cd <YOUR-CAMPUS-CANTEEN-REPO-FOLDER>
git switch main
git pull origin main
git switch -c feature/backend
```

If you already cloned the repository, skip the `git clone` line. If `main` is not the branch name, use the repository's default branch instead.

## Install and run

```bash
npm install express mongodb
node server.js
```

Start MongoDB on `127.0.0.1:27017` first. Expected console output:

```
Canteen API running at http://127.0.0.1:3000
MongoDB connected: campus_canteen
```

In a browser, open `http://127.0.0.1:3000/api/health`.

## Agreed collection names

- Database: `campus_canteen`
- Menu collection: `menu`
- Orders collection: `orders`
- `_id`: MongoDB `ObjectId` (serialized as hex string in JSON)
- Price: number of rupees to two decimal places
- Status flow: `placed → preparing → ready → collected`

## API response contract

- `GET /api/menu`: JSON array of menu item objects
- `POST /api/menu`: 201 + newly created menu item
- `PUT /api/menu/:id`: 200 + updated menu item (partial fields accepted)
- `DELETE /api/menu/:id`: 200 + `{ "message": "Menu item deleted" }`
- `POST /api/orders`: 201 + newly created order; only `menuId` and `qty` read from input items; server determines name, price and total
- `GET /api/orders`: JSON array, newest first; optional `?status=ready`
- `PATCH /api/orders/:id/status`: 200 + order, if transition is valid
- `GET /api/health`: 200 + basic heartbeat
- `GET /api/stats/today`: **Member 4 adds this route.** The provided code intentionally doesn't fake it.

## Postman tests

Import `postman/Campus_Canteen_Person3.postman_collection.json`. The collection sets `baseUrl` and stores generated menu IDs and the order ID automatically. Run tests **in order**. Request 18 is expected to succeed only after Member 4 merges the stats route.

## Git commit / PR

```bash
git status
git add server.js routes/menu.js routes/orders.js postman/Campus_Canteen_Person3.postman_collection.json
git commit -m "Implement menu and order APIs with validation"
git push -u origin feature/backend
```

Open GitHub → **Compare & pull request**, set **base: main**, **compare: feature/backend**, and request Member 4 to review. If `server.js` exists already, review and merge changes rather than replacing it blindly.

## Member 4 integration

Member 4 can implement `routes/stats.js` and export a function `(db) => router`, mounting the stats endpoints under `/api/stats`. Then uncomment this line in `server.js` after merging that file:

```js
app.use('/api/stats', require('./routes/stats')(db));
```

Member 4 should agree on Mongo collection names and the menu unique index beforehand. The order snapshots include `name`, `price`, `qty`, and `subtotal` so old purchases survive menu price changes and deletions.
