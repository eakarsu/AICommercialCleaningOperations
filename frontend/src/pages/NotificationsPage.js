import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const typeBadge = (t) => {
  const map = { info: 'badge-blue', success: 'badge-green', warning: 'badge-yellow', error: 'badge-red' };
  return <span className={`badge ${map[t] || 'badge-gray'}`}>{t || 'info'}</span>;
};

const emptyForm = { title: '', message: '', type: 'info', user_id: '' };

const NotificationsPage = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/notifications')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.notifications || r.data.items || r.data.data || []);
        setItems(list);
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load notifications'); });
    api.get('/notifications/unread-count')
      .then(r => setUnread(r.data.count ?? r.data.unread ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...formData };
      if (!body.user_id) delete body.user_id;
      await api.post('/notifications', body);
      toast.success('Notification created');
      setShowForm(false);
      setFormData(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating notification');
    }
  };

  const handleMarkRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); load(); }
    catch { toast.error('Failed'); }
  };

  const handleMarkAll = async () => {
    try { await api.post('/notifications/mark-all-read'); toast.success('All marked read'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await api.delete(`/notifications/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading notifications...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🔔 Notifications</h1>
        <div className="page-header-actions">
          <span style={{ marginRight: 12, color: '#888' }}>{unread} unread</span>
          <button className="btn btn-secondary" onClick={handleMarkAll}>Mark all read</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Message</th><th>Type</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(n => (
              <tr key={n.id}>
                <td style={{ fontWeight: 600 }}>{n.title}</td>
                <td>{n.message}</td>
                <td>{typeBadge(n.type)}</td>
                <td>{(n.read || n.is_read) ? <span className="badge badge-green">read</span> : <span className="badge badge-yellow">unread</span>}</td>
                <td>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                <td>
                  {!(n.read || n.is_read) && <button className="btn btn-secondary" onClick={() => handleMarkRead(n.id)}>Read</button>}{' '}
                  <button className="btn btn-danger" onClick={() => handleDelete(n.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No notifications</p></div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Notification</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Title</label><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>
                <div className="form-group"><label>Message</label><textarea rows={3} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option>
                    </select>
                  </div>
                  <div className="form-group"><label>User ID (optional)</label><input value={formData.user_id} onChange={e => setFormData({ ...formData, user_id: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
