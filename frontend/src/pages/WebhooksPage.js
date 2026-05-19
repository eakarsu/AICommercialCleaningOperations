import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const emptyForm = { name: '', url: '', events: '', active: true };

const WebhooksPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/webhooks')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.webhooks || r.data.items || r.data.data || []);
        setItems(list);
        setLoading(false);
      })
      .catch(() => { setLoading(false); toast.error('Failed to load webhooks'); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...formData,
        events: formData.events.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.post('/webhooks', body);
      toast.success('Webhook created');
      setShowForm(false);
      setFormData(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error creating webhook');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try { await api.delete(`/webhooks/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleTest = async (id) => {
    setTesting(id);
    setTestResult(null);
    try {
      const { data } = await api.post(`/webhooks/${id}/test`, { event: 'test', payload: { hello: 'world' } });
      setTestResult({ id, ok: true, data });
      toast.success('Test dispatched');
    } catch (err) {
      setTestResult({ id, ok: false, data: err.response?.data || { error: err.message } });
      toast.error('Test failed');
    } finally {
      setTesting(null);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading webhooks...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>🪝 Webhooks</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Webhook</button>
        </div>
      </div>

      {testResult && (
        <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'}`} style={{ padding: 12, marginBottom: 16, border: `1px solid ${testResult.ok ? '#22c55e' : '#ef4444'}`, borderRadius: 6 }}>
          <strong>Test #{testResult.id}: {testResult.ok ? 'OK' : 'Failed'}</strong>
          <pre style={{ overflow: 'auto', fontSize: 12, marginTop: 8, maxHeight: 240 }}>{JSON.stringify(testResult.data, null, 2)}</pre>
        </div>
      )}

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map(w => (
              <tr key={w.id}>
                <td style={{ fontWeight: 600 }}>{w.name}</td>
                <td><span style={{ display: 'inline-block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</span></td>
                <td>{Array.isArray(w.events) ? w.events.join(', ') : (w.events || '—')}</td>
                <td>{w.active ? <span className="badge badge-green">yes</span> : <span className="badge badge-gray">no</span>}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => handleTest(w.id)} disabled={testing === w.id}>
                    {testing === w.id ? 'Testing...' : 'Test'}
                  </button>{' '}
                  <button className="btn btn-danger" onClick={() => handleDelete(w.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No webhooks</p></div>}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Webhook</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Name</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                <div className="form-group"><label>URL</label><input type="url" value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} required placeholder="https://..." /></div>
                <div className="form-group"><label>Events (comma-separated)</label><input value={formData.events} onChange={e => setFormData({ ...formData, events: e.target.value })} placeholder="incident.created, workorder.completed" /></div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                    Active
                  </label>
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

export default WebhooksPage;
