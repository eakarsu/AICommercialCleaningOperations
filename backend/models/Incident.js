const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('injury', 'property_damage', 'chemical_spill', 'equipment_failure', 'client_complaint', 'safety_violation', 'theft', 'other'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('minor', 'moderate', 'major', 'critical'),
    defaultValue: 'minor'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reported_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  incident_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  actions_taken: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('reported', 'investigating', 'resolved', 'closed', 'escalated'),
    defaultValue: 'reported'
  },
  witnesses: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  cost_impact: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  insurance_claim: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  follow_up_date: {
    type: DataTypes.DATEONLY
  },
  resolution_notes: {
    type: DataTypes.TEXT
  },
  ai_risk_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'incidents',
  timestamps: true
});

module.exports = Incident;
