const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sequelize = require('./config/database');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
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
    await sequelize.sync({ alter: true });
    console.log('Models synchronized');

    
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


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-0-mounted-chat-style-ai-endpoints-despite-ainew-js', require('./routes/gap_0_mounted_chat_style_ai_endpoints_despite_ainew_js'));
app.use('/api/gap-no-ai-vision-based-pre-post-clean-verification-fro', require('./routes/gap_no_ai_vision_based_pre_post_clean_verification_fro'));
app.use('/api/gap-no-ai-dynamic-scheduling-vs-travel-time-and-crew-s', require('./routes/gap_no_ai_dynamic_scheduling_vs_travel_time_and_crew_s'));
app.use('/api/gap-no-ai-auto-quote-generator-from-rfp', require('./routes/gap_no_ai_auto_quote_generator_from_rfp'));
app.use('/api/gap-no-ai-safety-incident-classifier', require('./routes/gap_no_ai_safety_incident_classifier'));
app.use('/api/gap-notification-routes-exist-but-no-sms-push-delivery', require('./routes/gap_notification_routes_exist_but_no_sms_push_delivery'));
app.use('/api/gap-no-direct-accounting-api-client-quickbooks-xero', require('./routes/gap_no_direct_accounting_api_client_quickbooks_xero'));
app.use('/api/gap-no-gps-clock-in-live-route-optimization-for-crews', require('./routes/gap_no_gps_clock_in_live_route_optimization_for_crews'));
app.use('/api/gap-no-customer-self-service-portal', require('./routes/gap_no_customer_self_service_portal'));
app.use('/api/gap-no-mobile-app-for-cleaning-crews', require('./routes/gap_no_mobile_app_for_cleaning_crews'));
