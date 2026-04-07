const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
const dialect = 'postgres'; // default to postgres, can be overridden by env variable

let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect:'postgres',
    logging: true,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage:process.env.DATABASE_STORAGE || 'Ledgerbook.sqlite',
    logging: false,
  });
}

module.exports = sequelize;
