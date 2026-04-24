const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supply = sequelize.define('Supply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('chemicals', 'equipment', 'disposables', 'safety', 'tools'),
    allowNull: false
  },
  current_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reorder_level: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  unit_cost: {
    type: DataTypes.DECIMAL(10, 2)
  },
  supplier: {
    type: DataTypes.STRING
  },
  monthly_usage_avg: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_ordered: {
    type: DataTypes.DATEONLY
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    defaultValue: 7
  },
  forecast_data: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock', 'on_order'),
    defaultValue: 'in_stock'
  }
}, {
  tableName: 'supplies',
  timestamps: true
});

module.exports = Supply;
