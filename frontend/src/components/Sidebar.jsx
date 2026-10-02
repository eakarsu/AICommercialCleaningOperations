import React from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: "/login", label: "Login" },
  { to: "/routes", label: "Protected Route" },
  { to: "/supplies", label: "Protected Route" },
  { to: "/inspections", label: "Protected Route" },
  { to: "/contracts", label: "Protected Route" },
  { to: "/compliance", label: "Protected Route" },
  { to: "/crews", label: "Protected Route" },
  { to: "/clients", label: "Protected Route" },
  { to: "/workorders", label: "Protected Route" },
  { to: "/equipment", label: "Protected Route" },
  { to: "/invoices", label: "Protected Route" },
  { to: "/incidents", label: "Protected Route" },
  { to: "/timetracking", label: "Protected Route" },
  { to: "/schedules", label: "Protected Route" },
  { to: "/expenses", label: "Protected Route" },
  { to: "/checklists", label: "Protected Route" },
  { to: "/notifications", label: "Protected Route" },
  { to: "/webhooks", label: "Protected Route" },
  { to: "/ai-insights", label: "Protected Route" },
  { to: "/custom-views", label: "Protected Route" },
];

const CSS = `
.app-shell{display:grid;grid-template-columns:264px 1fr;min-height:100vh}
.sidebar{background:#0b1220;color:#fff;padding:22px 14px;position:sticky;top:0;height:100vh;overflow:auto;display:flex;flex-direction:column;gap:6px}
.sidebar-brand{padding:6px 10px 16px;border-bottom:1px solid #ffffff18;margin-bottom:10px}
.sidebar-brand .eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800;color:#7dd3fc}
.sidebar-brand h1{font-size:17px;margin:8px 0 0;line-height:1.25;word-break:break-word}
.sidebar-nav{display:flex;flex-direction:column;gap:2px;flex:1;overflow:auto}
.sidebar-nav a{display:block;border-radius:10px;color:#94a3b8;padding:9px 12px;text-decoration:none;font-weight:600;font-size:13.5px}
.sidebar-nav a:hover{background:#ffffff12;color:#fff}
.sidebar-nav a.active{background:#2563eb;color:#fff}
.sidebar-foot{margin-top:12px;padding-top:12px;border-top:1px solid #ffffff18;display:flex;flex-direction:column;gap:8px}
.sidebar-user{font-size:12px;color:#cbd5e1}
.sidebar-logout{border:0;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer;background:#1e293b;color:#e2e8f0}
.sidebar-logout:hover{background:#334155}
@media(max-width:900px){.app-shell{grid-template-columns:1fr}.sidebar{position:relative;height:auto}}
`;

export default function Sidebar({ user, onLogout }) {
  return (
    <>
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="eyebrow">Sidebar app</span>
          <h1>AICommercialCleaningOperations</h1>
        </div>
        <nav className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {user && <span className="sidebar-user">{user.name || user.email || 'Signed in'}</span>}
          <button className="sidebar-logout" onClick={onLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}
