const sequelize = require('../config/database');
const User = require('./User');
const Route = require('./Route');
const Supply = require('./Supply');
const QualityInspection = require('./QualityInspection');
const Contract = require('./Contract');
const Compliance = require('./Compliance');
const Crew = require('./Crew');
const Client = require('./Client');
const WorkOrder = require('./WorkOrder');
const Equipment = require('./Equipment');
const Invoice = require('./Invoice');
const Incident = require('./Incident');
const Schedule = require('./Schedule');
const TimeEntry = require('./TimeEntry');
const Expense = require('./Expense');
const Checklist = require('./Checklist');

module.exports = {
  sequelize,
  User,
  Route,
  Supply,
  QualityInspection,
  Contract,
  Compliance,
  Crew,
  Client,
  WorkOrder,
  Equipment,
  Invoice,
  Incident,
  Schedule,
  TimeEntry,
  Expense,
  Checklist
};
