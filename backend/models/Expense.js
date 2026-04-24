const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('Expense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('supplies', 'equipment', 'fuel', 'vehicle_maintenance', 'insurance', 'uniforms', 'training', 'office', 'marketing', 'misc'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  vendor: {
    type: DataTypes.STRING
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'check', 'bank_transfer'),
    defaultValue: 'credit_card'
  },
  receipt_number: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'reimbursed'),
    defaultValue: 'pending'
  },
  submitted_by: {
    type: DataTypes.STRING,
    allowNull: false
  },
  approved_by: {
    type: DataTypes.STRING
  },
  crew_name: {
    type: DataTypes.STRING
  },
  client_name: {
    type: DataTypes.STRING
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrence_frequency: {
    type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'annual')
  },
  notes: {
    type: DataTypes.TEXT
  },
  tax_deductible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'expenses',
  timestamps: true
});

module.exports = Expense;
