import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { scheduled: 'badge-blue', in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-gray' };
  if (s === 'rescheduled') return <span className="badge" style={{ background: '#a855f7', color: '#fff' }}>{s}</span>;
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const priorityBadge = (p) => {
  const map = { low: 'badge-gray', normal: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red' };
  return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>;
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const formatServiceType = (s) => {
  const map = { regular: 'Regular', deep_clean: 'Deep Clean', floor_care: 'Floor Care', window: 'Window', carpet: 'Carpet', post_construction: 'Post Construction', move_in_out: 'Move In/Out' };
  return map[s] || s;
};

const formatRecurrence = (r) => {
  const map = { none: 'None', daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-Weekly', monthly: 'Monthly' };
  return map[r] || r;
};

const emptySchedule = {
  title: '', crew_name: '', client_name: '', location: '', date: '', start_time: '', end_time: '',
  recurrence: 'none', service_type: 'regular', status: 'scheduled', priority: 'normal',
  estimated_hours: '', notes: '', contact_name: '', contact_phone: ''
};

const SchedulePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptySchedule);
  const [isEdit, setIsEdit] = useState(false);

  const load = useCallback(() => {
    api.get('/schedules').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptySchedule); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    await api.delete(`/schedules/${id}`);
    toast.success('Schedule deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/schedules/${formData.id}`, formData);
        toast.success('Schedule updated');
      } else {
        await api.post('/schedules', formData);
        toast.success('Schedule created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving schedule');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading schedules...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>📅 Scheduling</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Schedule</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Crew</th>
              <th>Client</th>
              <th>Date</th>
              <th>Time</th>
              <th>Service Type</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.title}</td>
                <td>{item.crew_name}</td>
                <td>{item.client_name}</td>
                <td>{formatDate(item.date)}</td>
                <td>{formatTime(item.start_time)} - {formatTime(item.end_time)}</td>
                <td>{formatServiceType(item.service_type)}</td>
                <td>{priorityBadge(item.priority)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No schedules found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Crew</div><div className="detail-value">{selected.crew_name}</div></div>
                <div className="detail-item"><div className="detail-label">Client</div><div className="detail-value">{selected.client_name}</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{formatDate(selected.date)}</div></div>
                <div className="detail-item"><div className="detail-label">Start Time</div><div className="detail-value">{formatTime(selected.start_time)}</div></div>
                <div className="detail-item"><div className="detail-label">End Time</div><div className="detail-value">{formatTime(selected.end_time)}</div></div>
                <div className="detail-item"><div className="detail-label">Recurrence</div><div className="detail-value">{formatRecurrence(selected.recurrence)}</div></div>
                <div className="detail-item"><div className="detail-label">Service Type</div><div className="detail-value">{formatServiceType(selected.service_type)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Priority</div><div className="detail-value">{priorityBadge(selected.priority)}</div></div>
                <div className="detail-item"><div className="detail-label">Estimated Hours</div><div className="detail-value">{selected.estimated_hours || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Name</div><div className="detail-value">{selected.contact_name || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Contact Phone</div><div className="detail-value">{selected.contact_phone || '—'}</div></div>
              </div>
              {selected.notes && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="detail-label">Notes</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
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
              <h2>{isEdit ? 'Edit Schedule' : 'New Schedule'}</h2>
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
                    <label>Crew Name</label>
                    <input value={formData.crew_name} onChange={e => setFormData({ ...formData, crew_name: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Client Name</label>
                    <input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Estimated Hours</label>
                    <input type="number" step="0.5" min="0" value={formData.estimated_hours || ''} onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Type</label>
                    <select value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })}>
                      <option value="regular">Regular</option>
                      <option value="deep_clean">Deep Clean</option>
                      <option value="floor_care">Floor Care</option>
                      <option value="window">Window</option>
                      <option value="carpet">Carpet</option>
                      <option value="post_construction">Post Construction</option>
                      <option value="move_in_out">Move In/Out</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Recurrence</label>
                    <select value={formData.recurrence} onChange={e => setFormData({ ...formData, recurrence: e.target.value })}>
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="rescheduled">Rescheduled</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Name</label>
                    <input value={formData.contact_name || ''} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input value={formData.contact_phone || ''} onChange={e => setFormData({ ...formData, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows="3" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
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

export default SchedulePage;
