const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  crew_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  recurrence: {
    type: DataTypes.ENUM('none', 'daily', 'weekly', 'biweekly', 'monthly'),
    defaultValue: 'none'
  },
  service_type: {
    type: DataTypes.ENUM('regular', 'deep_clean', 'floor_care', 'window', 'carpet', 'post_construction', 'move_in_out'),
    defaultValue: 'regular'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'),
    defaultValue: 'scheduled'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(4, 1)
  },
  notes: {
    type: DataTypes.TEXT
  },
  contact_name: {
    type: DataTypes.STRING
  },
  contact_phone: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'schedules',
  timestamps: true
});

module.exports = Schedule;
