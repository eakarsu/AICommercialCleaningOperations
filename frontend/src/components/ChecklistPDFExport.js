import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ChecklistPDFExport = () => {
  const [checklists, setChecklists] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/checklists')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.items || []);
        setChecklists(list);
        if (list.length) setSelectedId(list[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const url = selectedId
        ? `/custom-views/checklist-pdf/${selectedId}`
        : `/custom-views/checklist-pdf`;
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `cleaning_checklist_${selectedId || 'latest'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error('PDF generation failed');
    } finally {
      setDownloading(false);
    }
  };

  const previewPDF = () => {
    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/custom-views/checklist-pdf${selectedId ? `/${selectedId}` : ''}`;
    // Open with token via fetch + blob to handle auth
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => toast.error('Preview failed'));
  };

  return (
    <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 12, padding: 20, border: '1px solid rgba(139,92,246,0.2)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#e2e8f0' }}>Cleaning Checklist PDF Export</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Generate a printable PDF of any cleaning checklist for crew distribution and site verification.
      </p>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading checklists...</div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Select Checklist</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', padding: 10, background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 6 }}
            >
              <option value="">-- Latest Checklist (Default) --</option>
              {checklists.map(c => (
                <option key={c.id} value={c.id}>
                  #{c.id} - {c.name} ({c.property_type}/{c.service_type})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={downloadPDF}
              disabled={downloading}
              style={{ flex: 1 }}
            >
              {downloading ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              className="btn"
              onClick={previewPDF}
              style={{ flex: 1, background: 'rgba(71,85,105,0.6)', color: '#fff' }}
            >
              Preview in New Tab
            </button>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: 'rgba(15,23,42,0.5)', borderRadius: 6, fontSize: 11, color: '#94a3b8' }}>
            PDF includes: name, property/service type, assigned crew/client, due date, completion %, and full task list with checkboxes.
          </div>
        </>
      )}
    </div>
  );
};

export default ChecklistPDFExport;
