const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  line_items: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 8.5
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial'),
    defaultValue: 'draft'
  },
  payment_method: {
    type: DataTypes.STRING
  },
  paid_date: {
    type: DataTypes.DATEONLY
  },
  notes: {
    type: DataTypes.TEXT
  },
  ai_billing_insights: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'invoices',
  timestamps: true
});

module.exports = Invoice;
