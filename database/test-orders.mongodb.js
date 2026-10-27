
const canteen = db.getSiblingDB("campus_canteen");

const testTag = "person4-stats-demo";

// Remove only our previous test orders.
canteen.orders.deleteMany({ testTag });

const now = new Date();
const yesterday = new Date(
  now.getTime() - 24 * 60 * 60 * 1000
);

canteen.orders.insertMany([
  {
    customer: "Student A",
    items: [
      {
        name: "Veg Burger",
        price: 60,
        qty: 2
      }
    ],
    total: 120,
    status: "completed",
    createdAt: now,
    testTag
  },
  {
    customer: "Student B",
    items: [
      {
        name: "Masala Dosa",
        price: 50,
        qty: 1
      },
      {
        name: "Cold Coffee",
        price: 40,
        qty: 1
      }
    ],
    total: 90,
    status: "pending",
    createdAt: now,
    testTag
  },
  {
    customer: "Student C",
    items: [
      {
        name: "Veg Fried Rice",
        price: 80,
        qty: 1
      }
    ],
    total: 80,
    status: "completed",
    createdAt: yesterday,
    testTag
  }
]);

print("Test orders inserted successfully!");
print(
  "Test order count:",
  canteen.orders.countDocuments({ testTag })
);
