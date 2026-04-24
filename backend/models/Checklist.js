const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Checklist = sequelize.define('Checklist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  property_type: {
    type: DataTypes.ENUM('office', 'medical', 'retail', 'warehouse', 'school', 'restaurant', 'gym', 'general'),
    defaultValue: 'general'
  },
  service_type: {
    type: DataTypes.ENUM('regular', 'deep_clean', 'floor_care', 'restroom', 'kitchen', 'post_construction'),
    defaultValue: 'regular'
  },
  items: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  assigned_crew: {
    type: DataTypes.STRING
  },
  assigned_client: {
    type: DataTypes.STRING
  },
  due_date: {
    type: DataTypes.DATEONLY
  },
  completed_date: {
    type: DataTypes.DATEONLY
  },
  status: {
    type: DataTypes.ENUM('template', 'assigned', 'in_progress', 'completed', 'overdue'),
    defaultValue: 'template'
  },
  completion_percentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT
  },
  created_by: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'checklists',
  timestamps: true
});

module.exports = Checklist;
