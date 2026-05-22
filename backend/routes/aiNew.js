const express = require('express');
const https = require('https');
const { Op } = require('sequelize');
const Client = require('../models/Client');
const WorkOrder = require('../models/WorkOrder');
const Crew = require('../models/Crew');
const Route = require('../models/Route');
const Equipment = require('../models/Equipment');
const QualityInspection = require('../models/QualityInspection');
const Supply = require('../models/Supply');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

const SYSTEM_PROMPT = 'You are an expert commercial cleaning operations manager. Provide actionable recommendations for route optimization, crew performance, supply management, and client retention.';

function callOpenRouter(userPrompt, maxTokens = 2500) {
  return new Promise((resolve, reject) => {
    if (!process.env.OPENROUTER_API_KEY) {
      const err = new Error('OPENROUTER_API_KEY not configured');
      err.code = 'NO_API_KEY';
      return reject(err);
    }
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AI Cleaning Operations'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return reject(new Error(parsed.error.message || 'OpenRouter error'));
          resolve({ content: parsed.choices?.[0]?.message?.content || '', model: parsed.model, usage: parsed.usage });
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseAIJson(content) {
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}
  return { raw_response: content };
}

// POST /api/ai/client-retention
// Body: { client_id }
// Fetches full client history, returns churn risk + retention recommendations
router.post('/client-retention', auth, rateLimiter, async (req, res) => {
  try {
    const { client_id } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await Client.findByPk(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Fetch work order history for this client
    const workOrders = await WorkOrder.findAll({
      where: { client_name: client.company_name },
      order: [['scheduled_date', 'DESC']],
      limit: 50
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);
    const ninetyDaysAgo = new Date(now - 90 * 86400000);

    const recentOrders = workOrders.filter(wo => new Date(wo.scheduled_date) >= thirtyDaysAgo);
    const quarterOrders = workOrders.filter(wo => new Date(wo.scheduled_date) >= ninetyDaysAgo);
    const completedOrders = workOrders.filter(wo => wo.status === 'completed');
    const cancelledOrders = workOrders.filter(wo => wo.status === 'cancelled');

    const avgScore = workOrders.reduce((sum, wo) => sum + (parseFloat(wo.quality_score) || 0), 0) /
      (workOrders.filter(wo => wo.quality_score).length || 1);

    const userPrompt = `Analyze this commercial cleaning client's history and provide churn risk assessment and retention recommendations.

Client Profile:
- Company: ${client.company_name}
- Contact: ${client.contact_name}
- Industry: ${client.industry}
- Contract Value: ${client.contract_value || 'N/A'}
- Client Since: ${client.created_at}
- Rating: ${client.rating || 'N/A'}
- Status: ${client.status || 'active'}

Work Order Statistics:
- Total Work Orders: ${workOrders.length}
- Last 30 Days: ${recentOrders.length}
- Last 90 Days: ${quarterOrders.length}
- Completed: ${completedOrders.length}
- Cancelled: ${cancelledOrders.length}
- Avg Quality Score: ${avgScore.toFixed(1)}

Recent Work Orders (last 10):
${JSON.stringify(workOrders.slice(0, 10).map(wo => ({
  date: wo.scheduled_date,
  status: wo.status,
  type: wo.type,
  priority: wo.priority,
  quality_score: wo.quality_score
})), null, 2)}

Return a JSON object with:
- churn_risk_score (0-100, higher = higher risk)
- churn_risk_level ("critical" | "high" | "medium" | "low")
- risk_factors (array of strings describing why client might churn)
- positive_indicators (array of strings showing client loyalty signals)
- retention_recommendations (array of {action, priority, expected_impact, timeline})
- upsell_opportunities (array of additional services to offer)
- next_best_action (string - most important thing to do right now)
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 2500);
    const analysis = parseAIJson(result.content);

    res.json({
      client,
      work_order_stats: {
        total: workOrders.length,
        last_30_days: recentOrders.length,
        last_90_days: quarterOrders.length,
        completed: completedOrders.length,
        cancelled: cancelledOrders.length,
        avg_quality_score: parseFloat(avgScore.toFixed(1))
      },
      ai_retention_analysis: analysis,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/crew-performance
// Body: { crew_id, period_days }
// Aggregates actual work order data, returns performance analysis
router.post('/crew-performance', auth, rateLimiter, async (req, res) => {
  try {
    const { crew_id, period_days = 30 } = req.body;
    if (!crew_id) return res.status(400).json({ error: 'crew_id is required' });

    const days = Math.min(365, Math.max(1, parseInt(period_days) || 30));

    const crew = await Crew.findByPk(crew_id);
    if (!crew) return res.status(404).json({ error: 'Crew not found' });

    const since = new Date(Date.now() - days * 86400000);

    // Fetch work orders assigned to this crew in the period
    const workOrders = await WorkOrder.findAll({
      where: {
        assigned_crew: crew.name,
        scheduled_date: { [Op.gte]: since.toISOString().split('T')[0] }
      },
      order: [['scheduled_date', 'DESC']]
    });

    // Fetch routes for this crew
    const routes = await Route.findAll({
      where: {
        crew_name: crew.name,
        date: { [Op.gte]: since.toISOString().split('T')[0] }
      },
      order: [['date', 'DESC']]
    });

    const completed = workOrders.filter(wo => wo.status === 'completed');
    const onTime = workOrders.filter(wo => wo.status === 'completed' && !wo.overdue);
    const avgQuality = completed.reduce((s, wo) => s + (parseFloat(wo.quality_score) || 0), 0) /
      (completed.filter(wo => wo.quality_score).length || 1);

    const userPrompt = `Analyze this cleaning crew's performance over the last ${days} days and provide a detailed assessment.

Crew Profile:
- Name: ${crew.name}
- Team Lead: ${crew.team_lead}
- Members: ${crew.member_count || 'N/A'}
- Specialization: ${crew.specialization || 'General cleaning'}
- Rating: ${crew.rating || 'N/A'}
- Status: ${crew.status || 'active'}

Performance Statistics (${days}-day period):
- Total Work Orders: ${workOrders.length}
- Completed: ${completed.length}
- Completion Rate: ${workOrders.length > 0 ? ((completed.length / workOrders.length) * 100).toFixed(1) : 0}%
- On-Time Completions: ${onTime.length}
- Average Quality Score: ${avgQuality.toFixed(1)}
- Routes Completed: ${routes.length}

Work Order Breakdown by Priority:
${['critical', 'high', 'medium', 'low'].map(p => {
  const count = workOrders.filter(wo => wo.priority === p).length;
  return `  - ${p}: ${count}`;
}).join('\n')}

Work Order Breakdown by Type:
${[...new Set(workOrders.map(wo => wo.type))].map(t => {
  const count = workOrders.filter(wo => wo.type === t).length;
  return `  - ${t || 'unspecified'}: ${count}`;
}).join('\n')}

Recent Work Orders (last 15):
${JSON.stringify(workOrders.slice(0, 15).map(wo => ({
  date: wo.scheduled_date,
  client: wo.client_name,
  type: wo.type,
  status: wo.status,
  priority: wo.priority,
  quality_score: wo.quality_score,
  estimated_hours: wo.estimated_hours
})), null, 2)}

Return a JSON object with:
- overall_performance_score (0-100)
- performance_grade ("A" | "B" | "C" | "D" | "F")
- strengths (array of strings)
- improvement_areas (array of strings)
- kpi_analysis (object with: completion_rate, quality_score, efficiency_rating, client_satisfaction)
- benchmark_comparison (how this crew compares to typical industry standards)
- training_recommendations (array of {topic, priority, reason})
- workload_assessment (string - over/under/appropriately loaded)
- incentive_suggestions (array of recognition or motivation strategies)
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 2500);
    const analysis = parseAIJson(result.content);

    res.json({
      crew,
      period_days: days,
      performance_stats: {
        total_work_orders: workOrders.length,
        completed: completed.length,
        completion_rate: workOrders.length > 0 ? parseFloat(((completed.length / workOrders.length) * 100).toFixed(1)) : 0,
        on_time: onTime.length,
        avg_quality_score: parseFloat(avgQuality.toFixed(1)),
        routes_completed: routes.length
      },
      ai_performance_analysis: analysis,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/energy-audit
// Body: { location_id }
// Equipment usage patterns, eco alternatives, carbon footprint
router.post('/energy-audit', auth, rateLimiter, async (req, res) => {
  try {
    const { location_id } = req.body;
    if (!location_id) return res.status(400).json({ error: 'location_id is required' });

    // Fetch equipment at this location
    const equipmentList = await Equipment.findAll({
      where: { location_id: location_id.toString() },
      order: [['name', 'ASC']]
    });

    // If no location_id match, try by location field
    const allEquipment = equipmentList.length > 0 ? equipmentList : await Equipment.findAll({
      where: { location: location_id.toString() },
      order: [['name', 'ASC']]
    });

    if (allEquipment.length === 0) {
      return res.status(404).json({ error: 'No equipment found for this location. Check location_id.' });
    }

    const totalEquipment = allEquipment.length;
    const activeEquipment = allEquipment.filter(e => e.status === 'active' || e.status === 'operational');
    const equipmentByType = {};
    allEquipment.forEach(e => {
      const t = e.type || e.equipment_type || 'unknown';
      if (!equipmentByType[t]) equipmentByType[t] = [];
      equipmentByType[t].push(e.name);
    });

    const userPrompt = `Perform an energy audit for a commercial cleaning location based on their equipment inventory.

Location ID: ${location_id}
Equipment Overview:
- Total Equipment Items: ${totalEquipment}
- Active Equipment: ${activeEquipment.length}
- Equipment by Type: ${JSON.stringify(equipmentByType, null, 2)}

Detailed Equipment List:
${JSON.stringify(allEquipment.map(e => ({
  id: e.id,
  name: e.name,
  type: e.type || e.equipment_type,
  status: e.status,
  brand: e.brand,
  model: e.model,
  year: e.year || e.manufacture_year,
  last_maintenance: e.last_maintenance_date,
  hours_used: e.hours_used || e.usage_hours
})), null, 2)}

Return a JSON object with:
- energy_audit_summary (object with: estimated_monthly_kwh, estimated_monthly_cost_usd, carbon_footprint_kg_co2_per_month)
- equipment_efficiency_scores (array of {equipment_name, efficiency_grade: "A"|"B"|"C"|"D"|"F", estimated_energy_draw_kw, notes})
- high_consumption_items (array of equipment names consuming most energy)
- eco_friendly_alternatives (array of {current_equipment, alternative_product, estimated_savings_percent, payback_period_months, certification: e.g. "ENERGY STAR"})
- optimization_recommendations (array of {action, category: "behavioral"|"equipment"|"scheduling", estimated_savings_kwh_per_month, priority: "high"|"medium"|"low"})
- carbon_footprint_breakdown (object)
- green_certification_opportunities (array of certifications achievable with these improvements)
- roi_analysis (object with: total_investment_estimate, annual_savings, payback_years)
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 3000);
    const analysis = parseAIJson(result.content);

    res.json({
      location_id,
      equipment_count: totalEquipment,
      active_equipment: activeEquipment.length,
      equipment_by_type: equipmentByType,
      equipment_list: allEquipment,
      ai_energy_audit: analysis,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/optimize-routes
// Body: { date?, crew_id? }
// Builds an optimized dispatch plan from open work orders + crew availability.
router.post('/optimize-routes', auth, rateLimiter, async (req, res) => {
  try {
    const { date, crew_id } = req.body || {};
    const targetDate = date || new Date().toISOString().split('T')[0];

    const woWhere = { status: ['open', 'scheduled', 'in_progress'] };
    if (date) woWhere.scheduled_date = date;
    const workOrders = await WorkOrder.findAll({ where: woWhere, limit: 100 }).catch(() => []);

    const crewWhere = { status: 'active' };
    if (crew_id) crewWhere.id = crew_id;
    const crews = await Crew.findAll({ where: crewWhere, limit: 50 }).catch(() => []);

    if (workOrders.length === 0) {
      return res.status(404).json({ error: 'No open work orders found for optimization' });
    }
    if (crews.length === 0) {
      return res.status(404).json({ error: 'No active crews available for dispatch' });
    }

    const userPrompt = `Optimize crew dispatch and route assignments for commercial cleaning operations on ${targetDate}.

Available Crews (${crews.length}):
${JSON.stringify(crews.map(c => ({
  id: c.id,
  name: c.name,
  team_lead: c.team_lead,
  members: c.member_count,
  specialization: c.specialization,
  rating: c.rating
})), null, 2)}

Open Work Orders (${workOrders.length}):
${JSON.stringify(workOrders.map(wo => ({
  id: wo.id,
  client: wo.client_name,
  type: wo.type,
  priority: wo.priority,
  scheduled_date: wo.scheduled_date,
  estimated_hours: wo.estimated_hours,
  location: wo.location || wo.address,
  current_crew: wo.assigned_crew
})), null, 2)}

Return a JSON object with:
- assignments (array of {work_order_id, recommended_crew_id, recommended_crew_name, rationale, estimated_start_time, estimated_finish_time})
- unassigned (array of work order ids that cannot be served today, with reasons)
- total_estimated_hours_per_crew (object keyed by crew name)
- travel_optimization_notes (array of strings)
- priority_conflicts (array describing critical jobs at risk)
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 3000);
    const plan = parseAIJson(result.content);

    res.json({
      target_date: targetDate,
      crew_count: crews.length,
      work_order_count: workOrders.length,
      ai_dispatch_plan: plan,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/compliance-advisor
// Body: { topic?, jurisdiction?, chemicals? }
// RAG-style policy/compliance Q&A grounded on existing Compliance records.
router.post('/compliance-advisor', auth, rateLimiter, async (req, res) => {
  try {
    const Compliance = require('../models/Compliance');
    const { topic, jurisdiction, chemicals } = req.body || {};
    if (!topic && !chemicals) {
      return res.status(400).json({ error: 'Provide a topic or chemicals list to evaluate' });
    }

    const records = await Compliance.findAll({ limit: 50, order: [['id', 'DESC']] }).catch(() => []);

    const userPrompt = `You are a commercial cleaning compliance advisor. Provide guidance grounded in OSHA, EPA, and local commercial-cleaning regulations.

Inquiry:
- Topic: ${topic || 'general chemical handling'}
- Jurisdiction: ${jurisdiction || 'United States (federal)'}
- Chemicals/Products of interest: ${JSON.stringify(chemicals || [])}

Existing Compliance Records on File (${records.length}):
${JSON.stringify(records.slice(0, 25).map(r => ({
  id: r.id,
  type: r.type || r.compliance_type,
  status: r.status,
  description: r.description || r.title,
  due_date: r.due_date,
  certification: r.certification_name
})), null, 2)}

Return a JSON object with:
- regulatory_summary (object: applicable_regs (array of {name, citation, url}), key_obligations (array of strings))
- gap_analysis (array of {existing_record_id_or_null, gap_description, severity: "critical"|"high"|"medium"|"low"})
- chemical_safety_notes (array of {chemical, ppe_required (array), storage, disposal, sds_required (boolean)})
- recommended_actions (array of {action, owner_role, deadline_days, priority})
- training_requirements (array of strings)
- citations (array of {regulation, section, plain_english_meaning})
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 3000);
    const advice = parseAIJson(result.content);

    res.json({
      topic: topic || null,
      jurisdiction: jurisdiction || null,
      chemicals: chemicals || [],
      compliance_records_referenced: records.length,
      ai_compliance_advice: advice,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/inspection-analysis
// Body: { inspection_id?, location_name?, days? }
// Text-based analysis of recent inspection records to flag missed cleaning areas, recurring failures.
router.post('/inspection-analysis', auth, rateLimiter, async (req, res) => {
  try {
    const { inspection_id, location_name, days = 60 } = req.body || {};
    const lookback = Math.min(365, Math.max(1, parseInt(days) || 60));

    let inspections = [];
    if (inspection_id) {
      const single = await QualityInspection.findByPk(inspection_id);
      if (!single) return res.status(404).json({ error: 'Inspection not found' });
      inspections = [single];
    } else {
      const since = new Date(Date.now() - lookback * 86400000);
      const where = { inspection_date: { [Op.gte]: since.toISOString().split('T')[0] } };
      if (location_name) where.location_name = location_name;
      inspections = await QualityInspection.findAll({
        where,
        order: [['inspection_date', 'DESC']],
        limit: 100
      });
    }

    if (inspections.length === 0) {
      return res.status(404).json({ error: 'No inspections found for the supplied filters' });
    }

    const failed = inspections.filter(i => i.status === 'failed' || i.status === 'needs_review');
    const avgScore = inspections.reduce((s, i) => s + (parseFloat(i.overall_score) || 0), 0) /
      (inspections.filter(i => i.overall_score).length || 1);

    const userPrompt = `Analyze quality inspection records for a commercial cleaning operation and identify missed areas, recurring failures, and corrective actions.

Filter Context:
- Inspection ID: ${inspection_id || 'n/a (range query)'}
- Location: ${location_name || 'all locations'}
- Lookback Days: ${lookback}

Aggregate Stats:
- Inspections Reviewed: ${inspections.length}
- Failed/Needs-Review: ${failed.length}
- Average Overall Score: ${avgScore.toFixed(2)}

Inspection Records (most recent ${Math.min(inspections.length, 25)}):
${JSON.stringify(inspections.slice(0, 25).map(i => ({
  id: i.id,
  location: i.location_name,
  inspector: i.inspector_name,
  date: i.inspection_date,
  score: i.overall_score,
  status: i.status,
  follow_up_required: i.follow_up_required,
  categories: i.categories,
  notes: i.notes,
  follow_up_notes: i.follow_up_notes
})), null, 2)}

Return a JSON object with:
- summary (object with: total_inspections, failed_count, avg_score, locations_covered)
- missed_areas (array of {area, frequency, severity: "critical"|"high"|"medium"|"low", first_seen, last_seen})
- recurring_failures (array of {category, count, locations: array, root_cause_hypothesis})
- worst_performing_locations (array of {location_name, avg_score, failure_rate, top_issues: array})
- worst_performing_categories (array of {category, avg_score, common_issues: array})
- corrective_actions (array of {action, owner_role, priority, expected_impact, due_in_days})
- training_needs (array of {topic, audience, urgency})
- escalation_alerts (array of {alert_type, location, reason})
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 3000);
    const analysis = parseAIJson(result.content);

    res.json({
      filter: {
        inspection_id: inspection_id || null,
        location_name: location_name || null,
        days: lookback
      },
      stats: {
        inspections_reviewed: inspections.length,
        failed_or_needs_review: failed.length,
        avg_overall_score: parseFloat(avgScore.toFixed(2))
      },
      ai_inspection_analysis: analysis,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/supply-forecast
// Body: { category?, horizon_days? }
// Forecasts replenishment needs from current stock + monthly_usage_avg + lead_time_days.
router.post('/supply-forecast', auth, rateLimiter, async (req, res) => {
  try {
    const { category, horizon_days = 30 } = req.body || {};
    const horizon = Math.min(180, Math.max(7, parseInt(horizon_days) || 30));

    const where = {};
    if (category) where.category = category;
    const supplies = await Supply.findAll({ where, order: [['name', 'ASC']], limit: 200 });

    if (supplies.length === 0) {
      return res.status(404).json({ error: 'No supplies found for the requested filter' });
    }

    const lowStock = supplies.filter(s => s.status === 'low_stock' || s.current_stock <= s.reorder_level);
    const outOfStock = supplies.filter(s => s.status === 'out_of_stock' || s.current_stock === 0);

    const userPrompt = `Forecast supply replenishment for a commercial cleaning operation over the next ${horizon} days.

Filter:
- Category: ${category || 'all categories'}
- Horizon (days): ${horizon}

Inventory Snapshot (${supplies.length} items):
- Low-stock items: ${lowStock.length}
- Out-of-stock items: ${outOfStock.length}

Supplies Detail:
${JSON.stringify(supplies.map(s => ({
  id: s.id,
  name: s.name,
  category: s.category,
  current_stock: s.current_stock,
  unit: s.unit,
  reorder_level: s.reorder_level,
  monthly_usage_avg: s.monthly_usage_avg,
  unit_cost: s.unit_cost,
  lead_time_days: s.lead_time_days,
  last_ordered: s.last_ordered,
  status: s.status,
  supplier: s.supplier
})), null, 2)}

Return a JSON object with:
- summary (object with: items_reviewed, immediate_reorder_count, projected_stockouts_in_horizon, total_estimated_spend_usd)
- reorder_now (array of {supply_id, name, current_stock, suggested_order_qty, estimated_cost_usd, supplier, rationale})
- reorder_within_week (array of {supply_id, name, days_until_reorder, suggested_order_qty})
- projected_stockouts (array of {supply_id, name, projected_stockout_date, days_of_cover})
- consolidated_purchase_orders (array of {supplier, items: array of {supply_id, name, qty, unit_cost}, total_cost_usd})
- usage_trend_notes (array of strings highlighting unusual spikes/drops)
- cost_optimization_opportunities (array of {opportunity, estimated_savings_usd_per_year})
- executive_summary (string)`;

    const result = await callOpenRouter(userPrompt, 3000);
    const forecast = parseAIJson(result.content);

    res.json({
      filter: { category: category || null, horizon_days: horizon },
      stats: {
        items_reviewed: supplies.length,
        low_stock: lowStock.length,
        out_of_stock: outOfStock.length
      },
      ai_supply_forecast: forecast,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
