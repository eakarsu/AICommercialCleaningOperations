import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { compliant: 'badge-green', non_compliant: 'badge-red', pending: 'badge-yellow', expired: 'badge-red', due_soon: 'badge-purple' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const priorityBadge = (p) => {
  const map = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', critical: 'badge-red' };
  return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
};

const emptyCompliance = { title: '', category: 'osha', description: '', due_date: '', status: 'pending', assigned_to: '', renewal_frequency: 'annual', priority: 'medium', notes: '' };

const CompliancePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyCompliance);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/compliance').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyCompliance); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this compliance record?')) return;
    await api.delete(`/compliance/${id}`);
    toast.success('Record deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/compliance/${formData.id}`, formData); toast.success('Record updated'); }
      else { await api.post('/compliance', formData); toast.success('Record created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving record'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/compliance/${id}/analyze`);
      setSelected(data.record);
      toast.success('AI analysis complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading compliance...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>📋 Compliance Tracking</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Record</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Category</th><th>Due Date</th><th>Assigned To</th><th>Renewal</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td><span className="badge badge-blue">{item.category?.toUpperCase()}</span></td>
                <td>{item.due_date}</td>
                <td>{item.assigned_to}</td>
                <td>{item.renewal_frequency?.replace('_', ' ')}</td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No compliance records found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selected.category?.toUpperCase()}</div></div>
                <div className="detail-item"><div className="detail-label">Due Date</div><div className="detail-value">{selected.due_date}</div></div>
                <div className="detail-item"><div className="detail-label">Completed Date</div><div className="detail-value">{selected.completed_date || 'Not completed'}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selected.assigned_to}</div></div>
                <div className="detail-item"><div className="detail-label">Renewal Frequency</div><div className="detail-value">{selected.renewal_frequency?.replace('_', ' ')}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value">{priorityBadge(selected.priority)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                {selected.description && <div className="detail-item detail-full"><div className="detail-label">Description</div><div className="detail-value">{selected.description}</div></div>}
                {selected.notes && <div className="detail-item detail-full"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes}</div></div>}
              </div>
              {selected.ai_recommendations && <AIOutput data={selected.ai_recommendations} title="Compliance AI Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Compliance Analysis'}
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
              <h2>{isEdit ? 'Edit Compliance Record' : 'New Compliance Record'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="osha">OSHA</option><option value="epa">EPA</option><option value="state">State</option><option value="insurance">Insurance</option><option value="training">Training</option><option value="license">License</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Due Date</label><input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} required /></div>
                  <div className="form-group"><label>Assigned To</label><input value={formData.assigned_to || ''} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Renewal Frequency</label>
                    <select value={formData.renewal_frequency} onChange={e => setFormData({ ...formData, renewal_frequency: e.target.value })}>
                      <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semi_annual">Semi-Annual</option><option value="annual">Annual</option><option value="biennial">Biennial</option><option value="one_time">One Time</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="compliant">Compliant</option><option value="non_compliant">Non-Compliant</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="due_soon">Due Soon</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                <div className="form-group"><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
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

export default CompliancePage;
