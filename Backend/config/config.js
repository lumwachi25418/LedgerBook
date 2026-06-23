require('dotenv').config();
const preferStablePostgresSockets = require('../lib/postgresNetwork');

preferStablePostgresSockets();

const dbUrl = process.env.DATABASE_URL;
const dialect = process.env.DB_DIALECT || 'postgres';
const shouldUseSsl = process.env.DB_SSL === 'true';
const ssl = shouldUseSsl
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

if (dbUrl && shouldUseSsl) {
  const parsedUrl = new URL(dbUrl);
  parsedUrl.searchParams.delete('sslmode');
  process.env.DATABASE_URL = parsedUrl.toString();
}

module.exports = {
  development: dbUrl ? {
    use_env_variable: 'DATABASE_URL',
    dialect,
    logging: false,
    dialectOptions: {
      ssl,
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
      ssl,
    },
  } : {
    dialect: (() => {
      throw new Error('DATABASE_URL is required in production');
    })(),
  },
};
