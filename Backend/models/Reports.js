const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Report = sequelize.define('Report', {
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
});

module.exports = Report;