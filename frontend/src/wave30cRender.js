// Wave 30C: render AI JSON as readable labelled sections, preserving false/0/empty.
export function renderAiSections(result){
  if(!result||typeof result!=='object') return `Result: ${String(result)}`;
  const lines=[]; const push=(l,v)=>{ if(v===undefined) return; let s; if(v===null)s='(none)'; else if(Array.isArray(v))s=v.length?v.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join('; '):'(empty)'; else if(typeof v==='object')s=JSON.stringify(v); else s=String(v); lines.push(`${l}: ${s}`); };
  push('AI generated',result.aiGenerated); push('Source',result.source); if(result.feature)push('Feature',result.feature); if(result.note)push('Note',result.note);
  const s=result.sections||result; for(const [k,v] of Object.entries(s)){ if(['aiGenerated','source','feature','note','sections','rendered'].includes(k))continue; push(k,v); }
  return lines.join('\n');
}
export default renderAiSections;
