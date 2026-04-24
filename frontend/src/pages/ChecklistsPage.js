import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { template: 'badge-blue', assigned: 'badge-yellow', in_progress: 'badge-blue', completed: 'badge-green', overdue: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const emptyChecklist = {
  name: '', property_type: 'general', service_type: 'regular', items: [],
  assigned_crew: '', assigned_client: '', due_date: '', completed_date: '',
  status: 'template', completion_percentage: 0, notes: '', created_by: ''
};

const emptyItem = { task: '', category: '', required: false, completed: false };

const ChecklistsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyChecklist);
  const [isEdit, setIsEdit] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);

  const load = useCallback(() => {
    api.get('/checklists').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData({ ...emptyChecklist, items: [] }); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this checklist?')) return;
    await api.delete(`/checklists/${id}`);
    toast.success('Checklist deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/checklists/${formData.id}`, formData);
        toast.success('Checklist updated');
      } else {
        await api.post('/checklists', formData);
        toast.success('Checklist created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving checklist');
    }
  };

  const openDetail = (item) => {
    setSelected(item);
    setChecklistItems(Array.isArray(item.items) ? item.items.map(i => ({ ...i })) : []);
  };

  const toggleItem = (index) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setChecklistItems(updated);
  };

  const saveChecklistItems = async () => {
    try {
      const { data } = await api.put(`/checklists/${selected.id}/items`, { items: checklistItems });
      setSelected(data);
      setChecklistItems(Array.isArray(data.items) ? data.items.map(i => ({ ...i })) : []);
      toast.success('Checklist items saved');
      load();
    } catch (err) {
      toast.error('Error saving checklist items');
    }
  };

  const addFormItem = () => {
    setFormData({ ...formData, items: [...(formData.items || []), { ...emptyItem }] });
  };

  const removeFormItem = (index) => {
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData({ ...formData, items: updated });
  };

  const updateFormItem = (index, field, value) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, items: updated });
  };

  // Group checklist items by category
  const groupByCategory = (itemsList) => {
    const groups = {};
    itemsList.forEach((item, index) => {
      const cat = item.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...item, _index: index });
    });
    return groups;
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading checklists...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Checklists</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Checklist</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Property Type</th>
              <th>Service Type</th>
              <th>Crew</th>
              <th>Client</th>
              <th>Due Date</th>
              <th>Completion</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => openDetail(item)}>
                <td style={{ fontWeight: 600 }}>{item.name}</td>
                <td>{item.property_type?.replace('_', ' ')}</td>
                <td>{item.service_type?.replace('_', ' ')}</td>
                <td>{item.assigned_crew}</td>
                <td>{item.assigned_client}</td>
                <td>{item.due_date}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '8px', minWidth: '60px' }}>
                      <div style={{ width: `${item.completion_percentage || 0}%`, background: item.completion_percentage === 100 ? '#22c55e' : '#3b82f6', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.85em', fontWeight: 600 }}>{item.completion_percentage || 0}%</span>
                  </div>
                </td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No checklists found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{selected.name}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Property Type</div><div className="detail-value">{selected.property_type?.replace('_', ' ')}</div></div>
                <div className="detail-item"><div className="detail-label">Service Type</div><div className="detail-value">{selected.service_type?.replace('_', ' ')}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned Crew</div><div className="detail-value">{selected.assigned_crew || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Assigned Client</div><div className="detail-value">{selected.assigned_client || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Due Date</div><div className="detail-value">{selected.due_date || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Completed Date</div><div className="detail-value">{selected.completed_date || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Created By</div><div className="detail-value">{selected.created_by || '-'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
              </div>

              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>Completion</span>
                  <span style={{ fontWeight: 600 }}>{selected.completion_percentage || 0}%</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: '6px', height: '12px', width: '100%' }}>
                  <div style={{ width: `${selected.completion_percentage || 0}%`, background: selected.completion_percentage === 100 ? '#22c55e' : '#3b82f6', height: '100%', borderRadius: '6px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {selected.notes && (
                <div style={{ margin: '12px 0' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Notes</div>
                  <div style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                </div>
              )}

              {checklistItems.length > 0 && (
                <div style={{ margin: '16px 0' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.05em', marginBottom: '8px' }}>Checklist Items</div>
                  {Object.entries(groupByCategory(checklistItems)).map(([category, catItems]) => (
                    <div key={category} style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9em', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '2px' }}>{category}</div>
                      {catItems.map((ci) => (
                        <label key={ci._index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                          <input type="checkbox" checked={ci.completed} onChange={() => toggleItem(ci._index)} style={{ width: '18px', height: '18px' }} />
                          <span style={{ flex: 1, textDecoration: ci.completed ? 'line-through' : 'none', color: ci.completed ? '#9ca3af' : '#111827' }}>{ci.task}</span>
                          {ci.required && <span className="badge badge-red" style={{ fontSize: '0.7em' }}>Required</span>}
                        </label>
                      ))}
                    </div>
                  ))}
                  <button className="btn btn-success" onClick={saveChecklistItems} style={{ marginTop: '8px' }}>Save Checklist Items</button>
                </div>
              )}
              {checklistItems.length === 0 && (
                <div style={{ margin: '16px 0', color: '#9ca3af' }}>No checklist items</div>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{isEdit ? 'Edit Checklist' : 'New Checklist'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Created By</label>
                    <input value={formData.created_by || ''} onChange={e => setFormData({ ...formData, created_by: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Property Type</label>
                    <select value={formData.property_type} onChange={e => setFormData({ ...formData, property_type: e.target.value })}>
                      <option value="general">General</option>
                      <option value="office">Office</option>
                      <option value="medical">Medical</option>
                      <option value="retail">Retail</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="school">School</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="gym">Gym</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Service Type</label>
                    <select value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })}>
                      <option value="regular">Regular</option>
                      <option value="deep_clean">Deep Clean</option>
                      <option value="floor_care">Floor Care</option>
                      <option value="restroom">Restroom</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="post_construction">Post Construction</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Assigned Crew</label>
                    <input value={formData.assigned_crew || ''} onChange={e => setFormData({ ...formData, assigned_crew: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Client</label>
                    <input value={formData.assigned_client || ''} onChange={e => setFormData({ ...formData, assigned_client: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.due_date || ''} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="template">Template</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, fontSize: '1.05em' }}>Checklist Items</label>
                    <button type="button" className="btn btn-primary" onClick={addFormItem} style={{ padding: '4px 12px', fontSize: '0.85em' }}>+ Add Item</button>
                  </div>
                  {(formData.items || []).map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', padding: '6px', background: '#f9fafb', borderRadius: '6px' }}>
                      <input placeholder="Task name" value={item.task} onChange={e => updateFormItem(index, 'task', e.target.value)} style={{ flex: 2 }} required />
                      <input placeholder="Category" value={item.category || ''} onChange={e => updateFormItem(index, 'category', e.target.value)} style={{ flex: 1 }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize: '0.85em' }}>
                        <input type="checkbox" checked={item.required} onChange={e => updateFormItem(index, 'required', e.target.checked)} />
                        Required
                      </label>
                      <button type="button" onClick={() => removeFormItem(index)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>X</button>
                    </div>
                  ))}
                  {(formData.items || []).length === 0 && <div style={{ color: '#9ca3af', fontSize: '0.9em' }}>No items added yet</div>}
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

export default ChecklistsPage;
