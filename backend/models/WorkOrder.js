const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkOrder = sequelize.define('WorkOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assigned_crew: {
    type: DataTypes.STRING
  },
  type: {
    type: DataTypes.ENUM('regular', 'deep_clean', 'emergency', 'post_construction', 'move_in_out', 'special_event'),
    defaultValue: 'regular'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'),
    defaultValue: 'open'
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  completed_date: {
    type: DataTypes.DATEONLY
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(5, 2)
  },
  actual_hours: {
    type: DataTypes.DECIMAL(5, 2)
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  description: {
    type: DataTypes.TEXT
  },
  checklist: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  ai_scheduling_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'work_orders',
  timestamps: true
});

module.exports = WorkOrder;
