const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Organization = require('./Organization');

const Ledger = sequelize.define('Ledger', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  isFinalized: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { timestamps: true });

Ledger.belongsTo(User, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' });
User.hasMany(Ledger);

Ledger.belongsTo(Organization, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' });
Organization.hasMany(Ledger);

module.exports = Ledger;
