import React, { useState, useEffect } from 'react';
import api from '../services/api';

const colorScale = (v) => {
  // 0..100 -> red->yellow->green
  if (v == null) return 'rgba(71,85,105,0.4)';
  const clamped = Math.max(0, Math.min(100, v));
  // Hue 0 (red) to 120 (green)
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 75%, 42%)`;
};

const SitePerformanceHeatmap = () => {
  const [data, setData] = useState({ metrics: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/custom-views/site-heatmap')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.error || 'Failed to load heatmap'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading site performance heatmap...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: 20 }}>{error}</div>;

  const { metrics, rows } = data;

  return (
    <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 12, padding: 20, border: '1px solid rgba(139,92,246,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Site Performance Heatmap</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#94a3b8' }}>
          <span>Low</span>
          <div style={{ width: 120, height: 12, borderRadius: 2, background: 'linear-gradient(to right, hsl(0,75%,42%), hsl(60,75%,42%), hsl(120,75%,42%))' }}></div>
          <span>High</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
        {rows.length} sites x {metrics.length} metrics
      </div>
      {data.note && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>{data.note}</div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'rgba(15,23,42,0.7)' }}>
              <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1', position: 'sticky', left: 0, background: 'rgba(15,23,42,0.95)', minWidth: 180 }}>Site</th>
              <th style={{ padding: 10, textAlign: 'left', color: '#cbd5e1' }}>Industry</th>
              {metrics.map(m => (
                <th key={m} style={{ padding: 10, textAlign: 'center', color: '#cbd5e1', minWidth: 90 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(71,85,105,0.2)' }}>
                <td style={{ padding: 8, color: '#e2e8f0', fontWeight: 600, position: 'sticky', left: 0, background: 'rgba(15,23,42,0.95)' }}>{r.site}</td>
                <td style={{ padding: 8, color: '#94a3b8', fontSize: 11 }}>{r.industry}</td>
                {metrics.map(m => {
                  const v = r.values[m];
                  if (v == null) {
                    return (
                      <td key={m} style={{ padding: 4, textAlign: 'center' }}>
                        <div
                          title={`${r.site} - ${m}: no data recorded`}
                          style={{ background: 'rgba(71,85,105,0.4)', color: '#cbd5e1', padding: '8px 4px', borderRadius: 4, fontSize: 11 }}
                        >
                          no data
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={m} style={{ padding: 4, textAlign: 'center' }}>
                      <div
                        title={`${r.site} - ${m}: ${v}`}
                        style={{
                          background: colorScale(v),
                          color: '#fff',
                          padding: '8px 4px',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 13
                        }}
                      >
                        {v}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SitePerformanceHeatmap;
