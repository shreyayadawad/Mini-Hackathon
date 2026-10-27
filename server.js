// ==========================================
// CAMPUS CANTEEN ORDERS - BACKEND SERVER
// Person 3: Backend Developer
// ==========================================

// Import required packages
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

// Import API routes
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");

// Create Express application
const app = express();

// Server configuration
const PORT = 3000;

// MongoDB configuration
const MONGO_URL = "mongodb://127.0.0.1:27017";
const DB_NAME = "campus_canteen";

// Middleware to read JSON request bodies
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// MongoDB client
const client = new MongoClient(MONGO_URL);

// Start server function
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

    // Health check API
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Campus Canteen API is running",
        database: DB_NAME
      });
    });

    // Menu API routes
    app.use("/api/menu", menuRoutes(menuCollection));

    // Order API routes
    app.use(
      "/api/orders",
      orderRoutes(menuCollection, ordersCollection)
    );

    // Handle unknown API routes
    app.use("/api", (req, res) => {
      res.status(404).json({
        success: false,
        message: "API endpoint not found"
      });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error("Server error:", err);

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

// Execute start function
startServer();