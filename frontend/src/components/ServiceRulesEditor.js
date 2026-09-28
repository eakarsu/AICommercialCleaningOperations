import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
const PROPERTY_TYPES = ['office', 'medical', 'retail', 'warehouse', 'school', 'restaurant', 'gym', 'general'];

const emptyRule = { name: '', frequency: 'daily', tasks: '', property_type: 'general', est_hours: 2, active: true };

const ServiceRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRule);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/custom-views/service-rules')
      .then(r => { setRules(r.data.rules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = () => {
    setEditing(null);
    setForm(emptyRule);
    setShowForm(true);
  };

  const handleEdit = (r) => {
    setEditing(r.id);
    setForm({
      name: r.name,
      frequency: r.frequency,
      tasks: Array.isArray(r.tasks) ? r.tasks.join('\n') : (r.tasks || ''),
      property_type: r.property_type || 'general',
      est_hours: r.est_hours || 1,
      active: r.active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service rule?')) return;
    try {
      await api.delete(`/custom-views/service-rules/${id}`);
      toast.success('Rule deleted');
      load();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        tasks: form.tasks.split('\n').map(t => t.trim()).filter(Boolean),
        est_hours: parseFloat(form.est_hours) || 1
      };
      if (editing) {
        await api.put(`/custom-views/service-rules/${editing}`, payload);
        toast.success('Rule updated');
      } else {
        await api.post('/custom-views/service-rules', payload);
        toast.success('Rule created');
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  return (
    <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 12, padding: 20, border: '1px solid rgba(139,92,246,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Service Rules Editor</h3>
        <button className="btn btn-primary" onClick={handleNew}>+ New Rule</button>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Library of cleaning frequency and task templates per property type, persisted in the database.
        These rules are not yet consumed by scheduling or checklist generation.
      </p>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading rules...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.7)' }}>
                <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1' }}>Name</th>
                <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1' }}>Frequency</th>
                <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1' }}>Property</th>
                <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1' }}>Tasks</th>
                <th style={{ padding: 10, textAlign: 'center', color: '#cbd5e1' }}>Est. Hrs</th>
                <th style={{ padding: 10, textAlign: 'center', color: '#cbd5e1' }}>Active</th>
                <th style={{ padding: 10, textAlign: 'center', color: '#cbd5e1' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(71,85,105,0.2)' }}>
                  <td style={{ padding: 8, color: '#e2e8f0', fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: 8 }}><span className="badge badge-blue">{r.frequency}</span></td>
                  <td style={{ padding: 8, color: '#cbd5e1' }}>{r.property_type}</td>
                  <td style={{ padding: 8, color: '#94a3b8', fontSize: 12 }}>
                    {Array.isArray(r.tasks) ? `${r.tasks.length} tasks: ${r.tasks.slice(0, 2).join(', ')}${r.tasks.length > 2 ? '...' : ''}` : ''}
                  </td>
                  <td style={{ padding: 8, color: '#cbd5e1', textAlign: 'center' }}>{r.est_hours}</td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <span className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>{r.active ? 'yes' : 'no'}</span>
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <button className="btn" style={{ marginRight: 8, background: '#3b82f6', color: '#fff', padding: '4px 10px', fontSize: 12 }} onClick={() => handleEdit(r)}>Edit</button>
                    <button className="btn" style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No rules yet. Click "+ New Rule" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, width: 600, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#e2e8f0' }}>{editing ? 'Edit' : 'New'} Service Rule</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: 4, fontSize: 12 }}>Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: 4, fontSize: 12 }}>Frequency</label>
                  <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6 }}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: 4, fontSize: 12 }}>Property Type</label>
                  <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6 }}>
                    {PROPERTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', marginBottom: 4, fontSize: 12 }}>Est. Hours</label>
                  <input type="number" step="0.5" min="0" value={form.est_hours} onChange={e => setForm({ ...form, est_hours: e.target.value })}
                    style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6 }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#cbd5e1', marginBottom: 4, fontSize: 12 }}>Tasks (one per line)</label>
                <textarea value={form.tasks} onChange={e => setForm({ ...form, tasks: e.target.value })} rows={6}
                  placeholder="Empty trash bins&#10;Vacuum carpets&#10;Wipe surfaces"
                  style={{ width: '100%', padding: 8, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6, fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#cbd5e1', fontSize: 12 }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} style={{ marginRight: 8 }} />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: 'rgba(71,85,105,0.6)', color: '#fff' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRulesEditor;
