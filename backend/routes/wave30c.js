'use strict';
const express=require('express');
const {toCSV,filterRecords,renderAiSections,buildFallback,maybeCallProvider,createTaskStore}=require('../domain/wave30c');
function createWave30cRouter({auth, loadRecords, features=[], searchFields=[]}){
  const router=express.Router(); const store=createTaskStore();
  const uid=req=>String(req.user?.id??req.user?.sub??req.user?.email??'unknown');
  router.use(auth);
  router.get('/tasks',(req,res)=>res.json({data:store.list(uid(req))}));
  router.post('/tasks',(req,res)=>{ if(!String(req.body?.title||'').trim()) return res.status(400).json({error:'title is required'}); return res.status(201).json(store.create(uid(req),req.body)); });
  const upd=(req,res)=>{ const t=store.update(uid(req),req.params.id,req.body||{}); return t?res.json(t):res.status(404).json({error:'Task not found'}); };
  router.put('/tasks/:id',upd); router.patch('/tasks/:id',upd);
  async function records(req,res){ try{ const rows=await loadRecords(req); return filterRecords(rows,req.query,searchFields); }catch(e){ return res.status(503).json({error:'Main records unavailable'}); } }
  router.get('/records',async(req,res)=>{ const rows=await records(req,res); if(!res.headersSent) res.json({data:rows,total:rows.length}); });
  router.get('/records/export',async(req,res)=>{ const rows=await records(req,res); if(res.headersSent) return; const fmt=String(req.query.format||'json').toLowerCase(); if(fmt==='csv'){ res.setHeader('Content-Type','text/csv'); return res.send(toCSV(rows)); } return res.json({data:rows}); });
  router.get('/records/export.csv',async(req,res)=>{ const rows=await records(req,res); if(!res.headersSent){ res.setHeader('Content-Type','text/csv'); res.send(toCSV(rows)); } });
  router.get('/records/export.json',async(req,res)=>{ const rows=await records(req,res); if(!res.headersSent) res.json({data:rows}); });
  router.post('/ai/:feature',async(req,res)=>{
    const feature=req.params.feature; if(!features.includes(feature)) return res.status(404).json({error:'Unknown AI feature'});
    let rows=Array.isArray(req.body?.records)?req.body.records:null;
    if(!rows){ try{ rows=await loadRecords(req); }catch{ return res.status(503).json({error:'Main records unavailable'}); } }
    const ai=await maybeCallProvider(feature,rows);
    const result=ai||buildFallback(feature,rows);
    return res.json({...result, rendered:renderAiSections(result)});
  });
  return router;
}
module.exports={createWave30cRouter};
