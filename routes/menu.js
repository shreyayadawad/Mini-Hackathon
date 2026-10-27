const express=require("express");
const {ObjectId}=require("mongodb");
const oid=s=>typeof s==="string"&&/^[\da-f]{24}$/i.test(s)?new ObjectId(s):null;
const fields=["name","price","category","emoji","image","available"];
function validate(b,partial=false){
 if(!b||typeof b!=="object"||Array.isArray(b))return "Request body must be a JSON object";
 if(Object.keys(b).some(k=>!fields.includes(k)))return "Unknown menu field provided";
 if(partial&&!Object.keys(b).length)return "Provide at least one field";
 if(!partial&&(!("name" in b)||!("price" in b)||!("category" in b)))return "Name, price and category required";
 for(const k of ["name","category"])if(k in b&&(typeof b[k]!=="string"||!b[k].trim()))return "Invalid "+k;
 if("price" in b&&(!Number.isFinite(b.price)||b.price<=0||Math.abs(b.price*100-Math.round(b.price*100))>1e-7))return "Invalid price";
 if("available" in b&&typeof b.available!=="boolean")return "Invalid availability";
 for(const k of ["emoji","image"])if(k in b&&typeof b[k]!=="string")return "Invalid "+k;
 return null;
}
module.exports=collection=>{
 const r=express.Router();
 r.get("/",async(req,res)=>res.json(await collection.find({}).sort({category:1,name:1}).toArray()));
 r.post("/",async(req,res)=>{
  const e=validate(req.body);if(e)return res.status(400).json({error:e});
  const b=req.body, now=new Date();
  const doc={name:b.name.trim(),price:b.price,category:b.category.trim(),emoji:b.emoji||"",image:b.image||"",available:b.available??true,createdAt:now,updatedAt:now};
  try{const result=await collection.insertOne(doc);return res.status(201).json({...doc,_id:result.insertedId});}
  catch(err){if(err.code===11000)return res.status(409).json({error:"Menu item already exists"});throw err;}
 });
 r.put("/:id",async(req,res)=>{
  const id=oid(req.params.id);if(!id)return res.status(400).json({error:"Invalid menu ID"});
  const e=validate(req.body,true);if(e)return res.status(400).json({error:e});
  const changes={...req.body,updatedAt:new Date()};
  if(changes.name)changes.name=changes.name.trim();
  if(changes.category)changes.category=changes.category.trim();
  try{
   const result=await collection.updateOne({_id:id},{$set:changes});
   if(!result.matchedCount)return res.status(404).json({error:"Menu item not found"});
   return res.json(await collection.findOne({_id:id}));
  }catch(err){if(err.code===11000)return res.status(409).json({error:"Menu item already exists"});throw err;}
 });
 r.delete("/:id",async(req,res)=>{
  const id=oid(req.params.id);if(!id)return res.status(400).json({error:"Invalid menu ID"});
  const result=await collection.deleteOne({_id:id});
  if(!result.deletedCount)return res.status(404).json({error:"Menu item not found"});
  return res.json({message:"Menu item deleted"});
 });
 return r;
};
