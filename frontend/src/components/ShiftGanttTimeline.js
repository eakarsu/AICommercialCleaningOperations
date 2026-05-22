import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#6b7280',
  rescheduled: '#a855f7'
};

const ShiftGanttTimeline = () => {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get('/custom-views/shift-gantt')
      .then(r => {
        setLanes(r.data.lanes || []);
        setTotal(r.data.total_shifts || 0);
        setLoading(false);
      })
      .catch(e => {
        setError(e.response?.data?.error || 'Failed to load gantt');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading shift schedule...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: 20 }}>{error}</div>;

  // Build a date window from all shifts
  const allShifts = lanes.flatMap(l => l.shifts);
  const dates = Array.from(new Set(allShifts.map(s => s.date))).sort();
  const dateWindow = dates.slice(0, 14); // first 14 distinct dates

  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':');
    return parseInt(h) * 60 + parseInt(m);
  };

  return (
    <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 12, padding: 20, border: '1px solid rgba(139,92,246,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Shift Schedule - Gantt Timeline</h3>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#cbd5e1' }}>
              <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: 'inline-block' }}></span>
              {s.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
        {total} total shifts across {lanes.length} crews | Window: {dateWindow[0]} to {dateWindow[dateWindow.length - 1]}
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 600 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: 'rgba(15,23,42,0.7)' }}>
              <th style={{ padding: 8, textAlign: 'left', color: '#cbd5e1', position: 'sticky', left: 0, background: 'rgba(15,23,42,0.95)', minWidth: 140 }}>Crew</th>
              {dateWindow.map(d => (
                <th key={d} style={{ padding: 8, textAlign: 'center', color: '#cbd5e1', fontSize: 11, minWidth: 100, borderLeft: '1px solid rgba(71,85,105,0.3)' }}>
                  {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lanes.map(lane => (
              <tr key={lane.crew} style={{ borderTop: '1px solid rgba(71,85,105,0.2)' }}>
                <td style={{ padding: 8, color: '#e2e8f0', fontWeight: 600, position: 'sticky', left: 0, background: 'rgba(15,23,42,0.95)' }}>{lane.crew}</td>
                {dateWindow.map(d => {
                  const dayShifts = lane.shifts.filter(s => s.date === d);
                  return (
                    <td key={d} style={{ padding: 4, borderLeft: '1px solid rgba(71,85,105,0.3)', verticalAlign: 'top', position: 'relative', height: 60 }}>
                      {dayShifts.map(s => {
                        const startM = timeToMinutes(s.start_time);
                        const endM = timeToMinutes(s.end_time);
                        const dur = Math.max(endM - startM, 30);
                        const widthPct = Math.min((dur / (12 * 60)) * 100, 100);
                        const leftPct = Math.min(((startM - 6 * 60) / (12 * 60)) * 100, 90);
                        return (
                          <div
                            key={s.id}
                            title={`${s.title} | ${s.client} | ${s.start_time}-${s.end_time}`}
                            style={{
                              background: STATUS_COLORS[s.status] || '#6b7280',
                              color: '#fff',
                              padding: '2px 4px',
                              fontSize: 10,
                              borderRadius: 3,
                              marginBottom: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginLeft: `${Math.max(leftPct, 0)}%`,
                              width: `${widthPct}%`,
                              minWidth: 30
                            }}
                          >
                            {s.client?.slice(0, 12)}
                          </div>
                        );
                      })}
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

export default ShiftGanttTimeline;
