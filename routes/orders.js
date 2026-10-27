const express=require("express");
const {ObjectId}=require("mongodb");
const FLOW=["placed","preparing","ready","collected"];
const oid=s=>typeof s==="string"&&/^[\da-f]{24}$/i.test(s)?new ObjectId(s):null;
module.exports=(menu,orders)=>{
 const r=express.Router();
 r.get("/",async(req,res)=>{
  const {status}=req.query;
  if(status!==undefined&&(typeof status!=="string"||!FLOW.includes(status)))return res.status(400).json({error:"Invalid status"});
  return res.json(await orders.find(status?{status}:{}).sort({createdAt:-1}).toArray());
 });
 r.post("/",async(req,res)=>{
  const {customer,items}=req.body||{};
  if(typeof customer!=="string"||!customer.trim()||!Array.isArray(items)||!items.length||items.length>30)
   return res.status(400).json({error:"Customer and 1-30 order items required"});
  const requested=[],seen=new Set();
  for(const x of items){
   const id=oid(x?.menuId);
   if(!id||!Number.isInteger(x.qty)||x.qty<1||x.qty>20||seen.has(String(id)))
    return res.status(400).json({error:"Invalid or duplicate menu item/quantity"});
   seen.add(String(id));requested.push({id,qty:x.qty});
  }
  const found=await menu.find({_id:{$in:requested.map(x=>x.id)}}).toArray();
  const byId=new Map(found.map(x=>[String(x._id),x]));
  const lines=[];let totalPaise=0;
  for(const x of requested){
   const d=byId.get(String(x.id));
   if(!d)return res.status(404).json({error:"Menu item not found"});
   if(!d.available)return res.status(409).json({error:d.name+" is unavailable"});
   const subtotal=Math.round(d.price*100)*x.qty;
   totalPaise+=subtotal;
   lines.push({menuId:d._id,name:d.name,emoji:d.emoji||"",price:d.price,qty:x.qty,subtotal:subtotal/100});
  }
  const now=new Date(),doc={customer:customer.trim(),items:lines,total:totalPaise/100,status:"placed",createdAt:now,updatedAt:now};
  const result=await orders.insertOne(doc);
  return res.status(201).json({...doc,_id:result.insertedId});
 });
 r.patch("/:id/status",async(req,res)=>{
  const id=oid(req.params.id);if(!id)return res.status(400).json({error:"Invalid order ID"});
  const next=req.body?.status;
  if(!FLOW.includes(next))return res.status(400).json({error:"Invalid status"});
  const current=await orders.findOne({_id:id});
  if(!current)return res.status(404).json({error:"Order not found"});
  if(FLOW.indexOf(next)!==FLOW.indexOf(current.status)+1)return res.status(400).json({error:"Invalid status transition"});
  const result=await orders.updateOne({_id:id,status:current.status},{$set:{status:next,updatedAt:new Date()}});
  if(!result.matchedCount)return res.status(409).json({error:"Order changed; retry"});
  return res.json(await orders.findOne({_id:id}));
 });
 return r;
};
