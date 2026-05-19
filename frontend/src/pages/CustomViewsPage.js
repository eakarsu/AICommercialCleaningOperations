import React, { useState } from 'react';
import ShiftGanttTimeline from '../components/ShiftGanttTimeline';
import SitePerformanceHeatmap from '../components/SitePerformanceHeatmap';
import ChecklistPDFExport from '../components/ChecklistPDFExport';
import ServiceRulesEditor from '../components/ServiceRulesEditor';

const TABS = [
  { key: 'gantt', label: 'Shift Gantt Timeline', icon: 'GANTT' },
  { key: 'heatmap', label: 'Site Performance Heatmap', icon: 'HEAT' },
  { key: 'pdf', label: 'Checklist PDF Export', icon: 'PDF' },
  { key: 'rules', label: 'Service Rules Editor', icon: 'RULES' }
];

const CustomViewsPage = () => {
  const [tab, setTab] = useState('gantt');

  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <h1>Cleaning Views</h1>
        <div className="page-header-actions">
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            Operational visualizations and configuration tools for commercial cleaning operations
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid rgba(71,85,105,0.3)', paddingBottom: 8 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            style={{
              padding: '10px 18px',
              background: tab === t.key ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(30,41,59,0.5)',
              color: tab === t.key ? '#fff' : '#cbd5e1',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s'
            }}
          >
            {t.icon} - {t.label}
          </button>
        ))}
      </div>

      <div data-testid={`panel-${tab}`}>
        {tab === 'gantt' && <ShiftGanttTimeline />}
        {tab === 'heatmap' && <SitePerformanceHeatmap />}
        {tab === 'pdf' && <ChecklistPDFExport />}
        {tab === 'rules' && <ServiceRulesEditor />}
      </div>
    </div>
  );
};

export default CustomViewsPage;
