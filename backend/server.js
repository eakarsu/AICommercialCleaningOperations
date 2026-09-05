const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./config/runtime').validateRuntime();

const sequelize = require('./config/database');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((value) => value.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`);
}
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed')); }, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/supplies', require('./routes/supplies'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/crews', require('./routes/crews'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/workorders', require('./routes/workorders'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/timetracking', require('./routes/timetracking'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/ai', require('./routes/aiNew'));
// Audit-recommended additions (notifications, webhooks)
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/service-workflow', require('./routes/serviceWorkflow'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard stats
const auth = require('./middleware/auth');
const Route = require('./models/Route');
const Supply = require('./models/Supply');
const QualityInspection = require('./models/QualityInspection');
const Contract = require('./models/Contract');
const Compliance = require('./models/Compliance');
const Crew = require('./models/Crew');
const Client = require('./models/Client');
const WorkOrder = require('./models/WorkOrder');
const Equipment = require('./models/Equipment');
const Invoice = require('./models/Invoice');
const Incident = require('./models/Incident');
const TimeEntry = require('./models/TimeEntry');
const Schedule = require('./models/Schedule');
const Expense = require('./models/Expense');
const Checklist = require('./models/Checklist');

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const [routes, supplies, inspections, contracts, compliance, crews, clients, workorders, equipment, invoices, incidents,
           timeEntries, schedules, expenses, checklists] = await Promise.all([
      Route.count(),
      Supply.count(),
      QualityInspection.count(),
      Contract.count(),
      Compliance.count(),
      Crew.count(),
      Client.count(),
      WorkOrder.count(),
      Equipment.count(),
      Invoice.count(),
      Incident.count(),
      TimeEntry.count(),
      Schedule.count(),
      Expense.count(),
      Checklist.count()
    ]);

    const [activeContracts, lowStock, pendingInspections, pendingCompliance, activeRoutes,
           activeCrews, activeClients, openWorkOrders, equipmentInService, overdueInvoices, openIncidents,
           clockedIn, scheduledToday, pendingExpenses, activeChecklists] = await Promise.all([
      Contract.count({ where: { status: 'active' } }),
      Supply.count({ where: { status: 'low_stock' } }),
      QualityInspection.count({ where: { status: 'pending' } }),
      Compliance.count({ where: { status: 'pending' } }),
      Route.count({ where: { status: 'in_progress' } }),
      Crew.count({ where: { status: 'active' } }),
      Client.count({ where: { status: 'active' } }),
      WorkOrder.count({ where: { status: 'open' } }),
      Equipment.count({ where: { status: 'in_service' } }),
      Invoice.count({ where: { status: 'overdue' } }),
      Incident.count({ where: { status: 'reported' } }),
      TimeEntry.count({ where: { status: 'clocked_in' } }),
      Schedule.count({ where: { status: 'scheduled' } }),
      Expense.count({ where: { status: 'pending' } }),
      Checklist.count({ where: { status: 'in_progress' } })
    ]);

    res.json({
      total_routes: routes, total_supplies: supplies, total_inspections: inspections,
      total_contracts: contracts, total_compliance: compliance, total_crews: crews,
      total_clients: clients, total_workorders: workorders, total_equipment: equipment,
      total_invoices: invoices, total_incidents: incidents,
      total_time_entries: timeEntries, total_schedules: schedules,
      total_expenses: expenses, total_checklists: checklists,
      active_contracts: activeContracts, low_stock_items: lowStock,
      pending_inspections: pendingInspections, pending_compliance: pendingCompliance,
      active_routes: activeRoutes, active_crews: activeCrews, active_clients: activeClients,
      open_work_orders: openWorkOrders, equipment_in_service: equipmentInService,
      overdue_invoices: overdueInvoices, open_incidents: openIncidents,
      clocked_in: clockedIn, scheduled_jobs: scheduledToday,
      pending_expenses: pendingExpenses, active_checklists: activeChecklists
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    // Schema changes are explicit and reviewable via scripts/migrate.sh.

    
app.use('/api/ops-coordinator', require('./routes/opsCoordinatorAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/osha-epa-rag', require('./routes/oshaEpaSdsRag')); // apply pass 6 — audit custom suggestion

app.use('/api/equipment-iot', require('./routes/equipmentIotStream')); // apply pass 6 — audit custom suggestion

app.use('/api/janitorial-franchise', require('./routes/janitorialFranchiseWhiteLabel')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
