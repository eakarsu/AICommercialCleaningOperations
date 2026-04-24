const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QualityInspection = sequelize.define('QualityInspection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  location_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inspector_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inspection_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  overall_score: {
    type: DataTypes.DECIMAL(3, 1),
    validate: { min: 0, max: 10 }
  },
  categories: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  photo_urls: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  ai_photo_analysis: {
    type: DataTypes.JSONB,
    defaultValue: null
  },
  notes: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('pending', 'passed', 'failed', 'needs_review'),
    defaultValue: 'pending'
  },
  follow_up_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  follow_up_notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'quality_inspections',
  timestamps: true
});

module.exports = QualityInspection;
