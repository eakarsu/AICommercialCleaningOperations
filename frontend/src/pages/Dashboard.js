import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const features = [
    {
      key: 'routes', title: 'Route Optimization',
      desc: 'AI-powered route planning for cleaning crews. Optimize stops, reduce travel time, and improve crew efficiency.',
      icon: '🗺️', path: '/routes',
      stat: stats ? `${stats.active_routes} active` : '...', statLabel: 'Active Routes'
    },
    {
      key: 'supplies', title: 'Supply Forecasting',
      desc: 'Predict supply needs using AI. Track inventory levels, forecast demand, and automate reorder recommendations.',
      icon: '📦', path: '/supplies',
      stat: stats ? `${stats.low_stock_items} low stock` : '...', statLabel: 'Alerts'
    },
    {
      key: 'inspections', title: 'Quality Verification',
      desc: 'AI-assisted quality inspections. Score cleaning quality, identify issues, and track improvement trends.',
      icon: '✅', path: '/inspections',
      stat: stats ? `${stats.pending_inspections} pending` : '...', statLabel: 'Inspections'
    },
    {
      key: 'contracts', title: 'Contract Pricing',
      desc: 'AI-calculated pricing for cleaning contracts. Analyze property details, services, and market rates for optimal pricing.',
      icon: '💰', path: '/contracts',
      stat: stats ? `${stats.active_contracts} active` : '...', statLabel: 'Contracts'
    },
    {
      key: 'compliance', title: 'Compliance Tracking',
      desc: 'Track regulatory compliance across OSHA, EPA, state, and insurance requirements with AI-powered recommendations.',
      icon: '📋', path: '/compliance',
      stat: stats ? `${stats.pending_compliance} pending` : '...', statLabel: 'Items'
    },
    {
      key: 'crews', title: 'Crew Management',
      desc: 'Manage cleaning crews, track performance, assign shifts, and get AI-powered workforce optimization insights.',
      icon: '👥', path: '/crews',
      stat: stats ? `${stats.active_crews} active` : '...', statLabel: 'Active Crews'
    },
    {
      key: 'clients', title: 'Client Management',
      desc: 'CRM for cleaning clients. Track satisfaction, revenue, retention risk, and get AI-powered upsell recommendations.',
      icon: '🏢', path: '/clients',
      stat: stats ? `${stats.active_clients} active` : '...', statLabel: 'Active Clients'
    },
    {
      key: 'workorders', title: 'Work Orders',
      desc: 'Create and manage work orders. AI scheduling optimization, crew assignment, and resource allocation.',
      icon: '📝', path: '/workorders',
      stat: stats ? `${stats.open_work_orders} open` : '...', statLabel: 'Open Orders'
    },
    {
      key: 'equipment', title: 'Equipment Management',
      desc: 'Track equipment lifecycle, maintenance schedules, and get AI-powered predictive maintenance alerts.',
      icon: '🔧', path: '/equipment',
      stat: stats ? `${stats.equipment_in_service} in service` : '...', statLabel: 'Equipment'
    },
    {
      key: 'invoices', title: 'Invoicing & Billing',
      desc: 'Generate invoices, track payments, and get AI billing analytics with cash flow insights.',
      icon: '💳', path: '/invoices',
      stat: stats ? `${stats.overdue_invoices} overdue` : '...', statLabel: 'Invoices'
    },
    {
      key: 'incidents', title: 'Incident Reports',
      desc: 'Log and track incidents, safety violations, and property damage. AI risk analysis and prevention recommendations.',
      icon: '⚠️', path: '/incidents',
      stat: stats ? `${stats.open_incidents} open` : '...', statLabel: 'Incidents'
    },
    {
      key: 'timetracking', title: 'Time Tracking',
      desc: 'Track employee hours, clock in/out, manage timesheets, and calculate overtime and pay automatically.',
      icon: '⏱️', path: '/timetracking',
      stat: stats ? `${stats.clocked_in} clocked in` : '...', statLabel: 'Active'
    },
    {
      key: 'schedules', title: 'Scheduling',
      desc: 'Schedule crews at client sites with recurring appointments, priority levels, and service type tracking.',
      icon: '📅', path: '/schedules',
      stat: stats ? `${stats.scheduled_jobs} scheduled` : '...', statLabel: 'Upcoming'
    },
    {
      key: 'expenses', title: 'Expense Tracking',
      desc: 'Track business expenses by category, manage approvals, monitor spending, and flag tax-deductible items.',
      icon: '💵', path: '/expenses',
      stat: stats ? `${stats.pending_expenses} pending` : '...', statLabel: 'Expenses'
    },
    {
      key: 'checklists', title: 'Checklists',
      desc: 'Create cleaning task checklists and templates by property type. Track completion and assign to crews.',
      icon: '✔️', path: '/checklists',
      stat: stats ? `${stats.active_checklists} active` : '...', statLabel: 'Checklists'
    }
  ];

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Operations Dashboard</h1>
        <p>AI-Powered Commercial Cleaning Management</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Routes</div>
          <div className="stat-value blue">{stats?.total_routes || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Crews</div>
          <div className="stat-value green">{stats?.active_crews || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Clients</div>
          <div className="stat-value purple">{stats?.active_clients || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Work Orders</div>
          <div className="stat-value yellow">{stats?.open_work_orders || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Contracts</div>
          <div className="stat-value blue">{stats?.active_contracts || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Supplies Tracked</div>
          <div className="stat-value green">{stats?.total_supplies || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value red">{stats?.low_stock_items || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Equipment In Service</div>
          <div className="stat-value blue">{stats?.equipment_in_service || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue Invoices</div>
          <div className="stat-value red">{stats?.overdue_invoices || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Incidents</div>
          <div className="stat-value yellow">{stats?.open_incidents || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clocked In</div>
          <div className="stat-value green">{stats?.clocked_in || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Scheduled Jobs</div>
          <div className="stat-value blue">{stats?.scheduled_jobs || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Expenses</div>
          <div className="stat-value yellow">{stats?.pending_expenses || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Checklists</div>
          <div className="stat-value purple">{stats?.active_checklists || 0}</div>
        </div>
      </div>

      <div className="feature-grid">
        {features.map(f => (
          <div key={f.key} className={`feature-card ${f.key}`} onClick={() => navigate(f.path)}>
            <div className="feature-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <div className="feature-card-stat">
              <span>{f.statLabel}</span>
              <span>{f.stat}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
