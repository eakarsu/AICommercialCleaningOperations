const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contact_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.STRING
  },
  industry: {
    type: DataTypes.ENUM('healthcare', 'technology', 'finance', 'education', 'retail', 'hospitality', 'government', 'industrial', 'food_service', 'fitness'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'prospect', 'inactive', 'churned'),
    defaultValue: 'active'
  },
  monthly_revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  satisfaction_score: {
    type: DataTypes.DECIMAL(3, 1)
  },
  since: {
    type: DataTypes.DATEONLY
  },
  notes: {
    type: DataTypes.TEXT
  },
  properties_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  ai_retention_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'clients',
  timestamps: true
});

module.exports = Client;
