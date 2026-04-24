const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('vacuum', 'floor_scrubber', 'pressure_washer', 'carpet_cleaner', 'buffer', 'vehicle', 'hand_tool', 'safety'),
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING,
    unique: true
  },
  purchase_date: {
    type: DataTypes.DATEONLY
  },
  purchase_cost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  condition: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'needs_repair', 'decommissioned'),
    defaultValue: 'good'
  },
  assigned_to: {
    type: DataTypes.STRING
  },
  last_maintenance: {
    type: DataTypes.DATEONLY
  },
  next_maintenance: {
    type: DataTypes.DATEONLY
  },
  maintenance_interval_days: {
    type: DataTypes.INTEGER,
    defaultValue: 90
  },
  location: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('in_service', 'maintenance', 'storage', 'retired'),
    defaultValue: 'in_service'
  },
  hours_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT
  },
  ai_maintenance_prediction: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'equipment',
  timestamps: true
});

module.exports = Equipment;
