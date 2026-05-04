const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();
const preferStablePostgresSockets = require('./lib/postgresNetwork');

preferStablePostgresSockets();

const databaseUrl = process.env.DATABASE_URL;
const sqliteStorage = path.resolve(__dirname, process.env.DATABASE_STORAGE || 'ledgerbook.sqlite');

if (process.env.NODE_ENV === 'production' && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production');
}

let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
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
