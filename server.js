const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");
const menuRoutes = require("./routes/menu");
const orderRoutes = require("./routes/orders");
const statsRoutes = require("./routes/stats");
const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));
const client = new MongoClient(process.env.MONGO_URL || "mongodb://127.0.0.1:27017");
async function start() {
  await client.connect();
  const db = client.db(process.env.DB_NAME || "campus_canteen");
  const menu = db.collection("menu");
  const orders = db.collection("orders");
  await menu.createIndex({name:1}, {unique:true, collation:{locale:"en",strength:2}});
  await orders.createIndex({createdAt:-1});
  app.get("/api/health", (req,res)=>res.json({ok:true, database:db.databaseName}));
  app.use("/api/menu", menuRoutes(menu));
  app.use("/api/orders", orderRoutes(menu,orders));
  app.use("/api/stats", statsRoutes(orders));
  app.use("/api", (req,res)=>res.status(404).json({error:"API endpoint not found"}));
  app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({error:"Internal server error"}); });
  const port = Number(process.env.PORT) || 3000;
  app.listen(port,()=>console.log("MongoDB connected successfully!\nServer running at http://localhost:"+port));
}
start().catch(err=>{console.error("Startup failed:",err);process.exitCode=1;client.close().catch(()=>{});});
