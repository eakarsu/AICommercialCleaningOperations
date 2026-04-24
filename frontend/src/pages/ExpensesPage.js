import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', reimbursed: 'badge-blue' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
};

const formatCategory = (cat) => {
  if (!cat) return '';
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const formatCurrency = (amount) => {
  return parseFloat(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const emptyExpense = {
  description: '', category: 'supplies', amount: '', date: '', vendor: '',
  payment_method: 'credit_card', receipt_number: '', status: 'pending',
  submitted_by: '', approved_by: '', crew_name: '', client_name: '',
  is_recurring: false, recurrence_frequency: '', notes: '', tax_deductible: true
};

const ExpensesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyExpense);
  const [isEdit, setIsEdit] = useState(false);

  const load = useCallback(() => {
    api.get('/expenses').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyExpense); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Expense deleted');
    setSelected(null);
    load();
  };

  const handleApprove = async (id) => {
    const approver = window.prompt('Approved by (name):');
    if (!approver) return;
    try {
      const { data } = await api.post(`/expenses/${id}/approve`, { approved_by: approver });
      setSelected(data);
      toast.success('Expense approved');
      load();
    } catch (err) {
      toast.error('Failed to approve expense');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.recurrence_frequency) delete payload.recurrence_frequency;
      if (isEdit) {
        await api.put(`/expenses/${formData.id}`, payload);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving expense');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading expenses...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Expense Tracking</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Expense</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Submitted By</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.description}</td>
                <td>{formatCategory(item.category)}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{item.date}</td>
                <td>{item.vendor}</td>
                <td>{item.submitted_by}</td>
                <td>{formatCategory(item.payment_method)}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No expenses found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.description}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{formatCategory(selected.category)}</div></div>
                <div className="detail-item"><div className="detail-label">Amount</div><div className="detail-value" style={{ fontWeight: 600 }}>{formatCurrency(selected.amount)}</div></div>
                <div className="detail-item"><div className="detail-label">Date</div><div className="detail-value">{selected.date}</div></div>
                <div className="detail-item"><div className="detail-label">Vendor</div><div className="detail-value">{selected.vendor || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Payment Method</div><div className="detail-value">{formatCategory(selected.payment_method)}</div></div>
                <div className="detail-item"><div className="detail-label">Receipt Number</div><div className="detail-value">{selected.receipt_number || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                <div className="detail-item"><div className="detail-label">Submitted By</div><div className="detail-value">{selected.submitted_by}</div></div>
                <div className="detail-item"><div className="detail-label">Approved By</div><div className="detail-value">{selected.approved_by || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Crew</div><div className="detail-value">{selected.crew_name || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Client</div><div className="detail-value">{selected.client_name || '—'}</div></div>
                <div className="detail-item"><div className="detail-label">Recurring</div><div className="detail-value">{selected.is_recurring ? `Yes (${formatCategory(selected.recurrence_frequency || '')})` : 'No'}</div></div>
                <div className="detail-item"><div className="detail-label">Tax Deductible</div><div className="detail-value">{selected.tax_deductible ? 'Yes' : 'No'}</div></div>
              </div>
              {selected.notes && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="detail-label">Notes</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.status === 'pending' && (
                <button className="btn btn-success" onClick={() => handleApprove(selected.id)}>Approve</button>
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
              <h2>{isEdit ? 'Edit Expense' : 'New Expense'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Description</label>
                    <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                      <option value="supplies">Supplies</option>
                      <option value="equipment">Equipment</option>
                      <option value="fuel">Fuel</option>
                      <option value="vehicle_maintenance">Vehicle Maintenance</option>
                      <option value="insurance">Insurance</option>
                      <option value="uniforms">Uniforms</option>
                      <option value="training">Training</option>
                      <option value="office">Office</option>
                      <option value="marketing">Marketing</option>
                      <option value="misc">Misc</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input type="number" step="0.01" min="0" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vendor</label>
                    <input value={formData.vendor || ''} onChange={e => setFormData({ ...formData, vendor: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Receipt Number</label>
                    <input value={formData.receipt_number || ''} onChange={e => setFormData({ ...formData, receipt_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Submitted By</label>
                    <input value={formData.submitted_by} onChange={e => setFormData({ ...formData, submitted_by: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Crew Name</label>
                    <input value={formData.crew_name || ''} onChange={e => setFormData({ ...formData, crew_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Client Name</label>
                    <input value={formData.client_name || ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="reimbursed">Reimbursed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tax Deductible</label>
                    <select value={formData.tax_deductible ? 'true' : 'false'} onChange={e => setFormData({ ...formData, tax_deductible: e.target.value === 'true' })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Recurring</label>
                    <select value={formData.is_recurring ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_recurring: e.target.value === 'true' })}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  {formData.is_recurring && (
                    <div className="form-group">
                      <label>Recurrence Frequency</label>
                      <select value={formData.recurrence_frequency || ''} onChange={e => setFormData({ ...formData, recurrence_frequency: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  )}
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

export default ExpensesPage;
