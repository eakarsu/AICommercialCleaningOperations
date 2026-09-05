const test=require('node:test'),assert=require('node:assert/strict');
const p=require('../domain/serviceWorkflow');
test('open SLA exceptions block acceptance as well as billing',()=>{
 assert.throws(()=>p.transitionService('submitted','accepted','supervisor',{inspectionComplete:true,evidenceVerified:true,openExceptionCount:1}),/SLA/);
 assert.throws(()=>p.transitionService('accepted','invoiced','worker',{openExceptionCount:0}),/authority/);
});
test('missing and duplicated inspection evidence cannot manufacture a passing score',()=>{
 assert.throws(()=>p.inspectionScore([{id:'a',weight:1,score:null}]),/invalid/);
 assert.throws(()=>p.inspectionScore([{id:'a',weight:1,score:100},{id:'a',weight:1,score:100}]),/unique/);
 assert.throws(()=>p.reconcile({approvedMinutes:null,clockedMinutes:0,approvedExpenses:0,invoiceLaborMinutes:0,invoiceExpenses:0}),/non-negative/);
});
