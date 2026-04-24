import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { draft: 'badge-gray', active: 'badge-green', expired: 'badge-red', cancelled: 'badge-red', pending_renewal: 'badge-yellow' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const emptyContract = { client_name: '', property_type: 'office', square_footage: '', frequency: 'weekly', services: [], monthly_price: '', contract_start: '', contract_end: '', status: 'draft', special_requirements: '', contact_person: '', contact_email: '', contact_phone: '' };

const ContractsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyContract);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [serviceInput, setServiceInput] = useState('');

  const load = useCallback(() => {
    api.get('/contracts').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyContract); setIsEdit(false); setShowForm(true); setServiceInput(''); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); setServiceInput(item.services?.join(', ') || ''); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    await api.delete(`/contracts/${id}`);
    toast.success('Contract deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, services: serviceInput.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (isEdit) { await api.put(`/contracts/${formData.id}`, payload); toast.success('Contract updated'); }
      else { await api.post('/contracts', payload); toast.success('Contract created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving contract'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/contracts/${id}/calculate-price`);
      setSelected(data.contract);
      toast.success('AI pricing complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading contracts...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>💰 Contract Pricing</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Contract</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Client</th><th>Property Type</th><th>Sq Ft</th><th>Frequency</th><th>Monthly Price</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.client_name}</td>
                <td><span className="badge badge-blue">{item.property_type}</span></td>
                <td>{Number(item.square_footage).toLocaleString()}</td>
                <td>{item.frequency?.replace('_', '/')}</td>
                <td style={{ fontWeight: 700, color: '#10b981' }}>${Number(item.monthly_price).toLocaleString()}</td>
                <td>{item.contract_start}</td>
                <td>{item.contract_end}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No contracts found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.client_name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Property Type</div><div className="detail-value">{selected.property_type}</div></div>
                <div className="detail-item"><div className="detail-label">Square Footage</div><div className="detail-value">{Number(selected.square_footage).toLocaleString()} sq ft</div></div>
                <div className="detail-item"><div className="detail-label">Frequency</div><div className="detail-value">{selected.frequency?.replace('_', '/')}</div></div>
                <div className="detail-item"><div className="detail-label">Monthly Price</div><div className="detail-value" style={{ color: '#10b981', fontSize: '20px' }}>${Number(selected.monthly_price).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Contract Period</div><div className="detail-value">{selected.contract_start} to {selected.contract_end}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Person</div><div className="detail-value">{selected.contact_person}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Email</div><div className="detail-value">{selected.contact_email}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Phone</div><div className="detail-value">{selected.contact_phone}</div></div>
                {selected.special_requirements && <div className="detail-item detail-full"><div className="detail-label">Special Requirements</div><div className="detail-value">{selected.special_requirements}</div></div>}
              </div>
              {selected.services && selected.services.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Services</div>
                  <ul className="ai-list">{selected.services.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {selected.ai_pricing_analysis && <AIOutput data={selected.ai_pricing_analysis} title="AI Pricing Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Calculating...' : '🤖 AI Price Calculator'}
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
              <h2>{isEdit ? 'Edit Contract' : 'New Contract'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Client Name</label><input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required /></div>
                  <div className="form-group"><label>Property Type</label>
                    <select value={formData.property_type} onChange={e => setFormData({ ...formData, property_type: e.target.value })}>
                      <option value="office">Office</option><option value="retail">Retail</option><option value="warehouse">Warehouse</option><option value="medical">Medical</option><option value="school">School</option><option value="restaurant">Restaurant</option><option value="industrial">Industrial</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Square Footage</label><input type="number" value={formData.square_footage} onChange={e => setFormData({ ...formData, square_footage: e.target.value })} required /></div>
                  <div className="form-group"><label>Frequency</label>
                    <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                      <option value="daily">Daily</option><option value="3x_week">3x/week</option><option value="2x_week">2x/week</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Monthly Price ($)</label><input type="number" step="0.01" value={formData.monthly_price || ''} onChange={e => setFormData({ ...formData, monthly_price: e.target.value })} /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option><option value="pending_renewal">Pending Renewal</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Contract Start</label><input type="date" value={formData.contract_start || ''} onChange={e => setFormData({ ...formData, contract_start: e.target.value })} /></div>
                  <div className="form-group"><label>Contract End</label><input type="date" value={formData.contract_end || ''} onChange={e => setFormData({ ...formData, contract_end: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Services (comma separated)</label><input value={serviceInput} onChange={e => setServiceInput(e.target.value)} placeholder="e.g. general cleaning, floor care, restroom sanitation" /></div>
                <div className="form-row">
                  <div className="form-group"><label>Contact Person</label><input value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} /></div>
                  <div className="form-group"><label>Contact Email</label><input type="email" value={formData.contact_email || ''} onChange={e => setFormData({ ...formData, contact_email: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Contact Phone</label><input value={formData.contact_phone || ''} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Special Requirements</label><textarea value={formData.special_requirements || ''} onChange={e => setFormData({ ...formData, special_requirements: e.target.value })} /></div>
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

export default ContractsPage;
