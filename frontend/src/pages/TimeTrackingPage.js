import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { clocked_in: 'badge-blue', clocked_out: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace(/_/g, ' ')}</span>;
};

const formatTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString();
};

const formatCurrency = (v) => {
  if (v == null || v === '') return '—';
  return '$' + parseFloat(v).toFixed(2);
};

const emptyEntry = {
  employee_name: '', crew_name: '', client_name: '', date: '', clock_in: '',
  clock_out: '', break_minutes: 0, hourly_rate: '', status: 'clocked_in',
  notes: '', job_type: 'regular', location: ''
};

const TimeTrackingPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyEntry);
  const [isEdit, setIsEdit] = useState(false);

  const load = useCallback(() => {
    api.get('/timetracking').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyEntry); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => {
    setFormData({
      ...item,
      clock_in: item.clock_in ? item.clock_in.slice(0, 16) : '',
      clock_out: item.clock_out ? item.clock_out.slice(0, 16) : ''
    });
    setIsEdit(true);
    setShowForm(true);
    setSelected(null);
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this time entry?')) return;
    await api.delete(`/timetracking/${id}`);
    toast.success('Time entry deleted');
    setSelected(null);
    load();
  };

  const handleClockOut = async (id) => {
    try {
      const { data } = await api.post(`/timetracking/${id}/clockout`);
      setSelected(data);
      toast.success('Clocked out successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Clock out failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.clock_in && !payload.clock_in.includes('T')) {
        payload.clock_in = payload.clock_in + ':00';
      }
      if (payload.clock_out && !payload.clock_out.includes('T')) {
        payload.clock_out = payload.clock_out + ':00';
      }
      if (!payload.date && payload.clock_in) {
        payload.date = payload.clock_in.split('T')[0];
      }
      if (isEdit) {
        await api.put(`/timetracking/${formData.id}`, payload);
        toast.success('Time entry updated');
      } else {
        await api.post('/timetracking', payload);
        toast.success('Time entry created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving time entry');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading time entries...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Time Tracking</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Entry</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Crew</th>
              <th>Client</th>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Hours</th>
              <th>Overtime</th>
              <th>Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.employee_name}</td>
                <td>{item.crew_name || '—'}</td>
                <td>{item.client_name || '—'}</td>
                <td>{formatDate(item.date)}</td>
                <td>{formatTime(item.clock_in)}</td>
                <td>{formatTime(item.clock_out)}</td>
                <td>{item.total_hours != null ? parseFloat(item.total_hours).toFixed(2) : '—'}</td>
                <td>{item.overtime_hours != null && parseFloat(item.overtime_hours) > 0 ? parseFloat(item.overtime_hours).toFixed(2) : '—'}</td>
                <td>{formatCurrency(item.total_pay)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No time entries found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.employee_name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Employee</div><div className="detail-value">{selected.employee_name}</div></div>
                <div className="detail-item"><div className="detail-label">Crew</div><div className="detail-value">{selected.crew_name || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Client</div><div className="detail-value">{selected.client_name || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{formatDate(selected.date)}</div></div>
                <div className="detail-item"><div className="detail-label">Clock In</div><div className="detail-value">{formatTime(selected.clock_in)}</div></div>
                <div className="detail-item"><div className="detail-label">Clock Out</div><div className="detail-value">{formatTime(selected.clock_out)}</div></div>
                <div className="detail-item"><div className="detail-label">Break (min)</div><div className="detail-value">{selected.break_minutes || 0}</div></div>
                <div className="detail-item"><div className="detail-label">Total Hours</div><div className="detail-value">{selected.total_hours != null ? parseFloat(selected.total_hours).toFixed(2) : '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Overtime Hours</div><div className="detail-value">{selected.overtime_hours != null && parseFloat(selected.overtime_hours) > 0 ? parseFloat(selected.overtime_hours).toFixed(2) : '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Hourly Rate</div><div className="detail-value">{formatCurrency(selected.hourly_rate)}</div></div>
                <div className="detail-item"><div className="detail-label">Total Pay</div><div className="detail-value">{formatCurrency(selected.total_pay)}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Job Type</div><div className="detail-value">{selected.job_type?.replace(/_/g, ' ')}</div></div>
                <div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{selected.location || '—'}</div></div>
              </div>
              {selected.notes && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="detail-label">Notes</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.status === 'clocked_in' && (
                <button className="btn btn-success" onClick={() => handleClockOut(selected.id)}>Clock Out</button>
              )}
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
              <h2>{isEdit ? 'Edit Time Entry' : 'New Time Entry'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Employee Name</label>
                    <input value={formData.employee_name} onChange={e => setFormData({ ...formData, employee_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Crew Name</label>
                    <input value={formData.crew_name || ''} onChange={e => setFormData({ ...formData, crew_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Client Name</label>
                    <input value={formData.client_name || ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Job Type</label>
                    <select value={formData.job_type} onChange={e => setFormData({ ...formData, job_type: e.target.value })}>
                      <option value="regular">Regular</option>
                      <option value="deep_clean">Deep Clean</option>
                      <option value="emergency">Emergency</option>
                      <option value="inspection">Inspection</option>
                      <option value="training">Training</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Clock In</label>
                    <input type="datetime-local" value={formData.clock_in || ''} onChange={e => setFormData({ ...formData, clock_in: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Clock Out</label>
                    <input type="datetime-local" value={formData.clock_out || ''} onChange={e => setFormData({ ...formData, clock_out: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Break (minutes)</label>
                    <input type="number" min="0" value={formData.break_minutes || 0} onChange={e => setFormData({ ...formData, break_minutes: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label>Hourly Rate ($)</label>
                    <input type="number" step="0.01" value={formData.hourly_rate || ''} onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="clocked_in">Clocked In</option>
                      <option value="clocked_out">Clocked Out</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea rows="2" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
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

export default TimeTrackingPage;
