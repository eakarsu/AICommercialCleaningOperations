'use strict';
const {createWave30cRouter}=require('./wave30c');
const auth=require('../middleware/auth');
const pool=require('../db');
async function loadRecords(){ const r=await pool.query('SELECT id,title,client_name,status,priority,scheduled_date FROM work_orders ORDER BY scheduled_date DESC LIMIT 200'); return r.rows; }
module.exports=createWave30cRouter({auth,loadRecords,features:["work-order-triage", "crew-workload-balance", "client-retention-signals"],searchFields:['title','name','client_name']});
