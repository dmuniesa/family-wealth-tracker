/**
 * In-memory SQLite test database module.
 * Creates a fresh DB with all tables on each call — no side effects on production data.
 *
 * Usage:
 *   const { db, cleanup } = await createTestDb()
 *   // ... run queries against db ...
 *   await cleanup()
 */

const sqlite3 = require('sqlite3');
const { promisify } = require('util');

function createTestDb() {
  return new Promise((resolve, reject) => {
    // :memory: DB — disappears when connection closes
    const raw = new sqlite3.Database(':memory:', async (err) => {
      if (err) return reject(err);

      const run = (sql, params = []) =>
        new Promise((res, rej) => {
          raw.run(sql, params, function (e) {
            if (e) rej(e);
            else res({ lastID: this.lastID, changes: this.changes });
          });
        });

      const get = (sql, params = []) =>
        new Promise((res, rej) => {
          raw.get(sql, params, (e, row) => (e ? rej(e) : res(row)));
        });

      const all = (sql, params = []) =>
        new Promise((res, rej) => {
          raw.all(sql, params, (e, rows) => (e ? rej(e) : res(rows)));
        });

      const close = () =>
        new Promise((res, rej) => {
          raw.close((e) => (e ? rej(e) : res()));
        });

      const db = { run, get, all, close };

      try {
        await initSchema(db);
        resolve({ db, cleanup: close });
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function initSchema(db) {
  // Users
  await db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      family_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('administrator','user','guest')) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Accounts
  await db.run(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('Banking','Investment','Debt')) NOT NULL,
      currency TEXT NOT NULL,
      iban_encrypted TEXT NOT NULL DEFAULT '',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Balances
  await db.run(`
    CREATE TABLE balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transaction categories
  await db.run(`
    CREATE TABLE transaction_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income','expense','both','non_computable')) DEFAULT 'expense',
      icon TEXT DEFAULT NULL,
      color TEXT DEFAULT NULL,
      ai_description TEXT DEFAULT NULL,
      is_system BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(family_id, name)
    )
  `);

  // Transactions
  await db.run(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      family_id INTEGER NOT NULL,
      category_id INTEGER DEFAULT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      date DATE NOT NULL,
      value_date DATE DEFAULT NULL,
      description TEXT NOT NULL,
      detail TEXT DEFAULT NULL,
      observations TEXT DEFAULT NULL,
      movement_type TEXT DEFAULT NULL,
      balance_after DECIMAL(15,2) DEFAULT NULL,
      is_transfer BOOLEAN DEFAULT FALSE,
      import_batch_id TEXT DEFAULT NULL,
      source TEXT DEFAULT NULL,
      source_hash TEXT NOT NULL,
      ai_confidence REAL DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(account_id, source_hash)
    )
  `);

  // Transfer rules
  await db.run(`
    CREATE TABLE transfer_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      rule_type TEXT CHECK(rule_type IN ('contains_text','sender_is','description_matches')) NOT NULL,
      pattern TEXT NOT NULL,
      field TEXT CHECK(field IN ('description','detail','observations','any')) NOT NULL DEFAULT 'any',
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Family settings
  await db.run(`
    CREATE TABLE family_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL UNIQUE,
      ai_api_key_encrypted TEXT DEFAULT NULL,
      ai_base_url TEXT DEFAULT 'https://api.openai.com/v1',
      ai_model TEXT DEFAULT 'gpt-4o-mini',
      ai_last_test TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  await db.run(`CREATE INDEX idx_transactions_account_id ON transactions(account_id)`);
  await db.run(`CREATE INDEX idx_transactions_family_id ON transactions(family_id)`);
  await db.run(`CREATE INDEX idx_transactions_date ON transactions(date)`);
  await db.run(`CREATE INDEX idx_transactions_source_hash ON transactions(source_hash)`);
}

/**
 * Seed a test user + a Banking account. Returns { userId, familyId, accountId }.
 */
async function seedUserAndAccount(db) {
  const { lastID: userId } = await db.run(
    `INSERT INTO users (email, password_hash, name, family_id, role) VALUES (?, ?, ?, ?, ?)`,
    ['test@test.com', '$2a$12$fakehash', 'Test User', 9999, 'administrator']
  );
  const familyId = 9999;

  const { lastID: accountId } = await db.run(
    `INSERT INTO accounts (family_id, name, category, currency, iban_encrypted) VALUES (?, ?, ?, ?, ?)`,
    [familyId, 'B100 Principal', 'Banking', 'EUR', 'encrypted-iban']
  );

  return { userId, familyId, accountId };
}

/**
 * Seed default categories for a family (simplified version of CategoryService.seedDefaultCategories).
 */
async function seedCategories(db, familyId) {
  const categories = [
    { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#10B981', ai: 'Supermarket, Mercadona, Consum' },
    { name: 'Restaurantes', type: 'expense', icon: 'UtensilsCrossed', color: '#F59E0B', ai: 'Restaurants, Horno paco sanz' },
    { name: 'Transport', type: 'expense', icon: 'Car', color: '#3B82F6', ai: 'Gas, parking, tolls' },
    { name: 'Salary', type: 'income', icon: 'Banknote', color: '#22C55E', ai: 'Payroll, nomina' },
    { name: 'Other', type: 'both', icon: 'HelpCircle', color: '#9CA3AF', ai: 'Miscellaneous' },
    { name: 'No computable', type: 'non_computable', icon: 'Ban', color: '#6B7280', ai: 'Excluded from totals' },
  ];

  for (const cat of categories) {
    await db.run(
      `INSERT INTO transaction_categories (family_id, name, type, icon, color, ai_description, is_system)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [familyId, cat.name, cat.type, cat.icon, cat.color, cat.ai]
    );
  }

  // Return the categories for reference
  return await db.all('SELECT * FROM transaction_categories WHERE family_id = ?', [familyId]);
}

/**
 * Seed default transfer rules.
 */
async function seedTransferRules(db, familyId) {
  const rules = [
    { rule_type: 'contains_text', pattern: 'OFF TO SAVE', field: 'detail' },
    { rule_type: 'contains_text', pattern: 'Move to save', field: 'detail' },
    { rule_type: 'sender_is', pattern: 'DAVID JOSE MUNIESA GALLARDO', field: 'detail' },
    { rule_type: 'description_matches', pattern: 'Transferencia realizada.*(mercadona|compra|pan|café)', field: 'description' },
  ];

  for (const rule of rules) {
    await db.run(
      `INSERT INTO transfer_rules (family_id, rule_type, pattern, field) VALUES (?, ?, ?, ?)`,
      [familyId, rule.rule_type, rule.pattern, rule.field]
    );
  }

  return await db.all('SELECT * FROM transfer_rules WHERE family_id = ?', [familyId]);
}

/**
 * Compute source hash (same logic as hash.ts).
 */
function computeSourceHash(accountId, date, amount, description, detail) {
  const crypto = require('crypto');
  const raw = `${accountId}|${date}|${amount}|${description}|${detail || ''}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Insert a single transaction directly (bypasses service layer).
 */
async function insertTransaction(db, { accountId, familyId, amount, date, description, detail, isTransfer, sourceHash, categoryId }) {
  const hash = sourceHash || computeSourceHash(accountId, date, amount, description, detail || '');
  const { lastID } = await db.run(
    `INSERT INTO transactions (
      account_id, family_id, category_id, amount, currency,
      date, description, detail, is_transfer, source, source_hash
    ) VALUES (?, ?, ?, ?, 'EUR', ?, ?, ?, ?, 'test', ?)`,
    [accountId, familyId, categoryId || null, amount, date, description, detail || null, isTransfer ? 1 : 0, hash]
  );
  return lastID;
}

module.exports = {
  createTestDb,
  seedUserAndAccount,
  seedCategories,
  seedTransferRules,
  computeSourceHash,
  insertTransaction,
};
