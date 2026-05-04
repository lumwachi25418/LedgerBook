const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Organization = require('./Organization');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  file: {
    type: DataTypes.TEXT, // base64 or path
    allowNull: false,
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

Report.belongsTo(Organization, { foreignKey: 'organizationId', onDelete: 'CASCADE' });
Organization.hasMany(Report, { foreignKey: 'organizationId' });

module.exports = Report;
