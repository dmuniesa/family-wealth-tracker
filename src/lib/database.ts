import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

interface Database {
  run: (sql: string, params?: unknown[]) => Promise<{ lastID: number; changes: number }>;
  get: (sql: string, params?: unknown[]) => Promise<unknown>;
  all: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
}

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'data', 'wealth_tracker.db');
  
  const sqlite = new sqlite3.Database(dbPath);
  
  const runAsync = promisify(sqlite.run.bind(sqlite));
  const getAsync = promisify(sqlite.get.bind(sqlite));
  const allAsync = promisify(sqlite.all.bind(sqlite));
  const closeAsync = promisify(sqlite.close.bind(sqlite));

  db = {
    run: async (sql: string, params?: unknown[]) => {
      await runAsync(sql, params);
      return { lastID: sqlite.lastID, changes: sqlite.changes };
    },
    get: getAsync,
    all: allAsync,
    close: closeAsync,
  };

  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(db: Database) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      family_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('Banking', 'Investment')) NOT NULL,
      currency TEXT NOT NULL,
      iban_encrypted TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES users(family_id)
    )
  `;

  const createBalancesTable = `
    CREATE TABLE IF NOT EXISTS balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `;

  await db.run(createUsersTable);
  await db.run(createAccountsTable);
  await db.run(createBalancesTable);

  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)
  `);
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_accounts_family_id ON accounts(family_id)
  `);
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_balances_account_id ON balances(account_id)
  `);
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_balances_date ON balances(date)
  `);
}