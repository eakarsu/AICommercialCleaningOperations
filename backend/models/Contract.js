const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  property_type: {
    type: DataTypes.ENUM('office', 'retail', 'warehouse', 'medical', 'school', 'restaurant', 'industrial'),
    allowNull: false
  },
  square_footage: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  frequency: {
    type: DataTypes.ENUM('daily', '3x_week', '2x_week', 'weekly', 'biweekly', 'monthly'),
    allowNull: false
  },
  services: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  monthly_price: {
    type: DataTypes.DECIMAL(10, 2)
  },
  contract_start: {
    type: DataTypes.DATEONLY
  },
  contract_end: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'expired', 'cancelled', 'pending_renewal'),
    defaultValue: 'draft'
  },
  ai_pricing_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  special_requirements: {
    type: DataTypes.TEXT
  },
  contact_person: {
    type: DataTypes.STRING
  },
  contact_email: {
    type: DataTypes.STRING
  },
  contact_phone: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'contracts',
  timestamps: true
});

module.exports = Contract;
