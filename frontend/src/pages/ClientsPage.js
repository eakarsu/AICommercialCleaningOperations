import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { active: 'badge-green', prospect: 'badge-blue', inactive: 'badge-yellow', churned: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
};

const satisfactionColor = (score) => {
  if (score >= 8) return 'green';
  if (score >= 6) return '#c59a00';
  return 'red';
};

const emptyClient = { company_name: '', contact_name: '', email: '', phone: '', address: '', industry: 'technology', status: 'active', monthly_revenue: '', satisfaction_score: '', since: '', properties_count: 1, notes: '' };

const ClientsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyClient);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/clients').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyClient); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    await api.delete(`/clients/${id}`);
    toast.success('Client deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/clients/${formData.id}`, formData); toast.success('Client updated'); }
      else { await api.post('/clients', formData); toast.success('Client created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving client'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/clients/${id}/analyze`);
      setSelected(data.client);
      toast.success('AI retention analysis complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading clients...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🏢 Client Management</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Client</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Company Name</th><th>Contact Name</th><th>Industry</th><th>Monthly Revenue</th><th>Satisfaction</th><th>Properties</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.company_name}</td>
                <td>{item.contact_name}</td>
                <td><span className="badge badge-blue">{item.industry}</span></td>
                <td>${Number(item.monthly_revenue || 0).toLocaleString()}</td>
                <td style={{ color: satisfactionColor(item.satisfaction_score), fontWeight: 600 }}>{item.satisfaction_score}</td>
                <td>{item.properties_count}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No clients found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.company_name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Company Name</div><div className="detail-value">{selected.company_name}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Name</div><div className="detail-value">{selected.contact_name}</div></div>
                <div className="detail-item"><div className="detail-label">Email</div><div className="detail-value">{selected.email}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selected.phone}</div></div>
                <div className="detail-item"><div className="detail-label">Address</div><div className="detail-value">{selected.address || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Industry</div><div className="detail-value"><span className="badge badge-blue">{selected.industry}</span></div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Monthly Revenue</div><div className="detail-value">${Number(selected.monthly_revenue || 0).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Satisfaction Score</div><div className="detail-value" style={{ color: satisfactionColor(selected.satisfaction_score), fontWeight: 600 }}>{selected.satisfaction_score}/10</div></div>
                <div className="detail-item"><div className="detail-label">Client Since</div><div className="detail-value">{selected.since || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Properties</div><div className="detail-value">{selected.properties_count}</div></div>
                <div className="detail-item"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes || 'N/A'}</div></div>
              </div>
              {selected.ai_retention_analysis && <AIOutput data={selected.ai_retention_analysis} title="AI Retention Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Retention Analysis'}
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
              <h2>{isEdit ? 'Edit Client' : 'New Client'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Company Name</label><input value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} required /></div>
                  <div className="form-group"><label>Contact Name</label><input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
                  <div className="form-group"><label>Phone</label><input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Address</label><input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                  <div className="form-group"><label>Industry</label>
                    <select value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })}>
                      <option value="healthcare">Healthcare</option><option value="technology">Technology</option><option value="finance">Finance</option><option value="education">Education</option><option value="retail">Retail</option><option value="hospitality">Hospitality</option><option value="government">Government</option><option value="industrial">Industrial</option><option value="food_service">Food Service</option><option value="fitness">Fitness</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="active">Active</option><option value="prospect">Prospect</option><option value="inactive">Inactive</option><option value="churned">Churned</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Monthly Revenue ($)</label><input type="number" step="0.01" value={formData.monthly_revenue} onChange={e => setFormData({ ...formData, monthly_revenue: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Satisfaction Score (0-10)</label><input type="number" min="0" max="10" step="0.1" value={formData.satisfaction_score} onChange={e => setFormData({ ...formData, satisfaction_score: e.target.value })} /></div>
                  <div className="form-group"><label>Client Since</label><input type="date" value={formData.since} onChange={e => setFormData({ ...formData, since: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Properties Count</label><input type="number" min="1" value={formData.properties_count} onChange={e => setFormData({ ...formData, properties_count: parseInt(e.target.value) || 1 })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: '1 1 100%' }}><label>Notes</label><textarea rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
                </div>
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

export default ClientsPage;
