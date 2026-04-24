import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { open: 'badge-blue', assigned: 'badge-yellow', in_progress: 'badge-purple', completed: 'badge-green', cancelled: 'badge-red', on_hold: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
};

const priorityBadge = (p) => {
  const map = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red' };
  return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
};

const typeBadge = (t) => {
  return <span className="badge badge-blue">{t?.replace(/_/g, ' ')}</span>;
};

const formatCost = (c) => {
  if (c === null || c === undefined || c === '') return '-';
  return `$${Number(c).toFixed(2)}`;
};

const emptyOrder = { title: '', client_name: '', location: '', assigned_crew: '', type: 'regular', priority: 'medium', status: 'open', scheduled_date: '', estimated_hours: '', cost: '', description: '' };

const WorkOrdersPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyOrder);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/workorders').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyOrder); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this work order?')) return;
    await api.delete(`/workorders/${id}`);
    toast.success('Work order deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/workorders/${formData.id}`, formData);
        toast.success('Work order updated');
      } else {
        await api.post('/workorders', formData);
        toast.success('Work order created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving work order');
    }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/workorders/${id}/optimize`);
      setSelected(data.workorder);
      toast.success('AI schedule optimization complete!');
      load();
    } catch (err) {
      toast.error('AI analysis failed');
    }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading work orders...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>📝 Work Orders</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Work Order</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Location</th>
              <th>Assigned Crew</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Scheduled Date</th>
              <th>Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td>{item.client_name}</td>
                <td>{item.location}</td>
                <td>{item.assigned_crew}</td>
                <td>{typeBadge(item.type)}</td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{item.scheduled_date}</td>
                <td>{formatCost(item.cost)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No work orders found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Client</div><div className="detail-value">{selected.client_name}</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned Crew</div><div className="detail-value">{selected.assigned_crew}</div></div>
                <div className="detail-item"><div className="detail-label">Type</div><div className="detail-value">{typeBadge(selected.type)}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value">{priorityBadge(selected.priority)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Scheduled Date</div><div className="detail-value">{selected.scheduled_date}</div></div>
                <div className="detail-item"><div className="detail-label">Estimated Hours</div><div className="detail-value">{selected.estimated_hours}</div></div>
                <div className="detail-item"><div className="detail-label">Cost</div><div className="detail-value">{formatCost(selected.cost)}</div></div>
                <div className="detail-item"><div className="detail-label">Description</div><div className="detail-value">{selected.description}</div></div>
              </div>
              {selected.checklist_items && selected.checklist_items.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Checklist Items</div>
                  {selected.checklist_items.map((item, i) => (
                    <div key={i} className="ai-metric">
                      <span className="ai-metric-label">{item.task || item.name || item}</span>
                      <span className="ai-metric-value">{item.completed ? '✅' : '⬜'}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.ai_scheduling_analysis && <AIOutput data={selected.ai_scheduling_analysis} title="AI Schedule Optimization Results" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Optimizing...' : '🤖 AI Schedule Optimizer'}
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
              <h2>{isEdit ? 'Edit Work Order' : 'New Work Order'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Client Name</label>
                    <input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Assigned Crew</label>
                    <input value={formData.assigned_crew} onChange={e => setFormData({ ...formData, assigned_crew: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="regular">Regular</option>
                      <option value="deep_clean">Deep Clean</option>
                      <option value="emergency">Emergency</option>
                      <option value="post_construction">Post Construction</option>
                      <option value="move_in_out">Move In/Out</option>
                      <option value="special_event">Special Event</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Scheduled Date</label>
                    <input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated Hours</label>
                    <input type="number" step="0.5" value={formData.estimated_hours || ''} onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Cost ($)</label>
                    <input type="number" step="0.01" value={formData.cost || ''} onChange={e => setFormData({ ...formData, cost: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
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

export default WorkOrdersPage;
