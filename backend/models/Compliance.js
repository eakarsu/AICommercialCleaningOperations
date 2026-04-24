const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Compliance = sequelize.define('Compliance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('osha', 'epa', 'state', 'insurance', 'training', 'license'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  completed_date: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('compliant', 'non_compliant', 'pending', 'expired', 'due_soon'),
    defaultValue: 'pending'
  },
  assigned_to: {
    type: DataTypes.STRING
  },
  documentation_url: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  },
  renewal_frequency: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'one_time'),
    defaultValue: 'annual'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  ai_recommendations: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'compliance_records',
  timestamps: true
});

module.exports = Compliance;
