
const canteen = db.getSiblingDB("campus_canteen");

// Create collections
const collections = canteen.getCollectionNames();

if (!collections.includes("menu")) {
  canteen.createCollection("menu");
}

if (!collections.includes("orders")) {
  canteen.createCollection("orders");
}

// Create indexes
canteen.menu.createIndex(
  { name: 1 },
  { unique: true }
);

canteen.orders.createIndex({ createdAt: 1 });
canteen.orders.createIndex({ status: 1, createdAt: -1 });

// Sample food items
const menuItems = [
  {
    name: "Veg Burger",
    price: 60,
    category: "Snacks",
    emoji: "🍔",
    image: "",
    available: true
  },
  {
    name: "Masala Dosa",
    price: 50,
    category: "Breakfast",
    emoji: "🥞",
    image: "",
    available: true
  },
  {
    name: "Veg Sandwich",
    price: 45,
    category: "Snacks",
    emoji: "🥪",
    image: "",
    available: true
  },
  {
    name: "Cold Coffee",
    price: 40,
    category: "Beverages",
    emoji: "🥤",
    image: "",
    available: true
  },
  {
    name: "French Fries",
    price: 55,
    category: "Snacks",
    emoji: "🍟",
    image: "",
    available: true
  },
  {
    name: "Veg Fried Rice",
    price: 80,
    category: "Lunch",
    emoji: "🍚",
    image: "",
    available: true
  }
];

// Insert only missing menu items
menuItems.forEach(item => {
  canteen.menu.updateOne(
    { name: item.name },
    { $setOnInsert: item },
    { upsert: true }
  );
});

print("Database setup completed.");
print("Menu items:", canteen.menu.countDocuments({}));
print("Orders:", canteen.orders.countDocuments({}));
print("Indexes created successfully.");
