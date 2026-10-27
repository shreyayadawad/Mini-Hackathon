const express=require("express");
module.exports=orders=>{
 const r=express.Router();
 r.get("/today",async(req,res)=>{
  const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"});
  const date=fmt.format(new Date());
  const start=new Date(date+"T00:00:00+05:30"),end=new Date(start.getTime()+86400000);
  const [x]=await orders.aggregate([
   {$match:{createdAt:{$gte:start,$lt:end}}},
   {$facet:{
    totals:[{$group:{_id:null,sales:{$sum:"$total"},orders:{$sum:1}}}],
    statuses:[{$group:{_id:"$status",count:{$sum:1}}}],
    topItems:[{$unwind:"$items"},{$group:{_id:"$items.name",name:{$first:"$items.name"},emoji:{$first:"$items.emoji"},qty:{$sum:"$items.qty"},revenue:{$sum:"$items.subtotal"}}},{$sort:{qty:-1}},{$limit:5}]
   }}
  ]).toArray();
  const byStatus=Object.fromEntries(["placed","preparing","ready","collected"].map(s=>[s,0]));
  for(const row of x.statuses)byStatus[row._id]=row.count;
  res.json({date,sales:x.totals[0]?.sales||0,orders:x.totals[0]?.orders||0,byStatus,topItems:x.topItems});
 });
 return r;
};
