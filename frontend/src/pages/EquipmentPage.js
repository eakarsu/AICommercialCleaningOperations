import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { in_service: 'badge-green', maintenance: 'badge-yellow', storage: 'badge-blue', retired: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const conditionBadge = (c) => {
  const map = { excellent: 'badge-green', good: 'badge-blue', fair: 'badge-yellow', poor: 'badge-red', needs_repair: 'badge-red', decommissioned: 'badge-gray' };
  return <span className={`badge ${map[c] || 'badge-gray'}`}>{c?.replace('_', ' ')}</span>;
};

const emptyEquipment = { name: '', type: 'vacuum', serial_number: '', purchase_date: '', purchase_cost: '', condition: 'good', assigned_to: '', last_maintenance: '', next_maintenance: '', maintenance_interval_days: 90, location: '', status: 'in_service', hours_used: 0, notes: '' };

const EquipmentPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyEquipment);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/equipment').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyEquipment); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this equipment?')) return;
    await api.delete(`/equipment/${id}`);
    toast.success('Equipment deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) { await api.put(`/equipment/${formData.id}`, formData); toast.success('Equipment updated'); }
      else { await api.post('/equipment', formData); toast.success('Equipment created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving equipment'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/equipment/${id}/predict`);
      setSelected(data.equipment);
      toast.success('AI maintenance prediction complete!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading equipment...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🔧 Equipment Management</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Equipment</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Serial Number</th><th>Condition</th><th>Assigned To</th><th>Location</th><th>Hours Used</th><th>Next Maintenance</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td><span className="badge badge-blue">{item.type?.replace('_', ' ')}</span></td>
                <td>{item.serial_number}</td>
                <td>{conditionBadge(item.condition)}</td>
                <td>{item.assigned_to || 'Unassigned'}</td>
                <td>{item.location}</td>
                <td>{item.hours_used}</td>
                <td>{item.next_maintenance || 'N/A'}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No equipment found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{selected.type?.replace('_', ' ')}</div></div>
                <div className="detail-item"><div className="detail-label">Serial Number</div><div className="detail-value">{selected.serial_number || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Purchase Date</div><div className="detail-value">{selected.purchase_date || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Purchase Cost</div><div className="detail-value">${selected.purchase_cost || '0.00'}</div></div>
                <div className="detail-item"><div className="detail-label">Condition</div><div className="detail-value">{conditionBadge(selected.condition)}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned To</div><div className="detail-value">{selected.assigned_to || 'Unassigned'}</div></div>
                <div className="detail-item"><div className="detail-label">Last Maintenance</div><div className="detail-value">{selected.last_maintenance || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Next Maintenance</div><div className="detail-value">{selected.next_maintenance || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Maintenance Interval</div><div className="detail-value">{selected.maintenance_interval_days} days</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location || 'N/A'}</div></div>
                <div className="detail-item"><div className="detail-label">Hours Used</div><div className="detail-value">{selected.hours_used}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes || 'N/A'}</div></div>
              </div>
              {selected.ai_maintenance_prediction && <AIOutput data={selected.ai_maintenance_prediction} title="AI Maintenance Prediction" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Predicting...' : '🤖 AI Maintenance Prediction'}
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
              <h2>{isEdit ? 'Edit Equipment' : 'New Equipment'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                  <div className="form-group"><label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="vacuum">Vacuum</option><option value="floor_scrubber">Floor Scrubber</option><option value="pressure_washer">Pressure Washer</option><option value="carpet_cleaner">Carpet Cleaner</option><option value="buffer">Buffer</option><option value="vehicle">Vehicle</option><option value="hand_tool">Hand Tool</option><option value="safety">Safety</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Serial Number</label><input value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} /></div>
                  <div className="form-group"><label>Purchase Date</label><input type="date" value={formData.purchase_date || ''} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Purchase Cost ($)</label><input type="number" step="0.01" value={formData.purchase_cost || ''} onChange={e => setFormData({ ...formData, purchase_cost: e.target.value })} /></div>
                  <div className="form-group"><label>Condition</label>
                    <select value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })}>
                      <option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option><option value="needs_repair">Needs Repair</option><option value="decommissioned">Decommissioned</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Assigned To</label><input value={formData.assigned_to || ''} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} /></div>
                  <div className="form-group"><label>Location</label><input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Last Maintenance</label><input type="date" value={formData.last_maintenance || ''} onChange={e => setFormData({ ...formData, last_maintenance: e.target.value })} /></div>
                  <div className="form-group"><label>Next Maintenance</label><input type="date" value={formData.next_maintenance || ''} onChange={e => setFormData({ ...formData, next_maintenance: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Maintenance Interval (days)</label><input type="number" value={formData.maintenance_interval_days} onChange={e => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) || 0 })} /></div>
                  <div className="form-group"><label>Hours Used</label><input type="number" value={formData.hours_used} onChange={e => setFormData({ ...formData, hours_used: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="in_service">In Service</option><option value="maintenance">Maintenance</option><option value="storage">Storage</option><option value="retired">Retired</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: '1 1 100%' }}><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} /></div>
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

export default EquipmentPage;
