const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.get('/demo-credentials', (req, res) => {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'false'
  ) {
    return res.status(404).json({ error: 'Demo credentials are unavailable' });
  }

  const email = process.env.DEMO_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const password = process.env.DEMO_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    return res.status(404).json({ error: 'Demo credentials are unavailable' });
  }

  res.set('Cache-Control', 'no-store');
  return res.json({ email, password });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
