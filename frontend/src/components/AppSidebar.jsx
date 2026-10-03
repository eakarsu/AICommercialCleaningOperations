import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/insights/timeline', label: 'Timeline View', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/routes', label: 'Routes', group: 'Workspace' },
  { to: '/supplies', label: 'Supplies', group: 'Workspace' },
  { to: '/inspections', label: 'Inspections', group: 'Workspace' },
  { to: '/contracts', label: 'Contracts', group: 'Workspace' },
  { to: '/compliance', label: 'Compliance', group: 'Workspace' },
  { to: '/crews', label: 'Crews', group: 'Workspace' },
  { to: '/clients', label: 'Clients', group: 'Workspace' },
  { to: '/workorders', label: 'Work Orders', group: 'Workspace' },
  { to: '/equipment', label: 'Equipment', group: 'Workspace' },
  { to: '/invoices', label: 'Invoices', group: 'Workspace' },
  { to: '/incidents', label: 'Incidents', group: 'Workspace' },
  { to: '/timetracking', label: 'Time Tracking', group: 'Workspace' },
  { to: '/schedules', label: 'Schedule', group: 'Workspace' },
  { to: '/expenses', label: 'Expenses', group: 'Workspace' },
  { to: '/checklists', label: 'Checklists', group: 'Workspace' },
  { to: '/notifications', label: 'Notifications', group: 'Workspace' },
  { to: '/webhooks', label: 'Webhooks', group: 'Workspace' },
  { to: '/ai-insights', label: 'AI Insights', group: 'AI tools' },
  { to: '/custom-views', label: 'Custom Views', group: 'Workspace' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AICommercial Cleaning Operations</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
