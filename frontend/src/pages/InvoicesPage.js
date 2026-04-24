import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const statusBadge = (s) => {
  const map = { draft: 'badge-gray', sent: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-red', partial: 'badge-yellow' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

const emptyInvoice = { invoice_number: '', client_name: '', issue_date: '', due_date: '', line_items: [], subtotal: '', tax_rate: 8.5, tax_amount: '', total: '', status: 'draft', payment_method: '', notes: '' };

const InvoicesPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyInvoice);
  const [isEdit, setIsEdit] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/invoices').then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = () => { setFormData(emptyInvoice); setIsEdit(false); setShowForm(true); };
  const handleEdit = (item) => { setFormData({ ...item }); setIsEdit(true); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    await api.delete(`/invoices/${id}`);
    toast.success('Invoice deleted');
    setSelected(null);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    try {
      if (isEdit) { await api.put(`/invoices/${formData.id}`, payload); toast.success('Invoice updated'); }
      else { await api.post('/invoices', payload); toast.success('Invoice created'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error saving invoice'); }
  };

  const handleAI = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/invoices/${id}/analyze`);
      setSelected(data.invoice);
      toast.success('AI billing insights ready!');
      load();
    } catch (err) { toast.error('AI analysis failed'); }
    setAiLoading(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading invoices...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>💳 Invoicing & Billing</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleCreate}>+ New Invoice</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Invoice #</th><th>Client</th><th>Issue Date</th><th>Due Date</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Payment Method</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} onClick={() => setSelected(item)}>
                <td style={{ fontWeight: 600 }}>{item.invoice_number}</td>
                <td>{item.client_name}</td>
                <td>{item.issue_date}</td>
                <td>{item.due_date}</td>
                <td>${Number(item.subtotal).toLocaleString()}</td>
                <td>${Number(item.tax_amount).toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: '#10b981' }}>${Number(item.total).toLocaleString()}</td>
                <td>{item.payment_method}</td>
                <td>{statusBadge(item.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><p>No invoices found</p></div>}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice {selected.invoice_number}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item"><div className="detail-label">Invoice Number</div><div className="detail-value">{selected.invoice_number}</div></div>
                <div className="detail-item"><div className="detail-label">Client</div><div className="detail-value">{selected.client_name}</div></div>
                <div className="detail-item"><div className="detail-label">Issue Date</div><div className="detail-value">{selected.issue_date}</div></div>
                <div className="detail-item"><div className="detail-label">Due Date</div><div className="detail-value">{selected.due_date}</div></div>
                <div className="detail-item"><div className="detail-label">Subtotal</div><div className="detail-value">${Number(selected.subtotal).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Tax Rate</div><div className="detail-value">{selected.tax_rate}%</div></div>
                <div className="detail-item"><div className="detail-label">Tax Amount</div><div className="detail-value">${Number(selected.tax_amount).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Total</div><div className="detail-value" style={{ color: '#10b981', fontSize: '20px' }}>${Number(selected.total).toLocaleString()}</div></div>
                <div className="detail-item"><div className="detail-label">Payment Method</div><div className="detail-value">{selected.payment_method}</div></div>
                <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value">{statusBadge(selected.status)}</div></div>
                {selected.notes && <div className="detail-item detail-full"><div className="detail-label">Notes</div><div className="detail-value">{selected.notes}</div></div>}
              </div>
              {selected.line_items && selected.line_items.length > 0 && (
                <div className="ai-section">
                  <div className="ai-section-title">Line Items</div>
                  <ul className="ai-list">
                    {selected.line_items.map((li, i) => (
                      <li key={i}>{li.description} — Qty: {li.quantity}, Rate: ${Number(li.rate).toLocaleString()}, Amount: ${Number(li.amount).toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.ai_billing_insights && <AIOutput data={selected.ai_billing_insights} title="AI Billing Insights" />}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ai" onClick={() => handleAI(selected.id)} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : '🤖 AI Billing Insights'}
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
              <h2>{isEdit ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Invoice Number</label><input value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} required /></div>
                  <div className="form-group"><label>Client Name</label><input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Issue Date</label><input type="date" value={formData.issue_date || ''} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} required /></div>
                  <div className="form-group"><label>Due Date</label><input type="date" value={formData.due_date || ''} onChange={e => setFormData({ ...formData, due_date: e.target.value })} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Subtotal ($)</label><input type="number" step="0.01" value={formData.subtotal || ''} onChange={e => setFormData({ ...formData, subtotal: e.target.value })} /></div>
                  <div className="form-group"><label>Tax Rate (%)</label><input type="number" step="0.01" value={formData.tax_rate || ''} onChange={e => setFormData({ ...formData, tax_rate: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Tax Amount ($)</label><input type="number" step="0.01" value={formData.tax_amount || ''} onChange={e => setFormData({ ...formData, tax_amount: e.target.value })} /></div>
                  <div className="form-group"><label>Total ($)</label><input type="number" step="0.01" value={formData.total || ''} onChange={e => setFormData({ ...formData, total: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option><option value="partial">Partial</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Payment Method</label><input value={formData.payment_method || ''} onChange={e => setFormData({ ...formData, payment_method: e.target.value })} placeholder="e.g. credit card, bank transfer, check" /></div>
                </div>
                <div className="form-group"><label>Notes</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
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

export default InvoicesPage;
