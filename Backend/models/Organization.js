const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Organization = sequelize.define('organization', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
}, { timestamps: true });

module.exports = Organization;
