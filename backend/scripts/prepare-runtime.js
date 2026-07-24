'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function main() {
  const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '');
  if (!email || password.length < 12) throw new Error('Provisioning requires an admin email and a password of at least 12 characters');
  await sequelize.authenticate();
  await sequelize.sync();
  const hash = await bcrypt.hash(password, 12);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: { email, password: hash, name: 'Runtime Administrator', role: 'admin' }
  });
  if (!created) await user.update({ password: hash, name: 'Runtime Administrator', role: 'admin' });
  console.log('Runtime schema and administrator prepared');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
