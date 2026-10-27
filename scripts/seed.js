const { MongoClient } = require("mongodb");

const MONGO_URL = "mongodb://127.0.0.1:27017";
const DB_NAME = "campus_canteen";

const client = new MongoClient(MONGO_URL);

const menuItems = [
  { name: "Idli (2 pcs)", price: 25, category: "Meals", emoji: "🍚" },
  { name: "Masala Dosa", price: 50, category: "Meals", emoji: "🥞" },
  { name: "Veg Sandwich", price: 40, category: "Snacks", emoji: "🥪" },
  { name: "Samosa", price: 20, category: "Snacks", emoji: "🥟" },
  { name: "Paneer Frankie", price: 55, category: "Snacks", emoji: "🌯" },
  { name: "Veg Pulao", price: 60, category: "Meals", emoji: "🍚" },
  { name: "Chicken Fried Rice", price: 90, category: "Meals", emoji: "🍗" },
  { name: "Veg Noodles", price: 60, category: "Meals", emoji: "🍜" },
  { name: "French Fries", price: 50, category: "Snacks", emoji: "🍟" },
  { name: "Cheese Burger", price: 70, category: "Snacks", emoji: "🍔" },
  { name: "Tea", price: 15, category: "Drinks", emoji: "🍵" },
  { name: "Coffee", price: 20, category: "Drinks", emoji: "☕" },
  { name: "Fresh Lime Juice", price: 25, category: "Drinks", emoji: "🍋" },
  { name: "Chocolate Milkshake", price: 50, category: "Drinks", emoji: "🥤" },
  { name: "Ice Cream", price: 30, category: "Desserts", emoji: "🍨" }
];

async function seedMenu() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db(DB_NAME);
    const menuCollection = db.collection("menu");

    let added = 0;

    for (const item of menuItems) {
      const now = new Date();

      const result = await menuCollection.updateOne(
        { name: item.name },
        {
          $setOnInsert: {
            ...item,
            image: "",
            available: true,
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        added++;
      }
    }

    console.log(`Menu seeding completed! Added ${added} new items.`);
    console.log(`Processed ${menuItems.length} canteen items.`);

  } catch (error) {
    console.error("Error seeding menu:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedMenu();