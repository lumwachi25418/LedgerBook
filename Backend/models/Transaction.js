const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Ledger = require('./Ledger');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  description: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
}, { timestamps: true });

Transaction.belongsTo(Ledger, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' });
Ledger.hasMany(Transaction);

module.exports = Transaction;
