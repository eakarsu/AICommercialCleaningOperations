const express = require('express');
const https = require('https');
const Route = require('../models/Route');
const WorkOrder = require('../models/WorkOrder');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await Route.findAndCountAll({
      order: [['date', 'DESC']],
      limit,
      offset
    });
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, crew_name, date } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!crew_name) return res.status(400).json({ error: 'crew_name is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    await route.update(req.body);
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    await route.destroy();
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Original optimize endpoint (uses route.stops from DB)
router.post('/:id/optimize', auth, rateLimiter, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const aiResult = await aiService.optimizeRoute({
      name: route.name,
      crew: route.crew_name,
      stops: route.stops,
      total_stops: route.total_stops,
      region: route.region,
      estimated_duration: route.estimated_duration_hours
    });

    await route.update({ ai_suggestions: aiResult });
    res.json({ route, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI optimize: fetch actual work orders, pass addresses + time windows to AI
router.post('/:id/ai-optimize', auth, rateLimiter, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    // Fetch actual work orders assigned to this route's crew on the route date
    const workOrders = await WorkOrder.findAll({
      where: {
        assigned_crew: route.crew_name,
        scheduled_date: route.date,
        status: ['open', 'assigned', 'in_progress']
      },
      order: [['priority', 'DESC'], ['scheduled_date', 'ASC']]
    });

    // Build stops with addresses and time windows from work orders + route.stops
    const routeStops = Array.isArray(route.stops) && route.stops.length > 0 ? route.stops : [];
    const woStops = workOrders.map((wo, idx) => ({
      stop_index: idx + 1,
      work_order_id: wo.id,
      client: wo.client_name,
      address: wo.location,
      type: wo.type,
      priority: wo.priority,
      estimated_hours: parseFloat(wo.estimated_hours) || 2,
      time_window_start: '08:00',
      time_window_end: '18:00',
      description: wo.description
    }));

    // Merge DB stops with work order stops for comprehensive picture
    const allStops = woStops.length > 0 ? woStops : routeStops;

    const systemPrompt = 'You are an expert commercial cleaning operations manager. Provide actionable recommendations for route optimization, crew performance, supply management, and client retention.';
    const userPrompt = `Optimize this cleaning route for maximum efficiency. Consider addresses for geographic clustering, time windows, priority, and estimated duration.
Return a JSON object with:
- optimized_sequence (array of stop indices in optimal order, 1-indexed)
- stop_details (array of {stop_index, client, address, arrival_time, departure_time, priority_score, notes})
- estimated_time_savings_minutes (number)
- fuel_savings_percent (number)
- total_estimated_duration_hours (number)
- recommendations (array of strings)
- efficiency_score (1-100)
- geographic_clusters (array of cluster groups)

Route Info:
- Route Name: ${route.name}
- Crew: ${route.crew_name}
- Date: ${route.date}
- Region: ${route.region || 'N/A'}

Stops (${allStops.length} total):
${JSON.stringify(allStops, null, 2)}`;

    const optimizationResult = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2500
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
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve({ content: parsed.choices?.[0]?.message?.content || '', model: parsed.model });
          } catch (e) {
            reject(new Error('Failed to parse OpenRouter response'));
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    let parsedOptimization = null;
    try {
      const cleaned = optimizationResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedOptimization = JSON.parse(jsonMatch[0]);
    } catch (_) {
      parsedOptimization = { raw_response: optimizationResult.content };
    }

    const fullAnalysis = {
      ...parsedOptimization,
      work_orders_fetched: workOrders.length,
      model: optimizationResult.model,
      optimized_at: new Date().toISOString()
    };

    await route.update({ ai_suggestions: fullAnalysis });
    res.json({
      route,
      work_orders: workOrders,
      stops_used: allStops,
      ai_optimization: fullAnalysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
