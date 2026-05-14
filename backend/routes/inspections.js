const express = require('express');
const multer = require('multer');
const https = require('https');
const QualityInspection = require('../models/QualityInspection');
const aiService = require('../services/aiService');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const router = express.Router();

// Multer: memory storage, images only, 10MB max
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

function callOpenRouterVision(base64Data, mediaType, inspection) {
  return new Promise((resolve, reject) => {
    const SYSTEM_PROMPT = 'You are an expert commercial cleaning operations manager. Provide actionable recommendations for route optimization, crew performance, supply management, and client retention.';
    const userContent = [
      {
        type: 'text',
        text: `Analyze this quality inspection photo for a commercial cleaning job at ${inspection.location_name || 'the facility'}. Inspector: ${inspection.inspector_name || 'N/A'}, Date: ${inspection.inspection_date || 'N/A'}, Current Score: ${inspection.overall_score || 'N/A'}. Provide a JSON response with: cleanliness_score (1-10), areas_of_concern (array), improvements_needed (array), compliance_status (string), detailed_findings (array of {area, score, notes}), overall_assessment (string), priority_actions (array).`
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data
        }
      }
    ];

    const payload = JSON.stringify({
      model: 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      max_tokens: 2000
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
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve({ content, model: parsed.model, usage: parsed.usage });
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await QualityInspection.findAndCountAll({
      order: [['inspection_date', 'DESC']],
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
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { location_name, inspector_name, inspection_date, overall_score } = req.body;
    if (!location_name) return res.status(400).json({ error: 'location_name is required' });
    if (!inspector_name) return res.status(400).json({ error: 'inspector_name is required' });
    if (!inspection_date) return res.status(400).json({ error: 'inspection_date is required' });
    const inspection = await QualityInspection.create(req.body);
    res.status(201).json(inspection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    await inspection.update(req.body);
    res.json(inspection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
    await inspection.destroy();
    res.json({ message: 'Inspection deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Original text-based analysis
router.post('/:id/analyze', auth, rateLimiter, async (req, res) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const aiResult = await aiService.analyzeQualityPhoto({
      location: inspection.location_name,
      inspector: inspection.inspector_name,
      date: inspection.inspection_date,
      categories: inspection.categories,
      current_score: inspection.overall_score,
      notes: inspection.notes
    });

    await inspection.update({ ai_photo_analysis: aiResult });
    res.json({ inspection, ai_analysis: aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Photo upload + vision AI analysis
router.post('/:id/photo-analysis', auth, rateLimiter, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded. Use multipart/form-data with field name "photo".' });

    const inspection = await QualityInspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ error: 'Inspection not found' });

    const base64Data = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    const visionResult = await callOpenRouterVision(base64Data, mediaType, inspection);

    // Try to parse JSON from AI response
    let parsedAnalysis = null;
    try {
      const cleaned = visionResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedAnalysis = JSON.parse(jsonMatch[0]);
    } catch (_) {
      parsedAnalysis = { raw_response: visionResult.content };
    }

    const analysisPayload = {
      photo_analysis: parsedAnalysis,
      model: visionResult.model,
      usage: visionResult.usage,
      analyzed_at: new Date().toISOString()
    };

    await inspection.update({ ai_photo_analysis: analysisPayload });
    res.json({ inspection, photo_analysis: analysisPayload });
  } catch (err) {
    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
