import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { in_stock: 'badge-green', low_stock: 'badge-yellow', out_of_stock: 'badge-red', on_order: 'badge-blue' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const emptySupply = { name: '', category: 'chemicals', current_stock: 0, unit: '', reorder_level: 10, unit_cost: '', supplier: '', monthly_usage_avg: 0, lead_time_days: 7, status: 'in_stock' };

const SuppliesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptySupply);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/supplies').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptySupply); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supply?')) return;
    await api.delete(`/supplies/${id}`);
    toast.success('Supply deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/supplies/${formData.id}`, formData); toast.success('Supply updated'); }
      else { await api.post('/supplies', formData); toast.success('Supply created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving supply'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/supplies/${id}/forecast`);
      setSelected(data.supply);
      toast.success('AI forecast complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading supplies...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>📦 Supply Forecasting</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Supply</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Stock</th><th>Unit</th><th>Reorder Level</th><th>Unit Cost</th><th>Supplier</th><th>Monthly Avg</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td><span className="badge badge-blue">{item.category}</span></td>
                <td>{item.current_stock}</td>
                <td>{item.unit}</td>
                <td>{item.reorder_level}</td>
                <td>${item.unit_cost}</td>
                <td>{item.supplier}</td>
                <td>{item.monthly_usage_avg}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No supplies found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{selected.category}</div></div>
                <div className="detail-item"><div className="detail-label">Current Stock</div><div className="detail-value">{selected.current_stock} {selected.unit}</div></div>
                <div className="detail-item"><div className="detail-label">Reorder Level</div><div className="detail-value">{selected.reorder_level} {selected.unit}</div></div>
                <div className="detail-item"><div className="detail-label">Unit Cost</div><div className="detail-value">${selected.unit_cost}</div></div>
                <div className="detail-item"><div className="detail-label">Supplier</div><div className="detail-value">{selected.supplier}</div></div>
                <div className="detail-item"><div className="detail-label">Monthly Avg Usage</div><div className="detail-value">{selected.monthly_usage_avg} {selected.unit}</div></div>
                <div className="detail-item"><div className="detail-label">Lead Time</div><div className="detail-value">{selected.lead_time_days} days</div></div>
                <div className="detail-item"><div className="detail-label">Last Ordered</div><div className="detail-value">{selected.last_ordered || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
              </div>
              {selected.forecast_data && <AIOutput data={selected.forecast_data} title="Supply Forecast Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Forecasting...' : '🤖 AI Forecast'}
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
              <h2>{isEdit ? 'Edit Supply' : 'New Supply'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                  <div className="form-group"><label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="chemicals">Chemicals</option><option value="equipment">Equipment</option><option value="disposables">Disposables</option><option value="safety">Safety</option><option value="tools">Tools</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Current Stock</label><input type="number" value={formData.current_stock} onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })} /></div>
                  <div className="form-group"><label>Unit</label><input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Reorder Level</label><input type="number" value={formData.reorder_level} onChange={e => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })} /></div>
                  <div className="form-group"><label>Unit Cost ($)</label><input type="number" step="0.01" value={formData.unit_cost || ''} onChange={e => setFormData({ ...formData, unit_cost: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Supplier</label><input value={formData.supplier || ''} onChange={e => setFormData({ ...formData, supplier: e.target.value })} /></div>
                  <div className="form-group"><label>Monthly Avg Usage</label><input type="number" value={formData.monthly_usage_avg} onChange={e => setFormData({ ...formData, monthly_usage_avg: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Lead Time (days)</label><input type="number" value={formData.lead_time_days} onChange={e => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })} /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="in_stock">In Stock</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option><option value="on_order">On Order</option>
                    </select>
                  </div>
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

export default SuppliesPage;
