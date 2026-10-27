const canteen = db.getSiblingDB("campus_canteen");
const collections = canteen.getCollectionNames();
if (!collections.includes("menu")) canteen.createCollection("menu");
if (!collections.includes("orders")) canteen.createCollection("orders");

canteen.menu.createIndex({ name: 1 }, { unique: true });
canteen.orders.createIndex({ createdAt: 1 });
canteen.orders.createIndex({ status: 1, createdAt: -1 });

const menuItems = [
  { name: "Veg Burger", price: 60, category: "Snacks", emoji: "🍔", image: "", available: true },
  { name: "Masala Dosa", price: 50, category: "Meals", emoji: "🥞", image: "", available: true },
  { name: "Veg Sandwich", price: 45, category: "Snacks", emoji: "🥪", image: "", available: true },
  { name: "Cold Coffee", price: 40, category: "Drinks", emoji: "🥤", image: "", available: true },
  { name: "French Fries", price: 55, category: "Snacks", emoji: "🍟", image: "", available: true },
  { name: "Veg Fried Rice", price: 80, category: "Meals", emoji: "🍚", image: "", available: true }
];

for (const item of menuItems) {
  canteen.menu.updateOne(
    { name: item.name },
    { $setOnInsert: item },
    { upsert: true }
  );
}

// Only migrate original sample categories, leaving any custom edits alone.
for (const [name, oldCategory, newCategory] of [
  ["Masala Dosa", "Breakfast", "Meals"],
  ["Cold Coffee", "Beverages", "Drinks"],
  ["Veg Fried Rice", "Lunch", "Meals"]
]) {
  canteen.menu.updateOne({ name, category: oldCategory }, { $set: { category: newCategory } });
}

print("Database setup completed.");
print("Menu items:", canteen.menu.countDocuments({}));
print("Orders:", canteen.orders.countDocuments({}));
print("Indexes created successfully.");
