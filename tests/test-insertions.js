/**
 * Insertion tests for transactions, categories, transfer rules, and analytics.
 * Uses an in-memory SQLite DB — no effect on production data.
 *
 * Run: node tests/test-insertions.js
 */

const {
  createTestDb,
  seedUserAndAccount,
  seedCategories,
  seedTransferRules,
  computeSourceHash,
  insertTransaction,
} = require('./test-db');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) { passed++; console.log(`  ✓ ${message}`); }
  else { failed++; failures.push(message); console.log(`  ✗ ${message}`); }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++; console.log(`  ✓ ${message}`);
  } else {
    failed++;
    const f = `${message}\n    expected: ${JSON.stringify(expected)}\n    got:      ${JSON.stringify(actual)}`;
    failures.push(f);
    console.log(`  ✗ ${message}`);
  }
}

async function runTests() {
  console.log('\n🧪 Transaction Insertion Tests');
  console.log('='.repeat(50));

  // ─── Setup ────────────────────────────
  const { db, cleanup } = await createTestDb();
  const { familyId, accountId } = await seedUserAndAccount(db);

  // ═══════════════════════════════════════
  console.log('\n📋 1. Category Seeding');
  console.log('─'.repeat(40));

  const categories = await seedCategories(db, familyId);
  assert(categories.length === 6, `Seeded ${categories.length}/6 categories`);
  const expenseCat = categories.find(c => c.name === 'Groceries');
  const incomeCat = categories.find(c => c.name === 'Salary');
  const nonCompCat = categories.find(c => c.name === 'No computable');
  assert(expenseCat && expenseCat.type === 'expense', 'Groceries is expense type');
  assert(incomeCat && incomeCat.type === 'income', 'Salary is income type');
  assert(nonCompCat && nonCompCat.type === 'non_computable', 'No computable is non_computable type');

  // Duplicate category insert should fail (UNIQUE constraint)
  let dupError = false;
  try {
    await db.run(
      `INSERT INTO transaction_categories (family_id, name, type, icon, color, ai_description, is_system)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [familyId, 'Groceries', 'expense', 'ShoppingCart', '#10B981', 'dup']
    );
  } catch (e) {
    dupError = true;
  }
  assert(dupError, 'Duplicate category name rejected (UNIQUE constraint)');

  // Category CRUD
  const { lastID: customCatId } = await db.run(
    `INSERT INTO transaction_categories (family_id, name, type, icon, color, ai_description, is_system)
     VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
    [familyId, 'Custom Cat', 'expense', 'Star', '#FF0000', 'Custom test category']
  );
  assert(customCatId > 0, `Custom category created with id=${customCatId}`);

  await db.run(`UPDATE transaction_categories SET name = 'Renamed Cat' WHERE id = ?`, [customCatId]);
  const renamed = await db.get('SELECT name FROM transaction_categories WHERE id = ?', [customCatId]);
  assertEqual(renamed.name, 'Renamed Cat', 'Category renamed successfully');

  await db.run('DELETE FROM transaction_categories WHERE id = ?', [customCatId]);
  const deleted = await db.get('SELECT * FROM transaction_categories WHERE id = ?', [customCatId]);
  assert(!deleted, 'Category deleted successfully');

  // ═══════════════════════════════════════
  console.log('\n🔄 2. Transfer Rules');
  console.log('─'.repeat(40));

  const rules = await seedTransferRules(db, familyId);
  assert(rules.length === 4, `Seeded ${rules.length}/4 transfer rules`);

  // Test rule evaluation
  const activeRules = rules.filter(r => r.is_active);
  assert(activeRules.length === 4, 'All rules active by default');

  // Create custom rule
  const { lastID: customRuleId } = await db.run(
    `INSERT INTO transfer_rules (family_id, rule_type, pattern, field) VALUES (?, ?, ?, ?)`,
    [familyId, 'contains_text', 'CUSTOM PATTERN', 'description']
  );
  assert(customRuleId > 0, `Custom rule created with id=${customRuleId}`);

  // Update rule (deactivate)
  await db.run('UPDATE transfer_rules SET is_active = 0 WHERE id = ?', [customRuleId]);
  const deactivated = await db.get('SELECT is_active FROM transfer_rules WHERE id = ?', [customRuleId]);
  assertEqual(deactivated.is_active, 0, 'Rule deactivated');

  // Delete rule
  await db.run('DELETE FROM transfer_rules WHERE id = ?', [customRuleId]);
  const gone = await db.get('SELECT * FROM transfer_rules WHERE id = ?', [customRuleId]);
  assert(!gone, 'Rule deleted');

  // ═══════════════════════════════════════
  console.log('\n💰 3. Transaction Insertions');
  console.log('─'.repeat(40));

  // Insert a basic expense
  const tx1Id = await insertTransaction(db, {
    accountId, familyId,
    amount: -45.60,
    date: '2026-04-10',
    description: 'Pago con tarjeta',
    detail: 'MERCADONA ZARAGOZA ES',
    isTransfer: false,
    categoryId: expenseCat.id,
  });
  assert(tx1Id > 0, `Expense inserted: id=${tx1Id}`);

  // Verify the transaction
  const tx1 = await db.get('SELECT * FROM transactions WHERE id = ?', [tx1Id]);
  assertEqual(tx1.amount, -45.60, 'Amount stored correctly');
  assertEqual(tx1.description, 'Pago con tarjeta', 'Description stored');
  assertEqual(tx1.detail, 'MERCADONA ZARAGOZA ES', 'Detail stored');
  assertEqual(tx1.is_transfer, 0, 'Not marked as transfer');
  assertEqual(tx1.category_id, expenseCat.id, 'Category linked');

  // Insert an income
  const tx2Id = await insertTransaction(db, {
    accountId, familyId,
    amount: 1500.00,
    date: '2026-04-01',
    description: 'Transferencia recibida',
    detail: 'NOMINA ABRIL',
    isTransfer: false,
    categoryId: incomeCat.id,
  });
  assert(tx2Id > 0, `Income inserted: id=${tx2Id}`);

  // Insert a transfer (OFF TO SAVE)
  const tx3Id = await insertTransaction(db, {
    accountId, familyId,
    amount: -30.00,
    date: '2026-04-10',
    description: 'Transferencia enviada',
    detail: 'OFF TO SAVE 10/04',
    isTransfer: true,
  });
  assert(tx3Id > 0, `Transfer inserted: id=${tx3Id}`);

  // Insert a non-computable
  const tx4Id = await insertTransaction(db, {
    accountId, familyId,
    amount: -5.00,
    date: '2026-04-05',
    description: 'Ajuste contable',
    detail: 'Corrección doble cargo',
    isTransfer: false,
    categoryId: nonCompCat.id,
  });
  assert(tx4Id > 0, `Non-computable inserted: id=${tx4Id}`);

  // ═══════════════════════════════════════
  console.log('\n🔒 4. Deduplication (source_hash UNIQUE)');
  console.log('─'.repeat(40));

  // Attempt to insert the exact same transaction as tx1
  let dupTxError = false;
  try {
    await insertTransaction(db, {
      accountId, familyId,
      amount: -45.60,
      date: '2026-04-10',
      description: 'Pago con tarjeta',
      detail: 'MERCADONA ZARAGOZA ES',
      isTransfer: false,
      categoryId: expenseCat.id,
    });
  } catch (e) {
    dupTxError = true;
  }
  assert(dupTxError, 'Duplicate transaction rejected (UNIQUE account_id + source_hash)');

  // Same transaction in different account should succeed
  const { lastID: account2Id } = await db.run(
    `INSERT INTO accounts (family_id, name, category, currency, iban_encrypted) VALUES (?, ?, ?, ?, ?)`,
    [familyId, 'BBVA Secundaria', 'Banking', 'EUR', 'encrypted-iban-2']
  );
  const tx5Id = await insertTransaction(db, {
    accountId: account2Id, familyId,
    amount: -45.60,
    date: '2026-04-10',
    description: 'Pago con tarjeta',
    detail: 'MERCADONA ZARAGOZA ES',
    isTransfer: false,
    categoryId: expenseCat.id,
  });
  assert(tx5Id > 0, 'Same tx in different account → allowed');

  // Hash determinism check
  const h1 = computeSourceHash(accountId, '2026-04-10', -45.60, 'Pago con tarjeta', 'MERCADONA ZARAGOZA ES');
  const h2 = computeSourceHash(accountId, '2026-04-10', -45.60, 'Pago con tarjeta', 'MERCADONA ZARAGOZA ES');
  assertEqual(h1, h2, 'Hash is deterministic');
  assert(h1.length === 64, 'Hash is 64 chars');

  // ═══════════════════════════════════════
  console.log('\n✏️ 5. Transaction Updates');
  console.log('─'.repeat(40));

  // Update category
  await db.run('UPDATE transactions SET category_id = ? WHERE id = ?', [incomeCat.id, tx1Id]);
  const updated = await db.get('SELECT category_id FROM transactions WHERE id = ?', [tx1Id]);
  assertEqual(updated.category_id, incomeCat.id, 'Category updated');

  // Update notes
  await db.run("UPDATE transactions SET notes = 'Reviewed' WHERE id = ?", [tx1Id]);
  const withNotes = await db.get('SELECT notes FROM transactions WHERE id = ?', [tx1Id]);
  assertEqual(withNotes.notes, 'Reviewed', 'Notes updated');

  // Toggle transfer
  await db.run('UPDATE transactions SET is_transfer = 1 WHERE id = ?', [tx2Id]);
  const toggled = await db.get('SELECT is_transfer FROM transactions WHERE id = ?', [tx2Id]);
  assertEqual(toggled.is_transfer, 1, 'Transfer toggled on');

  // ═══════════════════════════════════════
  console.log('\n🗑️ 6. Transaction Deletion');
  console.log('─'.repeat(40));

  // Count before
  const countBefore = await db.get('SELECT COUNT(*) as c FROM transactions WHERE family_id = ?', [familyId]);
  console.log(`    Transactions before delete: ${countBefore.c}`);

  // Single delete
  await db.run('DELETE FROM transactions WHERE id = ?', [tx4Id]);
  const afterSingle = await db.get('SELECT COUNT(*) as c FROM transactions WHERE family_id = ?', [familyId]);
  assertEqual(afterSingle.c, countBefore.c - 1, 'Single delete removes 1 row');

  // Batch delete
  const idsToDelete = [tx1Id, tx2Id];
  const placeholders = idsToDelete.map(() => '?').join(',');
  const batchResult = await db.run(
    `DELETE FROM transactions WHERE id IN (${placeholders}) AND family_id = ?`,
    [...idsToDelete, familyId]
  );
  assertEqual(batchResult.changes, 2, 'Batch delete removes 2 rows');

  // Verify remaining
  const remaining = await db.get('SELECT COUNT(*) as c FROM transactions WHERE family_id = ?', [familyId]);
  console.log(`    Transactions remaining: ${remaining.c}`);

  // ═══════════════════════════════════════
  console.log('\n📊 7. Monthly Analytics');
  console.log('─'.repeat(40));

  // Clean slate for analytics — delete all previous transactions
  await db.run('DELETE FROM transactions WHERE family_id = ?', [familyId]);

  // Insert fresh data for analytics test
  const aprilData = [
    { amount: -45.60, date: '2026-04-10', desc: 'Mercadona', detail: 'Groceries', catId: expenseCat.id, isXfer: 0 },
    { amount: -12.30, date: '2026-04-11', desc: 'Horno paco sanz', detail: 'Lunch', catId: categories.find(c => c.name === 'Restaurantes').id, isXfer: 0 },
    { amount: 1500.00, date: '2026-04-01', desc: 'Nomina', detail: 'Salary April', catId: incomeCat.id, isXfer: 0 },
    { amount: -30.00, date: '2026-04-10', desc: 'Transferencia enviada', detail: 'OFF TO SAVE', catId: null, isXfer: 1 },
    { amount: 30.00, date: '2026-04-10', desc: 'Transferencia recibida', detail: 'OFF TO SAVE', catId: null, isXfer: 1 },
    { amount: -5.00, date: '2026-04-05', desc: 'Ajuste', detail: 'Contable', catId: nonCompCat.id, isXfer: 0 },
    { amount: -60.00, date: '2026-04-12', desc: 'Gasolinera', detail: 'Repsol', catId: categories.find(c => c.name === 'Transport').id, isXfer: 0 },
  ];

  for (const t of aprilData) {
    await insertTransaction(db, {
      accountId, familyId,
      amount: t.amount,
      date: t.date,
      description: t.desc,
      detail: t.detail,
      isTransfer: !!t.isXfer,
      categoryId: t.catId,
    });
  }

  // Calculate totals (same logic as TransactionService.getMonthlySummary)
  const allApril = await db.all(
    `SELECT t.amount, t.is_transfer, t.category_id, tc.type as cat_type
     FROM transactions t
     LEFT JOIN transaction_categories tc ON t.category_id = tc.id
     WHERE t.family_id = ? AND strftime('%Y-%m', t.date) = '2026-04'`,
    [familyId]
  );

  const totalIncome = allApril
    .filter(t => t.amount > 0 && t.cat_type !== 'non_computable' && !t.is_transfer)
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = allApril
    .filter(t => t.amount < 0 && t.cat_type !== 'non_computable' && !t.is_transfer)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const transfers = allApril.filter(t => t.is_transfer);
  const nonComputable = allApril.filter(t => t.cat_type === 'non_computable' && !t.is_transfer);

  assertEqual(Math.round(totalIncome * 100) / 100, 1500.00, `Total income = ${totalIncome.toFixed(2)} (1500.00 expected)`);
  assertEqual(Math.round(totalExpenses * 100) / 100, 117.90, `Total expenses = ${totalExpenses.toFixed(2)} (117.90 expected)`);
  assertEqual(Math.round((totalIncome - totalExpenses) * 100) / 100, 1382.10, `Net = ${(totalIncome - totalExpenses).toFixed(2)} (1382.10 expected)`);
  assertEqual(transfers.length, 2, '2 transfers found');
  assertEqual(nonComputable.length, 1, '1 non-computable found');

  // Verify transfers are excluded from totals
  const transferAmount = transfers.reduce((s, t) => s + t.amount, 0);
  assertEqual(Math.round(transferAmount * 100) / 100, 0, `Transfers net to 0 (${transferAmount})`);

  // Category grouping
  const byCategory = {};
  allApril.filter(t => t.category_id && !t.is_transfer && t.cat_type !== 'non_computable').forEach(t => {
    byCategory[t.category_id] = (byCategory[t.category_id] || 0) + t.amount;
  });
  const numCategories = Object.keys(byCategory).length;
  assertEqual(numCategories, 4, `Grouped into 4 categories: Groceries, Restaurantes, Transport, Salary (got ${numCategories})`);

  // ═══════════════════════════════════════
  console.log('\n🔍 8. Filtering & Pagination');
  console.log('─'.repeat(40));

  // Filter by account
  const byAccount = await db.all(
    'SELECT * FROM transactions WHERE account_id = ? AND family_id = ?',
    [accountId, familyId]
  );
  assert(byAccount.length === 7, `Filter by account 1: ${byAccount.length} results (7 expected)`);

  // Filter by month
  const byMonth = await db.all(
    `SELECT * FROM transactions WHERE family_id = ? AND strftime('%Y-%m', date) = '2026-04'`,
    [familyId]
  );
  assert(byMonth.length === 7, `Filter by month April: ${byMonth.length} results (7 expected)`);

  // Filter by transfer
  const xferOnly = await db.all(
    `SELECT * FROM transactions WHERE family_id = ? AND is_transfer = 1`,
    [familyId]
  );
  assert(xferOnly.length === 2, `Filter transfers only: ${xferOnly.length} results`);

  // Pagination
  const page = 1;
  const limit = 3;
  const offset = (page - 1) * limit;
  const paginated = await db.all(
    `SELECT * FROM transactions WHERE family_id = ? ORDER BY date DESC LIMIT ? OFFSET ?`,
    [familyId, limit, offset]
  );
  assertEqual(paginated.length, 3, `Page 1 (limit 3): ${paginated.length} results`);

  // Count with pagination
  const totalRows = await db.get('SELECT COUNT(*) as c FROM transactions WHERE family_id = ?', [familyId]);
  const totalPages = Math.ceil(totalRows.c / limit);
  assert(totalPages >= 2, `Total pages: ${totalPages} (≥ 2 expected)`);

  // ═══════════════════════════════════════
  console.log('\n🏦 9. Multi-Account Scenarios');
  console.log('─'.repeat(40));

  // Insert in second account
  await insertTransaction(db, {
    accountId: account2Id, familyId,
    amount: -9.07,
    date: '2026-04-13',
    description: 'Horno paco sanz sl teruel es',
    detail: 'Pago con tarjeta',
    isTransfer: false,
    categoryId: categories.find(c => c.name === 'Restaurantes').id,
  });

  // Also insert something in account 1 with same description
  await insertTransaction(db, {
    accountId, familyId,
    amount: -8.50,
    date: '2026-04-14',
    description: 'Horno paco sanz sl teruel es',
    detail: 'Café y tostada',
    isTransfer: false,
    categoryId: categories.find(c => c.name === 'Restaurantes').id,
  });

  const account2Tx = await db.all(
    'SELECT * FROM transactions WHERE account_id = ?',
    [account2Id]
  );
  assert(account2Tx.length >= 1, `Account 2 has ${account2Tx.length} transactions (≥ 1)`);

  // Verify same description in different accounts
  const sameDesc = await db.all(
    `SELECT account_id, COUNT(*) as c FROM transactions
     WHERE family_id = ? AND description = 'Horno paco sanz sl teruel es'
     GROUP BY account_id`,
    [familyId]
  );
  assert(sameDesc.length >= 2, `Same description in different accounts: ${sameDesc.length} accounts`);

  // ═══════════════════════════════════════
  // Cross-family isolation
  console.log('\n🔐 10. Family Isolation');
  console.log('─'.repeat(40));

  const { lastID: otherUserId } = await db.run(
    `INSERT INTO users (email, password_hash, name, family_id, role) VALUES (?, ?, ?, ?, ?)`,
    ['other@test.com', '$2a$12$fakehash', 'Other User', 8888, 'user']
  );
  const { lastID: otherAccountId } = await db.run(
    `INSERT INTO accounts (family_id, name, category, currency, iban_encrypted) VALUES (?, ?, ?, ?, ?)`,
    [8888, 'Other Bank', 'Banking', 'EUR', 'other-iban']
  );

  await insertTransaction(db, {
    accountId: otherAccountId, familyId: 8888,
    amount: -100,
    date: '2026-04-01',
    description: 'Other family tx',
    detail: 'Should not be visible',
    isTransfer: false,
  });

  const familyFilter = await db.all(
    'SELECT * FROM transactions WHERE family_id = ?',
    [familyId]
  );
  const otherFamilyTx = await db.all(
    'SELECT * FROM transactions WHERE family_id = ?',
    [8888]
  );
  assert(!familyFilter.some(t => t.description === 'Other family tx'), 'Family 9999 cannot see family 8888 data');
  assertEqual(otherFamilyTx.length, 1, 'Family 8888 sees its own transaction');

  // ═══════════════════════════════════════
  // Cleanup & results
  await cleanup();

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  • ${f}`));
  }
  console.log('='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test runner error:', e);
  process.exit(1);
});
