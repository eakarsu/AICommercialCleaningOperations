const express = require('express');
const { Op } = require('sequelize');
const Contract = require('../models/Contract');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

// Rate tables for contract pricing
const RATE_TABLES = {
  base_rate_per_sqft: {
    daily: 0.12,
    '3x_week': 0.10,
    '2x_week': 0.09,
    weekly: 0.07,
    biweekly: 0.05,
    monthly: 0.04
  },
  location_type_multiplier: {
    office: 1.0,
    retail: 1.05,
    warehouse: 0.85,
    medical: 1.45,
    school: 1.15,
    restaurant: 1.35,
    industrial: 0.90
  },
  service_type_adders: {
    deep_clean: 0.08,
    carpet_cleaning: 0.06,
    window_washing: 0.04,
    disinfection: 0.05,
    pressure_washing: 0.03,
    floor_waxing: 0.05,
    standard: 0.0
  },
  overhead_rate: 0.18,
  profit_margin: 0.22
};

function calculatePricing(contract) {
  const sqft = contract.square_footage || 0;
  const freq = contract.frequency || 'weekly';
  const propType = contract.property_type || 'office';
  const services = Array.isArray(contract.services) ? contract.services : [];

  const baseRatePerSqft = RATE_TABLES.base_rate_per_sqft[freq] || 0.07;
  const locationMultiplier = RATE_TABLES.location_type_multiplier[propType] || 1.0;

  // Service adders
  let serviceAdderPerSqft = 0;
  services.forEach(svc => {
    const key = (typeof svc === 'string' ? svc : svc.type || '').toLowerCase().replace(/ /g, '_');
    serviceAdderPerSqft += RATE_TABLES.service_type_adders[key] || 0;
  });

  const adjustedRatePerSqft = (baseRatePerSqft + serviceAdderPerSqft) * locationMultiplier;
  const grossLabor = sqft * adjustedRatePerSqft;

  const materials = grossLabor * 0.15;
  const overhead = (grossLabor + materials) * RATE_TABLES.overhead_rate;
  const subtotal = grossLabor + materials + overhead;
  const profit = subtotal * RATE_TABLES.profit_margin;
  const monthlyPrice = subtotal + profit;

  return {
    square_footage: sqft,
    frequency: freq,
    property_type: propType,
    base_rate_per_sqft: baseRatePerSqft,
    location_multiplier: locationMultiplier,
    adjusted_rate_per_sqft: parseFloat(adjustedRatePerSqft.toFixed(4)),
    breakdown: {
      labor: parseFloat(grossLabor.toFixed(2)),
      materials: parseFloat(materials.toFixed(2)),
      overhead: parseFloat(overhead.toFixed(2)),
      profit_margin: parseFloat(profit.toFixed(2))
    },
    monthly_total: parseFloat(monthlyPrice.toFixed(2)),
    annual_total: parseFloat((monthlyPrice * 12).toFixed(2)),
    services_included: services
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await Contract.findAndCountAll({
      order: [['createdAt', 'DESC']],
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
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { client_name, property_type, square_footage, frequency } = req.body;
    if (!client_name) return res.status(400).json({ error: 'client_name is required' });
    if (!property_type) return res.status(400).json({ error: 'property_type is required' });
    if (!square_footage) return res.status(400).json({ error: 'square_footage is required' });
    if (!frequency) return res.status(400).json({ error: 'frequency is required' });
    const contract = await Contract.create(req.body);
    res.status(201).json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    await contract.update(req.body);
    res.json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    await contract.destroy();
    res.json({ message: 'Contract deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /calculate-price: rate-table based pricing with itemized breakdown
router.post('/:id/calculate-price', auth, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const pricing = calculatePricing(contract);
    await contract.update({ ai_pricing_analysis: { ...pricing, calculated_at: new Date().toISOString(), method: 'rate_table' } });

    res.json({ contract, pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /ai-price: AI analyzes comparable contracts and suggests competitive pricing
router.post('/:id/ai-price', auth, rateLimiter, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    // Fetch comparable active contracts for context
    const comparables = await Contract.findAll({
      where: {
        property_type: contract.property_type,
        status: 'active',
        id: { [Op.ne]: contract.id }
      },
      attributes: ['square_footage', 'frequency', 'monthly_price', 'services', 'property_type'],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    const rateTablePricing = calculatePricing(contract);

    const aiResult = await aiService.calculateContractPrice({
      client: contract.client_name,
      property_type: contract.property_type,
      square_footage: contract.square_footage,
      frequency: contract.frequency,
      services: contract.services,
      special_requirements: contract.special_requirements,
      rate_table_estimate: rateTablePricing,
      comparable_contracts: comparables.map(c => ({
        square_footage: c.square_footage,
        frequency: c.frequency,
        monthly_price: c.monthly_price,
        services: c.services
      }))
    });

    const fullAnalysis = {
      rate_table_pricing: rateTablePricing,
      ai_pricing: aiResult,
      comparable_contracts_used: comparables.length,
      analyzed_at: new Date().toISOString()
    };

    await contract.update({ ai_pricing_analysis: fullAnalysis });
    res.json({ contract, ai_analysis: fullAnalysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
