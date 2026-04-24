const express = require('express');
const Contract = require('../models/Contract');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const contracts = await Contract.findAll({ order: [['createdAt', 'DESC']] });
    res.json(contracts);
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

router.post('/:id/calculate-price', auth, async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const aiResult = await aiService.calculateContractPrice({
      client: contract.client_name,
      property_type: contract.property_type,
      square_footage: contract.square_footage,
      frequency: contract.frequency,
      services: contract.services,
      special_requirements: contract.special_requirements
    });

    await contract.update({ ai_pricing_analysis: aiResult });
    res.json({ contract, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
