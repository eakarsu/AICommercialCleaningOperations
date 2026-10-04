import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { discardQueuedPhoto, listQueuedPhotos, queueServicePhoto } from '../services/offlineServicePhotos';

const message = error => error.response?.data?.error || error.message;
const next = { scheduled: ['assigned', 'cancelled'], assigned: ['in_progress', 'exception'], in_progress: ['submitted', 'exception'], submitted: ['accepted', 'rework'], rework: ['in_progress'], exception: ['assigned', 'cancelled'], accepted: ['invoiced'] };
const blankItem = () => ({ id: '', weight: 1, score: 100, critical: false });

export default function GovernedServiceRuns() {
  const { user } = useAuth();
  const photoInput = useRef(null);
  const syncingPhotos = useRef(false);
  const [plans, setPlans] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [sourceCount, setSourceCount] = useState(0);
  const [form, setForm] = useState({ planId: '', occurrenceKey: '', scheduledStart: '', scheduledEnd: '', crewId: '' });
  const [items, setItems] = useState([blankItem()]);
  const [reason, setReason] = useState('');
  const [billingCandidates, setBillingCandidates] = useState([]);
  const [billingForm, setBillingForm] = useState({ invoiceReference: '', invoiceSha256: '', timeEntryRefs: '', expenseRefs: '', approvedMinutes: '', clockedMinutes: '', approvedExpenses: '', invoiceLaborMinutes: '', invoiceExpenses: '' });
  const [billingReview, setBillingReview] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoNote, setPhotoNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [a, b, c] = await Promise.all([
        api.get('/service-workflow/plans'), api.get('/service-workflow/runs'), api.get('/service-workflow/inspection-priorities'),
      ]);
      setPlans(Array.isArray(a.data.items) ? a.data.items : []);
      setRuns(Array.isArray(b.data.items) ? b.data.items : []);
      if (user?.id) localStorage.setItem(`service-run-summaries:${user.id}`, JSON.stringify({ plans: a.data.items, runs: b.data.items }));
      setPriorities(Array.isArray(c.data.items) ? c.data.items : []);
      setSourceCount(Number(c.data.inspectedCount || 0));
      setError('');
    } catch (err) {
      const cached = user?.id ? localStorage.getItem(`service-run-summaries:${user.id}`) : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setPlans(Array.isArray(parsed.plans) ? parsed.plans : []);
          setRuns(Array.isArray(parsed.runs) ? parsed.runs : []);
          setNotice('Showing saved run summaries. Reconnect to refresh service details.');
          return;
        } catch { /* Invalid cached data is ignored. */ }
      }
      setError(message(err));
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  async function openRun(id) {
    setBusy(true); setError('');
    try {
      const [response, billingResponse] = await Promise.all([
        api.get(`/service-workflow/runs/${id}`), api.get(`/service-workflow/runs/${id}/billing-candidates`),
      ]);
      setSelected(response.data);
      setPhotoPreview('');
      setBillingCandidates(Array.isArray(billingResponse.data.items) ? billingResponse.data.items : []);
      const saved = localStorage.getItem(`service-inspection-draft:${user?.id}:${id}`);
      setItems(saved ? JSON.parse(saved) : [blankItem()]);
      setPendingPhotos(await listQueuedPhotos(user?.id, id));
    } catch (err) {
      const cachedRun = runs.find(run => run.id === id);
      if (!navigator.onLine && cachedRun) {
        setSelected({ run: cachedRun, evidence: [], inspections: [], exceptions: [] });
        setBillingCandidates([]);
        const saved = localStorage.getItem(`service-inspection-draft:${user?.id}:${id}`);
        setItems(saved ? JSON.parse(saved) : [blankItem()]);
        setPendingPhotos(await listQueuedPhotos(user?.id, id));
        setNotice('Offline run summary. Evidence, inspections, and exceptions need a connection to refresh.');
      } else setError(message(err));
    }
    finally { setBusy(false); }
  }

  async function uploadPhoto(event) {
    event.preventDefault();
    if (!selected?.run?.id || !photoFile) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await queueServicePhoto(user?.id, selected.run.id, photoFile, photoNote);
      setPhotoFile(null); setPhotoNote('');
      if (photoInput.current) photoInput.current.value = '';
      setPendingPhotos(await listQueuedPhotos(user?.id, selected.run.id));
      if (online) await syncPendingPhotos(selected.run.id);
      else setNotice('Photo saved on this device. Sync it after reconnecting; it is not yet server evidence.');
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function syncPendingPhotos(runId) {
    if (!online || !user?.id || syncingPhotos.current) return;
    syncingPhotos.current = true;
    setBusy(true); setError('');
    let sent = 0; let failure = null;
    try {
      for (const item of await listQueuedPhotos(user.id, runId)) {
        const data = new FormData();
        data.append('photo', item.file, item.fileName);
        data.append('note', item.note);
        data.append('deviceTimestamp', item.capturedAt);
        data.append('clientUploadId', item.id);
        try {
          await api.post(`/service-workflow/runs/${runId}/photo-evidence`, data, { headers: { 'Content-Type': undefined } });
          await discardQueuedPhoto(item.id);
          sent += 1;
        } catch (err) { failure = err; break; }
      }
      setPendingPhotos(await listQueuedPhotos(user.id, runId));
      if (sent) await openRun(runId);
      if (failure) setError(`${message(failure)}. The photo remains saved on this device for retry or discard.`);
      else if (sent) setNotice(`${sent} photo${sent === 1 ? '' : 's'} stored with checksums. An inspector must review the images.`);
    } catch (err) { setError(message(err)); }
    finally { syncingPhotos.current = false; setBusy(false); }
  }

  async function discardPhoto(id) {
    if (!window.confirm('Discard this unsynced photo from this device?')) return;
    try {
      await discardQueuedPhoto(id);
      setPendingPhotos(await listQueuedPhotos(user?.id, selected.run.id));
    } catch (err) { setError(message(err)); }
  }

  async function viewPhoto(evidenceId) {
    if (!selected?.run?.id) return;
    setBusy(true); setError('');
    try {
      const response = await api.get(`/service-workflow/runs/${selected.run.id}/photo-evidence/${evidenceId}`, { responseType: 'blob' });
      setPhotoPreview(URL.createObjectURL(response.data));
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function createBillingCandidate(event) {
    event.preventDefault();
    if (!selected?.run?.id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.post(`/service-workflow/runs/${selected.run.id}/billing-candidates`, {
        invoiceReference: billingForm.invoiceReference.trim(), invoiceSha256: billingForm.invoiceSha256.trim(),
        sourceRefs: { timeEntryRefs: billingForm.timeEntryRefs.split(',').map(value => value.trim()).filter(Boolean), expenseRefs: billingForm.expenseRefs.split(',').map(value => value.trim()).filter(Boolean) },
        inputs: { approvedMinutes: billingForm.approvedMinutes, clockedMinutes: billingForm.clockedMinutes,
          approvedExpenses: billingForm.approvedExpenses, invoiceLaborMinutes: billingForm.invoiceLaborMinutes, invoiceExpenses: billingForm.invoiceExpenses },
      });
      setNotice('Candidate reconciliation recorded for independent review. No invoice was posted or paid.');
      await openRun(selected.run.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function reviewBillingCandidate(candidateId, decision) {
    if (!selected?.run?.id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.post(`/service-workflow/runs/${selected.run.id}/billing-candidates/${candidateId}/review`, {
        decision, reason: (billingReview[candidateId] || '').trim(),
      });
      setNotice(`Candidate ${decision} by an independent reviewer. Accounting posting and payment remain unverified.`);
      await openRun(selected.run.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  function editItems(updated) {
    setItems(updated);
    if (selected?.run?.id && user?.id) localStorage.setItem(`service-inspection-draft:${user.id}:${selected.run.id}`, JSON.stringify(updated));
  }

  async function createRun(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await api.post('/service-workflow/runs', { ...form,
        scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      });
      setNotice('Service occurrence scheduled.');
      await load();
      const item = Array.isArray(response.data) ? response.data[0] : response.data;
      if (item?.id) await openRun(item.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function inspect() {
    if (!selected?.run?.id) return;
    if (!online) { setNotice('Checklist draft saved on this device. Submit when connectivity returns.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await api.post(`/service-workflow/runs/${selected.run.id}/inspection`, { items, rubric: { source: 'governed-service-ui', itemIds: items.map(item => item.id) } });
      localStorage.removeItem(`service-inspection-draft:${user?.id}:${selected.run.id}`);
      setNotice('Inspection recorded for supervisor review.');
      await load(); await openRun(selected.run.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function transition(status) {
    if (!selected?.run?.id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.post(`/service-workflow/runs/${selected.run.id}/transition`, { status, reason: reason.trim() });
      setReason(''); setNotice(`Service run moved to ${status.replace(/_/g, ' ')}.`);
      await load(); await openRun(selected.run.id);
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  async function explainPriorities() {
    setBusy(true); setError(''); setExplanations([]);
    try {
      const response = await api.post('/service-workflow/inspection-priorities/explain', {});
      setExplanations(Array.isArray(response.data.items) ? response.data.items : []);
      setNotice('AI explanations cite checklist inspections only. A supervisor must review them.');
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <div className="page-content" style={{ maxWidth: 1300, margin: '0 auto', padding: 24 }}>
    <div className="page-header"><h1>Governed recurring service</h1></div>
    <p>Schedule a contract occurrence, save a checklist draft on this device, record supervisor inspection, and review signed evidence and exceptions. A local draft is not server evidence until submitted.</p>
    {error && <p role="alert" style={{ color: '#b42332' }}>{error}</p>}
    {notice && <p role="status" style={{ color: '#147a3d' }}>{notice}</p>}
    {!online && <p role="status">Offline: checklist edits and queued photos are stored only on this device.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: 20 }}>
      <section className="card" style={{ padding: 18 }}><h2>Service runs</h2>
        <form onSubmit={createRun} className="form-grid">
          <label>Service plan<select required value={form.planId} onChange={event => setForm({ ...form, planId: event.target.value })}><option value="">Choose plan</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.site_name} · {plan.contract_id}</option>)}</select></label>
          <label>Occurrence key<input required value={form.occurrenceKey} onChange={event => setForm({ ...form, occurrenceKey: event.target.value })} /></label>
          <label>Scheduled start<input required type="datetime-local" value={form.scheduledStart} onChange={event => setForm({ ...form, scheduledStart: event.target.value })} /></label>
          <label>Scheduled end<input required type="datetime-local" value={form.scheduledEnd} onChange={event => setForm({ ...form, scheduledEnd: event.target.value })} /></label>
          <label>Crew ID<input value={form.crewId} onChange={event => setForm({ ...form, crewId: event.target.value })} /></label>
          <button className="btn btn-primary" disabled={busy || !online}>Schedule occurrence</button>
        </form>
        {!plans.length && <p>No governed service plans are provisioned in this tenant.</p>}
        <ul style={{ paddingLeft: 18 }}>{runs.map(run => <li key={run.id}><button className="btn btn-link" onClick={() => openRun(run.id)}>{run.site_name} · {new Date(run.scheduled_start).toLocaleString()} · {run.status}</button></li>)}</ul>
      </section>
      <section className="card" style={{ padding: 18 }}><h2>Run detail</h2>
        {!selected ? <p>Select a service run.</p> : <>
          <p><strong>{selected.run.occurrence_key}</strong> · {selected.run.status}</p>
          <h3>Source evidence</h3><ul>{selected.evidence.map(item => <li key={item.id}>{item.kind}: {item.object_key} · SHA {item.sha256.slice(0, 12)}… {item.kind === 'photo' && item.object_key.startsWith('db-photo:') && <button className="btn btn-link" disabled={busy || !online} onClick={() => viewPhoto(item.id)}>View photo</button>}</li>)}</ul>{!selected.evidence.length && <p>No evidence attached yet.</p>}
          {photoPreview && <img src={photoPreview} alt="Selected service-run evidence" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }} />}
          <form onSubmit={uploadPhoto} className="form-grid"><label>Capture or choose evidence photo<input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required onChange={event => setPhotoFile(event.target.files?.[0] || null)} /></label><label>Photo note<input maxLength={500} value={photoNote} onChange={event => setPhotoNote(event.target.value)} /></label><button className="btn btn-secondary" disabled={busy || !photoFile}>{online ? 'Save and sync photo' : 'Save photo on device'}</button></form>
          {pendingPhotos.length > 0 && <div><h4>Photos awaiting sync ({pendingPhotos.length})</h4><p>Stored in this browser for the signed-in user. They are not server evidence until synced.</p><ul>{pendingPhotos.map(item => <li key={item.id}>{item.fileName} · captured {new Date(item.capturedAt).toLocaleString()}{item.note ? ` · ${item.note}` : ''} <button className="btn btn-link" disabled={busy} onClick={() => discardPhoto(item.id)}>Discard</button></li>)}</ul><button className="btn btn-secondary" disabled={busy || !online} onClick={() => syncPendingPhotos(selected.run.id)}>Sync pending photos</button></div>}
          <h3>Inspection checklist</h3>
          {items.map((item, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input aria-label="Checklist item ID" placeholder="Item ID" value={item.id} onChange={event => editItems(items.map((row, i) => i === index ? { ...row, id: event.target.value } : row))} />
            <input aria-label="Weight" type="number" min="0.1" step="0.1" value={item.weight} onChange={event => editItems(items.map((row, i) => i === index ? { ...row, weight: Number(event.target.value) } : row))} />
            <input aria-label="Score" type="number" min="0" max="100" value={item.score} onChange={event => editItems(items.map((row, i) => i === index ? { ...row, score: Number(event.target.value) } : row))} />
            <label><input type="checkbox" checked={item.critical} onChange={event => editItems(items.map((row, i) => i === index ? { ...row, critical: event.target.checked } : row))} /> Critical</label>
          </div>)}
          <button className="btn btn-secondary" onClick={() => editItems([...items, blankItem()])}>Add item</button>
          <button className="btn btn-primary" onClick={inspect} disabled={busy || !items.some(item => item.id.trim())}>{online ? 'Submit inspection' : 'Save draft locally'}</button>
          <h3>Inspections</h3><ul>{selected.inspections.map(item => <li key={item.id}>{new Date(item.created_at).toLocaleString()} · {item.score}% · {item.passed ? 'passed' : 'needs attention'}</li>)}</ul>
          <h3>Open exceptions</h3><ul>{selected.exceptions.filter(item => item.status === 'open').map(item => <li key={item.id}>{item.type} · owner {item.owner_id}</li>)}</ul>
          <h3>Advance workflow</h3><label>Decision reason<input value={reason} onChange={event => setReason(event.target.value)} /></label><div>{(next[selected.run.status] || []).map(status => <button className="btn btn-secondary" key={status} disabled={busy || !online} onClick={() => transition(status)}>{status.replace(/_/g, ' ')}</button>)}</div>
          <h3>Billing reconciliation</h3>
          <p>Compare an invoice digest and cited time and expense references with the accepted service run. A candidate and its review do not post or pay an invoice.</p>
          {['accepted', 'invoiced'].includes(selected.run.status) && <form onSubmit={createBillingCandidate} className="form-grid">
            <label>Invoice reference<input required value={billingForm.invoiceReference} onChange={event => setBillingForm({ ...billingForm, invoiceReference: event.target.value })} /></label>
            <label>Invoice SHA-256<input required pattern="[a-fA-F0-9]{64}" title="64 hexadecimal characters" value={billingForm.invoiceSha256} onChange={event => setBillingForm({ ...billingForm, invoiceSha256: event.target.value })} /></label>
            <label>Time-entry references, comma separated<input required value={billingForm.timeEntryRefs} onChange={event => setBillingForm({ ...billingForm, timeEntryRefs: event.target.value })} /></label>
            <label>Expense references, comma separated<input value={billingForm.expenseRefs} onChange={event => setBillingForm({ ...billingForm, expenseRefs: event.target.value })} /></label>
            {['approvedMinutes', 'clockedMinutes', 'approvedExpenses', 'invoiceLaborMinutes', 'invoiceExpenses'].map(field => <label key={field}>{field.replace(/([A-Z])/g, ' $1')}<input required type="number" min="0" step="any" value={billingForm[field]} onChange={event => setBillingForm({ ...billingForm, [field]: event.target.value })} /></label>)}
            <button className="btn btn-primary" disabled={busy || !online}>Save billing candidate</button>
          </form>}
          <ul>{billingCandidates.map(candidate => <li key={candidate.id}>
            <strong>{candidate.invoice_reference}</strong> · {candidate.review_status} · labor variance {candidate.calculation?.laborVariance}, invoice labor variance {candidate.calculation?.invoiceLaborVariance}, expense variance {candidate.calculation?.expenseVariance}. Source refs: {(candidate.source_refs?.timeEntryRefs || []).join(', ') || 'none'}.
            {candidate.review_status === 'pending' && <div><label>Independent review reason<input value={billingReview[candidate.id] || ''} onChange={event => setBillingReview({ ...billingReview, [candidate.id]: event.target.value })} /></label><button className="btn btn-secondary" disabled={busy || !online || (billingReview[candidate.id] || '').trim().length < 8} onClick={() => reviewBillingCandidate(candidate.id, 'accepted')}>Accept comparison</button><button className="btn btn-secondary" disabled={busy || !online || (billingReview[candidate.id] || '').trim().length < 8} onClick={() => reviewBillingCandidate(candidate.id, 'rejected')}>Reject comparison</button></div>}
          </li>)}</ul>
        </>}
      </section>
    </div>
    <section className="card" style={{ padding: 18, marginTop: 20 }}><h2>Checklist failures to review</h2><p>Ranked from {sourceCount} recorded inspections. This is a deterministic frequency summary; a supervisor decides whether a site needs rework.</p><ul>{priorities.map(item => <li key={item.checklistItemId}>{item.checklistItemId}: {item.failureCount} critical failures ({item.inspectionIds.length} inspection records)</li>)}</ul>{!priorities.length && <p>No critical checklist failures in the inspected history.</p>}{priorities.length > 0 && <button className="btn btn-secondary" disabled={busy || !online} onClick={explainPriorities}>Explain with AI from cited checklist history</button>}{explanations.length > 0 && <ul>{explanations.map(item => <li key={item.checklistItemId}><strong>{item.checklistItemId}:</strong> {item.reason} <small>Inspections: {item.inspectionIds.join(', ')}</small></li>)}</ul>}</section>
  </div>;
}
