const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeEntry = sequelize.define('TimeEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  crew_name: {
    type: DataTypes.STRING
  },
  client_name: {
    type: DataTypes.STRING
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  clock_in: {
    type: DataTypes.DATE,
    allowNull: false
  },
  clock_out: {
    type: DataTypes.DATE
  },
  break_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_hours: {
    type: DataTypes.DECIMAL(5, 2)
  },
  overtime_hours: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(6, 2)
  },
  total_pay: {
    type: DataTypes.DECIMAL(8, 2)
  },
  status: {
    type: DataTypes.ENUM('clocked_in', 'clocked_out', 'approved', 'rejected'),
    defaultValue: 'clocked_in'
  },
  notes: {
    type: DataTypes.TEXT
  },
  job_type: {
    type: DataTypes.ENUM('regular', 'deep_clean', 'emergency', 'inspection', 'training'),
    defaultValue: 'regular'
  },
  location: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'time_entries',
  timestamps: true
});

module.exports = TimeEntry;
