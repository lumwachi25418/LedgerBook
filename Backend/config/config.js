require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
const dialect = process.env.DB_DIALECT || 'postgres';

module.exports = {
  development: dbUrl ? {
    use_env_variable: 'DATABASE_URL',
    dialect,
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  } : {
    dialect: 'sqlite',
    storage: process.env.DATABASE_STORAGE || 'ledgerbook.sqlite',
    logging: false,
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  production: dbUrl ? {
    use_env_variable: 'DATABASE_URL',
    dialect,
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  } : {
    dialect: 'sqlite',
    storage: process.env.DATABASE_STORAGE || 'ledgerbook.sqlite',
    logging: false,
  },
};
