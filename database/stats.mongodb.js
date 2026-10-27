
const canteen = db.getSiblingDB("campus_canteen");

const stats = canteen.orders.aggregate([
  {
    $match: {
      $expr: {
        $eq: [
          {
            $dateTrunc: {
              date: "$createdAt",
              unit: "day",
              timezone: "Asia/Kolkata"
            }
          },
          {
            $dateTrunc: {
              date: "$$NOW",
              unit: "day",
              timezone: "Asia/Kolkata"
            }
          }
        ]
      }
    }
  },
  {
    $group: {
      _id: null,

      totalOrders: { $sum: 1 },

      completedOrders: {
        $sum: {
          $cond: [
            { $eq: ["$status", "completed"] },
            1,
            0
          ]
        }
      },

      revenue: {
        $sum: {
          $cond: [
            { $eq: ["$status", "completed"] },
            "$total",
            0
          ]
        }
      }
    }
  }
]).toArray();

const result = stats[0] || {
  totalOrders: 0,
  completedOrders: 0,
  revenue: 0
};

print("DAILY CANTEEN STATISTICS");
print("-----------------------");
print("Orders today:", result.totalOrders);
print("Completed orders:", result.completedOrders);
print("Revenue: ₹" + result.revenue);
