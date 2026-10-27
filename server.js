const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

// Import API routes
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const statsRoutes = require("./routes/stats");

// Create Express application
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "campus_canteen";

// Middleware
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// MongoDB client
const client = new MongoClient(MONGO_URL);

// Start application
async function startServer() {
  try {
    // Connect to MongoDB
    await client.connect();

    console.log("MongoDB connected successfully!");

    // Select database
    const db = client.db(DB_NAME);

    // Select collections
    const menuCollection = db.collection("menu");
    const ordersCollection = db.collection("orders");

    console.log(`Connected to database: ${DB_NAME}`);

    // Health check API
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Campus Canteen API is running",
        database: DB_NAME
      });
    });

    // Menu API
    app.use("/api/menu", menuRoutes(menuCollection));

    // Orders API
    app.use(
      "/api/orders",
      orderRoutes(menuCollection, ordersCollection)
    );

    // Statistics API
    app.use(
      "/api/stats",
      statsRoutes(ordersCollection)
    );

    // Handle unknown API endpoints
    app.use("/api", (req, res) => {
      res.status(404).json({
        success: false,
        error: "API endpoint not found"
      });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error("Server error:", err);

      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    });

    // Start HTTP server
    app.listen(PORT, () => {
      console.log("----------------------------------");
      console.log("Campus Canteen Server Started");
      console.log(`Server running at http://localhost:${PORT}`);
      console.log("----------------------------------");
      console.log("Available API endpoints:");
      console.log("GET    /api/health");
      console.log("GET    /api/menu");
      console.log("POST   /api/menu");
      console.log("PUT    /api/menu/:id");
      console.log("DELETE /api/menu/:id");
      console.log("GET    /api/orders");
      console.log("POST   /api/orders");
      console.log("PATCH  /api/orders/:id/status");
      console.log("GET    /api/stats/today");
      console.log("----------------------------------");
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Run application
startServer();