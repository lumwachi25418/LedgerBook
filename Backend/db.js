const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
const sqliteStorage = path.resolve(__dirname, process.env.DATABASE_STORAGE || 'ledgerbook.sqlite');

let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: true,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStorage,
    logging: false,
  });
}

module.exports = sequelize;
