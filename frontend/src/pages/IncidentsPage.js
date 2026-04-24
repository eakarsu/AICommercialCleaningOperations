import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { reported: 'badge-blue', investigating: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray', escalated: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const severityBadge = (s) => {
  const map = { minor: 'badge-gray', moderate: 'badge-yellow', major: 'badge-red', critical: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
};

const typeBadge = (t) => <span className="badge badge-blue">{t?.replace('_', ' ')}</span>;

const formatCost = (val) => val ? `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

const insuranceBadge = (val) => val ? <span className="badge badge-red">Yes</span> : <span className="badge badge-green">No</span>;

const emptyIncident = { title: '', type: 'other', severity: 'minor', location: '', reported_by: '', incident_date: '', description: '', actions_taken: '', status: 'reported', cost_impact: '', insurance_claim: false, follow_up_date: '', resolution_notes: '' };

const IncidentsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyIncident);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/incidents').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyIncident); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this incident report?')) return;
    await api.delete(`/incidents/${id}`);
    toast.success('Incident deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/incidents/${formData.id}`, formData); toast.success('Incident updated'); }
      else { await api.post('/incidents', formData); toast.success('Incident created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving incident'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/incidents/${id}/analyze`);
      setSelected(data.record);
      toast.success('AI analysis complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading incidents...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>⚠️ Incident Reports</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Incident</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Type</th><th>Severity</th><th>Location</th><th>Reported By</th><th>Date</th><th>Cost Impact</th><th>Insurance Claim</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td>{typeBadge(item.type)}</td>
                <td>{severityBadge(item.severity)}</td>
                <td>{item.location}</td>
                <td>{item.reported_by}</td>
                <td>{item.incident_date}</td>
                <td>{formatCost(item.cost_impact)}</td>
                <td>{insuranceBadge(item.insurance_claim)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No incident reports found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.title}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{typeBadge(selected.type)}</div></div>
                <div className="detail-item"><div className="detail-label">Severity</div><div className="detail-value">{severityBadge(selected.severity)}</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
                <div className="detail-item"><div className="detail-label">Reported By</div><div className="detail-value">{selected.reported_by}</div></div>
                <div className="detail-item"><div className="detail-label">Incident Date</div><div className="detail-value">{selected.incident_date}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Cost Impact</div><div className="detail-value">{formatCost(selected.cost_impact)}</div></div>
                <div className="detail-item"><div className="detail-label">Insurance Claim</div><div className="detail-value">{insuranceBadge(selected.insurance_claim)}</div></div>
                <div className="detail-item"><div className="detail-label">Follow-up Date</div><div className="detail-value">{selected.follow_up_date || 'Not set'}</div></div>
                {selected.description && <div className="detail-item detail-full"><div className="detail-label">Description</div><div className="detail-value">{selected.description}</div></div>}
                {selected.actions_taken && <div className="detail-item detail-full"><div className="detail-label">Actions Taken</div><div className="detail-value">{selected.actions_taken}</div></div>}
                {selected.witnesses && selected.witnesses.length > 0 && <div className="detail-item detail-full"><div className="detail-label">Witnesses</div><div className="detail-value">{selected.witnesses.join(', ')}</div></div>}
                {selected.resolution_notes && <div className="detail-item detail-full"><div className="detail-label">Resolution Notes</div><div className="detail-value">{selected.resolution_notes}</div></div>}
              </div>
              {selected.ai_risk_analysis && <AIOutput data={selected.ai_risk_analysis} title="Incident AI Risk Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Risk Analysis'}
              </button>
              <button className="btn btn-primary" onClick={() => handleEdit(selected)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEdit ? 'Edit Incident Report' : 'New Incident Report'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="injury">Injury</option><option value="property_damage">Property Damage</option><option value="chemical_spill">Chemical Spill</option><option value="equipment_failure">Equipment Failure</option><option value="client_complaint">Client Complaint</option><option value="safety_violation">Safety Violation</option><option value="theft">Theft</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Severity</label>
                    <select value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value })}>
                      <option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Location</label><input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} required /></div>
                  <div className="form-group"><label>Reported By</label><input value={formData.reported_by || ''} onChange={e => setFormData({ ...formData, reported_by: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Incident Date</label><input type="date" value={formData.incident_date} onChange={e => setFormData({ ...formData, incident_date: e.target.value })} required /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="reported">Reported</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                <div className="form-group"><label>Actions Taken</label><textarea value={formData.actions_taken || ''} onChange={e => setFormData({ ...formData, actions_taken: e.target.value })} /></div>
                <div className="form-row">
                  <div className="form-group"><label>Cost Impact</label><input type="number" step="0.01" value={formData.cost_impact} onChange={e => setFormData({ ...formData, cost_impact: e.target.value })} /></div>
                  <div className="form-group"><label>Insurance Claim</label>
                    <select value={formData.insurance_claim ? 'yes' : 'no'} onChange={e => setFormData({ ...formData, insurance_claim: e.target.value === 'yes' })}>
                      <option value="no">No</option><option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Follow-up Date</label><input type="date" value={formData.follow_up_date || ''} onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Resolution Notes</label><textarea value={formData.resolution_notes || ''} onChange={e => setFormData({ ...formData, resolution_notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{isEdit ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentsPage;
