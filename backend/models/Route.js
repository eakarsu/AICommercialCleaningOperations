const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  crew_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  total_stops: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estimated_duration_hours: {
    type: DataTypes.DECIMAL(5, 2)
  },
  total_distance_miles: {
    type: DataTypes.DECIMAL(8, 2)
  },
  stops: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  optimized_order: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  ai_suggestions: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  region: {
    type: DataTypes.STRING
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  }
}, {
  tableName: 'routes',
  timestamps: true
});

module.exports = Route;
