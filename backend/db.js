// pg-style Pool shim for legacy routes that do `require('../db')`.
// Coexists with Sequelize at ./config/database.js.
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cleaning_ops',
  max: 5
});

pool.on('error', (err) => {
  console.error('pg pool error (non-fatal):', err.message);
});

module.exports = pool;
