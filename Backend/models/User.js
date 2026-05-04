const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Organization = require('./Organization');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: true });

User.belongsTo(Organization, { foreignKey: {
  name: 'organizationId',
  allowNull: true }, onDelete: 'CASCADE' });
Organization.hasMany(User, { foreignKey: 'organizationId' });

module.exports = User;
