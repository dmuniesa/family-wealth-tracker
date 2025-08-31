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
  
  const runAsync = promisify(sqlite.run.bind(sqlite)) as (sql: string, params?: unknown[]) => Promise<void>;
  const getAsync = promisify(sqlite.get.bind(sqlite)) as (sql: string, params?: unknown[]) => Promise<unknown>;
  const allAsync = promisify(sqlite.all.bind(sqlite)) as (sql: string, params?: unknown[]) => Promise<unknown[]>;
  const closeAsync = promisify(sqlite.close.bind(sqlite)) as () => Promise<void>;

  db = {
    run: async (sql: string, params?: unknown[]) => {
      await runAsync(sql, params);
      return { lastID: (sqlite as any).lastID, changes: (sqlite as any).changes };
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
      role TEXT CHECK(role IN ('administrator', 'user', 'guest')) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('Banking', 'Investment', 'Debt')) NOT NULL,
      currency TEXT NOT NULL,
      iban_encrypted TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES users(family_id)
    )
  `;

  // Check if accounts table exists and update constraint if needed
  try {
    const tableInfo = await db.get(`
      SELECT sql FROM sqlite_master 
      WHERE type = 'table' AND name = 'accounts'
    `) as any;
    
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'Debt'")) {
      // Need to update the constraint - SQLite doesn't support ALTER TABLE for CHECK constraints
      // So we need to recreate the table
      await db.run('BEGIN TRANSACTION');
      
      // Create new table with updated constraint
      await db.run(`
        CREATE TABLE accounts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          family_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          category TEXT CHECK(category IN ('Banking', 'Investment', 'Debt')) NOT NULL,
          currency TEXT NOT NULL,
          iban_encrypted TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (family_id) REFERENCES users(family_id)
        )
      `);
      
      // Copy data from old table
      await db.run(`
        INSERT INTO accounts_new 
        SELECT * FROM accounts
      `);
      
      // Drop old table and rename new one
      await db.run('DROP TABLE accounts');
      await db.run('ALTER TABLE accounts_new RENAME TO accounts');
      
      await db.run('COMMIT');
    }
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error migrating accounts table:', error);
  }

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
  
  // Migrate existing users table to add role column
  await migrateUsersTableForRoles(db);
  
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
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `);
}

async function migrateUsersTableForRoles(db: Database) {
  try {
    // Check if role column exists
    const tableInfo = await db.all(`
      PRAGMA table_info(users)
    `) as any[];
    
    const hasRoleColumn = tableInfo.some(column => column.name === 'role');
    
    if (!hasRoleColumn) {
      console.log('Adding role column to users table...');
      
      await db.run('BEGIN TRANSACTION');
      
      // Add role column with default value
      await db.run(`
        ALTER TABLE users ADD COLUMN role TEXT CHECK(role IN ('administrator', 'user', 'guest')) DEFAULT 'user'
      `);
      
      // Set all existing users as administrators
      await db.run(`
        UPDATE users SET role = 'administrator' WHERE role IS NULL OR role = 'user'
      `);
      
      await db.run('COMMIT');
      console.log('Successfully migrated users table with role column');
    }
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error migrating users table for roles:', error);
    throw error;
  }
}