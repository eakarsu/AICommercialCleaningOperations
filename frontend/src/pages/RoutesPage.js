import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { pending: 'badge-yellow', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const priorityBadge = (p) => {
  const map = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-red' };
  return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
};

const emptyRoute = { name: '', crew_name: '', date: '', status: 'pending', total_stops: 0, estimated_duration_hours: '', total_distance_miles: '', region: '', priority: 'medium', stops: [] };

const RoutesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyRoute);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/routes').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyRoute); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this route?')) return;
    await api.delete(`/routes/${id}`);
    toast.success('Route deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/routes/${formData.id}`, formData);
        toast.success('Route updated');
      } else {
        await api.post('/routes', formData);
        toast.success('Route created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving route');
    }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/routes/${id}/optimize`);
      setSelected(data.route);
      toast.success('AI optimization complete!');
      load();
    } catch (err) {
      toast.error('AI analysis failed');
    }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading routes...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🗺️ Route Optimization</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Route</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Route Name</th>
              <th>Crew</th>
              <th>Date</th>
              <th>Stops</th>
              <th>Duration</th>
              <th>Distance</th>
              <th>Region</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.crew_name}</td>
                <td>{item.date}</td>
                <td>{item.total_stops}</td>
                <td>{item.estimated_duration_hours}h</td>
                <td>{item.total_distance_miles} mi</td>
                <td>{item.region}</td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No routes found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Crew</div><div className="detail-value">{selected.crew_name}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{selected.date}</div></div>
                <div className="detail-item"><div className="detail-label">Stops</div><div className="detail-value">{selected.total_stops}</div></div>
                <div className="detail-item"><div className="detail-label">Duration</div><div className="detail-value">{selected.estimated_duration_hours} hours</div></div>
                <div className="detail-item"><div className="detail-label">Distance</div><div className="detail-value">{selected.total_distance_miles} miles</div></div>
                <div className="detail-item"><div className="detail-label">Region</div><div className="detail-value">{selected.region}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value">{priorityBadge(selected.priority)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
              </div>
              {selected.stops && selected.stops.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Stops</div>
                  {selected.stops.map((stop, i) => (
                    <div key={i} className="ai-metric">
                      <span className="ai-metric-label">Stop {i + 1}: {stop.client}</span>
                      <span className="ai-metric-value">{stop.address}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.ai_suggestions && <AIOutput data={selected.ai_suggestions} title="Route Optimization Results" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Optimizing...' : '🤖 AI Optimize Route'}
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
              <h2>{isEdit ? 'Edit Route' : 'New Route'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Route Name</label>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Crew Name</label>
                    <input value={formData.crew_name} onChange={e => setFormData({ ...formData, crew_name: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input value={formData.region || ''} onChange={e => setFormData({ ...formData, region: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Stops</label>
                    <input type="number" value={formData.total_stops} onChange={e => setFormData({ ...formData, total_stops: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Duration (hours)</label>
                    <input type="number" step="0.5" value={formData.estimated_duration_hours || ''} onChange={e => setFormData({ ...formData, estimated_duration_hours: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Distance (miles)</label>
                    <input type="number" step="0.1" value={formData.total_distance_miles || ''} onChange={e => setFormData({ ...formData, total_distance_miles: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
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

export default RoutesPage;
