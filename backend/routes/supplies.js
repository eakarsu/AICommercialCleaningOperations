const express = require('express');
const { Op } = require('sequelize');
const Supply = require('../models/Supply');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await Supply.findAndCountAll({
      order: [['name', 'ASC']],
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
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    res.json(supply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, unit } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!category) return res.status(400).json({ error: 'category is required' });
    if (!unit) return res.status(400).json({ error: 'unit is required' });
    const supply = await Supply.create(req.body);
    res.status(201).json(supply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    await supply.update(req.body);
    res.json(supply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    await supply.destroy();
    res.json({ message: 'Supply deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Individual forecast for a single supply item
router.post('/:id/forecast', auth, rateLimiter, async (req, res) => {
  try {
    const supply = await Supply.findByPk(req.params.id);
    if (!supply) return res.status(404).json({ error: 'Supply not found' });

    const aiResult = await aiService.forecastSupply({
      name: supply.name,
      category: supply.category,
      current_stock: supply.current_stock,
      unit: supply.unit,
      monthly_usage_avg: supply.monthly_usage_avg,
      reorder_level: supply.reorder_level,
      unit_cost: supply.unit_cost,
      lead_time_days: supply.lead_time_days
    });

    await supply.update({ forecast_data: aiResult });
    res.json({ supply, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregated 30-day forecast across all products
router.post('/ai-forecast', auth, rateLimiter, async (req, res) => {
  try {
    // Aggregate all supplies with their 30-day historical usage data
    const allSupplies = await Supply.findAll({ order: [['category', 'ASC'], ['name', 'ASC']] });

    // Build per-product aggregated usage data
    const productData = allSupplies.map(s => {
      const dailyUsageAvg = (s.monthly_usage_avg || 0) / 30;
      const daysUntilStockout = dailyUsageAvg > 0
        ? Math.floor((s.current_stock || 0) / dailyUsageAvg)
        : null;
      const reorderDate = daysUntilStockout !== null
        ? new Date(Date.now() + Math.max(0, (daysUntilStockout - (s.lead_time_days || 7))) * 86400000).toISOString().split('T')[0]
        : null;

      return {
        product_id: s.id,
        name: s.name,
        category: s.category,
        current_stock: s.current_stock,
        unit: s.unit,
        reorder_level: s.reorder_level,
        monthly_usage_avg: s.monthly_usage_avg,
        daily_usage_avg: parseFloat(dailyUsageAvg.toFixed(2)),
        unit_cost: s.unit_cost,
        lead_time_days: s.lead_time_days,
        supplier: s.supplier,
        status: s.status,
        days_until_stockout: daysUntilStockout,
        estimated_reorder_date: reorderDate
      };
    });

    // Calculate totals by category for AI context
    const byCategory = {};
    productData.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = { count: 0, total_monthly_cost: 0, low_stock_count: 0 };
      byCategory[p.category].count += 1;
      byCategory[p.category].total_monthly_cost += parseFloat(p.unit_cost || 0) * (p.monthly_usage_avg || 0);
      if (p.status === 'low_stock' || p.status === 'out_of_stock') byCategory[p.category].low_stock_count += 1;
    });

    // Critical items needing reorder within 14 days
    const criticalItems = productData.filter(p => p.days_until_stockout !== null && p.days_until_stockout <= 14);

    const systemPrompt = 'You are an expert commercial cleaning operations manager. Provide actionable recommendations for route optimization, crew performance, supply management, and client retention.';
    const userPrompt = `Analyze this 30-day supply forecast data for our commercial cleaning operation. Return a JSON object with:
- overall_assessment (string)
- per_product_forecast (array of objects: {product_id, name, reorder_date, quantity_to_order, preferred_supplier, urgency: critical|high|medium|low, notes})
- category_summary (object with category totals)
- total_reorder_cost_estimate (number)
- priority_actions (array of strings)
- eco_friendly_alternatives (array of {product, alternative, benefit})

Supply Data:
${JSON.stringify({ products: productData, by_category: byCategory, critical_items: criticalItems }, null, 2)}`;

    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000
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

    let parsedForecast = null;
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedForecast = JSON.parse(jsonMatch[0]);
    } catch (_) {
      parsedForecast = { raw_response: result.content };
    }

    res.json({
      product_count: allSupplies.length,
      critical_items_count: criticalItems.length,
      aggregated_data: { by_category: byCategory, critical_items: criticalItems },
      ai_forecast: parsedForecast,
      model: result.model,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
