import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { pending: 'badge-yellow', passed: 'badge-green', failed: 'badge-red', needs_review: 'badge-purple' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const emptyInspection = { location_name: '', inspector_name: '', inspection_date: '', overall_score: '', status: 'pending', notes: '', follow_up_required: false, categories: {} };

const InspectionsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyInspection);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/inspections').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyInspection); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inspection?')) return;
    await api.delete(`/inspections/${id}`);
    toast.success('Inspection deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/inspections/${formData.id}`, formData); toast.success('Inspection updated'); }
      else { await api.post('/inspections', formData); toast.success('Inspection created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving inspection'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/inspections/${id}/analyze`);
      setSelected(data.inspection);
      toast.success('AI analysis complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  const scoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading inspections...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>✅ Quality Verification</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Inspection</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Location</th><th>Inspector</th><th>Date</th><th>Score</th><th>Follow-up</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.location_name}</td>
                <td>{item.inspector_name}</td>
                <td>{item.inspection_date}</td>
                <td><span style={{ color: scoreColor(item.overall_score), fontWeight: 700, fontSize: '16px' }}>{item.overall_score}</span>/10</td>
                <td>{item.follow_up_required ? <span className="badge badge-red">Required</span> : <span className="badge badge-green">No</span>}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No inspections found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.location_name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Inspector</div><div className="detail-value">{selected.inspector_name}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{selected.inspection_date}</div></div>
                <div className="detail-item"><div className="detail-label">Overall Score</div><div className="detail-value" style={{ color: scoreColor(selected.overall_score), fontSize: '24px' }}>{selected.overall_score}/10</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Follow-up Required</div><div className="detail-value">{selected.follow_up_required ? 'Yes' : 'No'}</div></div>
                {selected.notes && <div className="detail-item detail-full"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes}</div></div>}
                {selected.follow_up_notes && <div className="detail-item detail-full"><div className="detail-label">Follow-up Notes</div><div className="detail-value">{selected.follow_up_notes}</div></div>}
              </div>
              {selected.categories && Object.keys(selected.categories).length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Category Scores</div>
                  {Object.entries(selected.categories).map(([key, val]) => (
                    <div key={key} className="ai-metric">
                      <span className="ai-metric-label" style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                      <span className="ai-metric-value" style={{ color: scoreColor(val) }}>{val}/10</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.ai_photo_analysis && <AIOutput data={selected.ai_photo_analysis} title="Quality Analysis Results" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Quality Analysis'}
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
              <h2>{isEdit ? 'Edit Inspection' : 'New Inspection'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Location Name</label><input value={formData.location_name} onChange={e => setFormData({ ...formData, location_name: e.target.value })} required /></div>
                  <div className="form-group"><label>Inspector Name</label><input value={formData.inspector_name} onChange={e => setFormData({ ...formData, inspector_name: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Inspection Date</label><input type="date" value={formData.inspection_date} onChange={e => setFormData({ ...formData, inspection_date: e.target.value })} required /></div>
                  <div className="form-group"><label>Overall Score (0-10)</label><input type="number" step="0.1" min="0" max="10" value={formData.overall_score || ''} onChange={e => setFormData({ ...formData, overall_score: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="needs_review">Needs Review</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Follow-up Required</label>
                    <select value={formData.follow_up_required ? 'yes' : 'no'} onChange={e => setFormData({ ...formData, follow_up_required: e.target.value === 'yes' })}>
                      <option value="no">No</option><option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
                {formData.follow_up_required && (
                  <div className="form-group"><label>Follow-up Notes</label><textarea value={formData.follow_up_notes || ''} onChange={e => setFormData({ ...formData, follow_up_notes: e.target.value })} /></div>
                )}
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

export default InspectionsPage;
