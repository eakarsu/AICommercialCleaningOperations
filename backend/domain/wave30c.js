'use strict';
// Wave 30C: deterministic, honest helpers (no provider call, no DB).
function esc(v){ if(v===null||v===undefined) return ''; const s=String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCSV(rows){ if(!rows||!rows.length) return ''; const keys=[...new Set(rows.flatMap(r=>Object.keys(r||{})))]; return [keys.join(','),...rows.map(r=>keys.map(k=>esc(r?r[k]:'')).join(','))].join('\n'); }
function filterRecords(rows, q={}, searchFields=[]){
  const search=String(q.search||q.q||'').toLowerCase();
  return (rows||[]).filter(r=>{
    if(search){ const hay=searchFields.map(f=>String(r[f]??'')).join(' ').toLowerCase(); if(!hay.includes(search)) return false; }
    for(const k of ['status','priority','genre','type','kind','category']){
      if(q[k] && String(r[k]??'').toLowerCase()!==String(q[k]).toLowerCase()) return false;
    }
    return true;
  });
}
function renderAiSections(result){
  // Readable labelled sections; preserves false / 0 / empty-string / empty-array.
  const lines=[];
  const push=(label,value)=>{
    if(value===undefined) return;
    let v;
    if(value===null) v='(none)';
    else if(Array.isArray(value)) v=value.length?value.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join('; '):'(empty)';
    else if(typeof value==='object') v=JSON.stringify(value);
    else v=String(value); // keeps "false","0",""
    lines.push(`${label}: ${v}`);
  };
  if(!result||typeof result!=='object') return `Result: ${String(result)}`;
  push('AI generated', result.aiGenerated);
  push('Source', result.source);
  if(result.feature) push('Feature', result.feature);
  if(result.note) push('Note', result.note);
  const s=result.sections||result;
  if(s&&typeof s==='object'){ for(const [k,v] of Object.entries(s)){ if(['aiGenerated','source','feature','note','sections','rendered'].includes(k)) continue; push(k, v); } }
  return lines.join('\n');
}
function buildFallback(feature, records){
  const rows=Array.isArray(records)?records:[];
  const byStatus={}, byCategory={};
  let missingTitle=0;
  for(const r of rows){ const st=String(r.status??r.state??'unknown'); byStatus[st]=(byStatus[st]||0)+1; const cat=String(r.genre??r.type??r.category??r.kind??'unknown'); byCategory[cat]=(byCategory[cat]||0)+1; if(!String(r.title??r.name??r.tenantName??'').trim()) missingTitle++; }
  const flags=rows.filter(r=>!String(r.title??r.name??r.tenantName??'').trim()).slice(0,10).map(r=>({id:r.id??null, issue:'missing title/name'}));
  return { aiGenerated:false, source:'deterministic-fallback', feature,
    note:'No AI provider API key configured (OPENROUTER_API_KEY/OPENAI_API_KEY); deterministic summary computed from your records. Not AI-generated.',
    sections:{ recordCount:rows.length, byStatus, byCategory, missingTitleCount:missingTitle, flags, hasRecords: rows.length>0 } };
}
async function maybeCallProvider(feature, records){
  const key=process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY;
  if(!key) return null;
  const isOpenRouter=!!process.env.OPENROUTER_API_KEY;
  const url=isOpenRouter?'https://openrouter.ai/api/v1/chat/completions':'https://api.openai.com/v1/chat/completions';
  const model=process.env.OPENROUTER_MODEL||process.env.OPENAI_MODEL||(isOpenRouter?'anthropic/claude-haiku-4.5':'gpt-4o-mini');
  try{
    const resp=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'Return concise JSON only.'},{role:'user',content:`Feature ${feature}. Analyse these records and return JSON with labelled sections:\n${JSON.stringify(records).slice(0,6000)}`}],max_tokens:800})});
    if(!resp.ok) return null;
    const data=await resp.json(); const content=data.choices?.[0]?.message?.content; if(!content) return null;
    let parsed; try{ parsed=JSON.parse(content.replace(/```json|```/g,'').trim()); }catch{ parsed={summary:content}; }
    return { aiGenerated:true, source:isOpenRouter?'openrouter':'openai', feature, sections:parsed };
  }catch{ return null; }
}
function createTaskStore(){ const tasks=new Map(); let seq=1;
  return { list(uid){ return [...tasks.values()].filter(t=>t.ownerId===uid); },
    create(uid,body){ const t={id:seq++, ownerId:uid, title:String(body.title||'').trim(), status:body.status||'open', priority:body.priority||'medium', notes:body.notes||'', createdAt:new Date().toISOString()}; tasks.set(t.id,t); return t; },
    update(uid,id,body){ const t=tasks.get(Number(id)); if(!t||t.ownerId!==uid) return null; Object.assign(t,{title:body.title??t.title,status:body.status??t.status,priority:body.priority??t.priority,notes:body.notes??t.notes}); return t; } };
}
module.exports={toCSV,filterRecords,renderAiSections,buildFallback,maybeCallProvider,createTaskStore};
