import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { active: 'badge-green', on_leave: 'badge-yellow', training: 'badge-blue', inactive: 'badge-gray' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const performanceColor = (score) => {
  if (score >= 8.5) return '#22c55e';
  if (score >= 7) return '#eab308';
  return '#ef4444';
};

const emptyCrew = { name: '', team_lead: '', members: [], specializations: [], status: 'active', shift: 'morning', region: '', performance_score: '', total_jobs_completed: 0, hourly_rate: '', certifications: [], phone: '' };

const CrewsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyCrew);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/crews').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyCrew); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this crew?')) return;
    await api.delete(`/crews/${id}`);
    toast.success('Crew deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/crews/${formData.id}`, formData);
        toast.success('Crew updated');
      } else {
        await api.post('/crews', formData);
        toast.success('Crew created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving crew');
    }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/crews/${id}/analyze`);
      setSelected(data.crew);
      toast.success('AI performance analysis complete!');
      load();
    } catch (err) {
      toast.error('AI analysis failed');
    }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading crews...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>👥 Crew Management</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Crew</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Team Lead</th>
              <th>Members</th>
              <th>Shift</th>
              <th>Region</th>
              <th>Performance</th>
              <th>Jobs Completed</th>
              <th>Hourly Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.team_lead}</td>
                <td>{Array.isArray(item.members) ? item.members.length : 0}</td>
                <td>{item.shift}</td>
                <td>{item.region}</td>
                <td><span style={{ color: performanceColor(item.performance_score), fontWeight: 600 }}>{item.performance_score}</span></td>
                <td>{item.total_jobs_completed}</td>
                <td>${item.hourly_rate}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No crews found</p></div>}
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
                <div className="detail-item"><div className="detail-label">Team Lead</div><div className="detail-value">{selected.team_lead}</div></div>
                <div className="detail-item"><div className="detail-label">Shift</div><div className="detail-value">{selected.shift}</div></div>
                <div className="detail-item"><div className="detail-label">Region</div><div className="detail-value">{selected.region}</div></div>
                <div className="detail-item"><div className="detail-label">Phone</div><div className="detail-value">{selected.phone}</div></div>
                <div className="detail-item"><div className="detail-label">Performance Score</div><div className="detail-value"><span style={{ color: performanceColor(selected.performance_score), fontWeight: 600 }}>{selected.performance_score}</span></div></div>
                <div className="detail-item"><div className="detail-label">Jobs Completed</div><div className="detail-value">{selected.total_jobs_completed}</div></div>
                <div className="detail-item"><div className="detail-label">Hourly Rate</div><div className="detail-value">${selected.hourly_rate}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
              </div>
              {selected.members && selected.members.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Members</div>
                  {selected.members.map((member, i) => (
                    <div key={i} className="ai-metric">
                      <span className="ai-metric-label">Member {i + 1}</span>
                      <span className="ai-metric-value">{typeof member === 'object' ? member.name || JSON.stringify(member) : member}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.specializations && selected.specializations.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Specializations</div>
                  {selected.specializations.map((spec, i) => (
                    <div key={i} className="ai-metric">
                      <span className="ai-metric-label">{typeof spec === 'object' ? spec.name || JSON.stringify(spec) : spec}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.certifications && selected.certifications.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Certifications</div>
                  {selected.certifications.map((cert, i) => (
                    <div key={i} className="ai-metric">
                      <span className="ai-metric-label">{typeof cert === 'object' ? cert.name || JSON.stringify(cert) : cert}</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.ai_performance_analysis && <AIOutput data={selected.ai_performance_analysis} title="AI Performance Analysis" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Performance Analysis'}
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
              <h2>{isEdit ? 'Edit Crew' : 'New Crew'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Crew Name</label>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Team Lead</label>
                    <input value={formData.team_lead} onChange={e => setFormData({ ...formData, team_lead: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Shift</label>
                    <select value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })}>
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Region</label>
                    <input value={formData.region || ''} onChange={e => setFormData({ ...formData, region: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hourly Rate ($)</label>
                    <input type="number" step="0.01" value={formData.hourly_rate || ''} onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Performance Score</label>
                    <input type="number" step="0.1" min="0" max="10" value={formData.performance_score || ''} onChange={e => setFormData({ ...formData, performance_score: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="training">Training</option>
                      <option value="inactive">Inactive</option>
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

export default CrewsPage;
