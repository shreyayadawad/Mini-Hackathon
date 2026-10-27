const {MongoClient}=require("mongodb");
const client=new MongoClient(process.env.MONGO_URL||"mongodb://127.0.0.1:27017");
const items=[
["Idli (2 pcs)",25,"Meals","🍚"],["Masala Dosa",50,"Meals","🥞"],["Veg Sandwich",40,"Snacks","🥪"],["Samosa",20,"Snacks","🥟"],["Paneer Frankie",55,"Snacks","🌯"],["Veg Pulao",60,"Meals","🍚"],["Chicken Fried Rice",90,"Meals","🍗"],["Veg Noodles",60,"Meals","🍜"],["French Fries",50,"Snacks","🍟"],["Cheese Burger",70,"Snacks","🍔"],["Tea",15,"Drinks","🍵"],["Coffee",20,"Drinks","☕"],["Fresh Lime Juice",25,"Drinks","🍋"],["Chocolate Milkshake",50,"Drinks","🥤"],["Ice Cream",30,"Desserts","🍨"]
];
(async()=>{try{
 await client.connect();
 const menu=client.db(process.env.DB_NAME||"campus_canteen").collection("menu");
 await menu.createIndex({name:1},{unique:true,collation:{locale:"en",strength:2}});
 let added=0;
 for(const [name,price,category,emoji] of items){
  const now=new Date();
  const out=await menu.updateOne({name},{$setOnInsert:{name,price,category,emoji,image:"",available:true,createdAt:now,updatedAt:now}},{upsert:true,collation:{locale:"en",strength:2}});
  if(out.upsertedCount)added++;
 }
 console.log("Menu seed complete. Added "+added+" new items; retained existing menu and orders.");
}catch(err){console.error(err);process.exitCode=1;}finally{await client.close();}})();
