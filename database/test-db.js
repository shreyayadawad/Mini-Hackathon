
const {
  getDB,
  getTodayStats,
  closeDB
} = require("./db");

async function testDatabase() {
  try {
    const db = await getDB();

    console.log("Connected to MongoDB!");

    const menuCount = await db
      .collection("menu")
      .countDocuments({});

    console.log("Menu items:", menuCount);

    const stats = await getTodayStats();

    console.log("Today's statistics:");
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error("Database test failed:", error);
    process.exitCode = 1;

  } finally {
    await closeDB();
  }
}

testDatabase();
