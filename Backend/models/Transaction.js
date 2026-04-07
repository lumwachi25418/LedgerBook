const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Ledger = require('./Ledger');

const Transaction = sequelize.define("Transaction", {
  description:      { type: DataTypes.STRING },
  amount:           { type: DataTypes.FLOAT },
  date:             { type: DataTypes.STRING },
  payment_method:   { type: DataTypes.STRING, defaultValue: "cash" },
  category:         { type: DataTypes.STRING, defaultValue: "" },
  transaction_type: { type: DataTypes.STRING, defaultValue: "" },
});

Transaction.belongsTo(Ledger, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' });
Ledger.hasMany(Transaction);

module.exports = Transaction;
