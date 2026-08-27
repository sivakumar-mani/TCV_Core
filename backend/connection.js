const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: true,
});

const requiredEnvironmentVariables = ['DB_HOST', 'DB_USERNAME', 'DB_NAME'];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter((name) => !process.env[name]);

if (missingEnvironmentVariables.length) {
  throw new Error(`Missing database environment variables: ${missingEnvironmentVariables.join(', ')}`);
}

const configuredPort = Number(process.env.DB_PORT || 3306);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
  throw new Error('DB_PORT must be a valid TCP port number');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: configuredPort,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  maxIdle: Number(process.env.DB_MAX_IDLE || 10),
  idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS || 60000),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_DELAY_MS || 10000),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
});

// Keep the existing connection.promise() contract. Once beginTransaction is
// called, this facade pins every query to one pooled connection until the
// transaction is committed or rolled back and the connection is released.
const createPromiseFacade = () => {
  const promisePool = pool.promise();
  let transactionConnection = null;

  const activeDatabase = () => transactionConnection || promisePool;
  const releaseTransactionConnection = () => {
    if (transactionConnection) {
      transactionConnection.release();
      transactionConnection = null;
    }
  };

  return {
    query(...args) {
      return activeDatabase().query(...args);
    },
    execute(...args) {
      return activeDatabase().execute(...args);
    },
    async beginTransaction() {
      if (transactionConnection) throw new Error('A transaction is already active on this database context');
      transactionConnection = await promisePool.getConnection();
      try {
        await transactionConnection.beginTransaction();
      } catch (error) {
        releaseTransactionConnection();
        throw error;
      }
    },
    async commit() {
      if (!transactionConnection) throw new Error('No active transaction to commit');
      try {
        await transactionConnection.commit();
      } finally {
        releaseTransactionConnection();
      }
    },
    async rollback() {
      if (!transactionConnection) return;
      try {
        await transactionConnection.rollback();
      } finally {
        releaseTransactionConnection();
      }
    },
    getConnection() {
      return promisePool.getConnection();
    },
  };
};

const connection = {
  query: pool.query.bind(pool),
  execute: pool.execute.bind(pool),
  getConnection: pool.getConnection.bind(pool),
  end: pool.end.bind(pool),
  promise: createPromiseFacade,
};

pool.query('SELECT 1', (error) => {
  if (error) {
    console.error('MySQL pool initialization failed:', error.message);
    return;
  }
  console.log('MySQL pool connected successfully');
});

module.exports = connection;
