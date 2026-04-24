const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Crew = sequelize.define('Crew', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  team_lead: {
    type: DataTypes.STRING,
    allowNull: false
  },
  members: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  specializations: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'on_leave', 'training', 'inactive'),
    defaultValue: 'active'
  },
  shift: {
    type: DataTypes.ENUM('morning', 'afternoon', 'evening', 'night', 'flexible'),
    defaultValue: 'morning'
  },
  region: {
    type: DataTypes.STRING
  },
  performance_score: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 0
  },
  total_jobs_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(6, 2)
  },
  certifications: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  phone: {
    type: DataTypes.STRING
  },
  ai_performance_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'crews',
  timestamps: true
});

module.exports = Crew;
