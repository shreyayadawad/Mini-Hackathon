
# Campus Canteen — Database Module

## Overview

This module manages the MongoDB database for
the Campus Canteen Orders application.

Database name: campus_canteen

## Collections

### 1. menu

Stores food items available in the canteen.

Fields:
- _id: ObjectId
- name: String
- price: Number (INR)
- category: String
- emoji: String
- image: String
- available: Boolean

### 2. orders

Stores customer orders and their statuses.

Fields:
- _id: ObjectId
- customer: String
- items: Array
- total: Number
- status: String
- createdAt: Date

Each order item contains:
- name: String
- price: Number
- qty: Number

Prices are saved at purchase time to preserve
the order's original value.

## Installation

Start MongoDB locally.

Install the database dependencies from
the project root:

    npm --prefix database ci

Initialize the database:

    mongosh --file database/setup.mongodb.js

## Testing

Run the database connection test:

    npm --prefix database test

To insert temporary sample orders:

    mongosh --file database/test-orders.mongodb.js

To inspect today's statistics:

    mongosh --file database/stats.mongodb.js

Test orders are development data and should
not be seeded into production.

## Database Indexes

- menu.name: unique index
- orders.createdAt: ascending index
- orders.status + createdAt: compound index

## Exports

database/db.js provides:

- getDB()
- getTodayStats()
- closeDB()

## Daily Sales Logic

Today's orders are calculated using
the Asia/Kolkata timezone.

The response contains:
- totalOrders
- completedOrders
- revenue

Currently, orders with status "completed"
contribute to revenue.

The exact order status values and payment
semantics must be agreed with the backend developer.

## Integration

Person 3 can import this module using:

    const { getTodayStats } =
      require("./database/db");

The Express route /api/stats/today will call
getTodayStats() and return the resulting JSON.
