/**
 * Tests for CSV parsers, hash utility, transfer rules, and number/date parsing.
 * Run: node tests/run-tests.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) { passed++; console.log(`  ✓ ${message}`); }
  else { failed++; failures.push(message); console.log(`  ✗ ${message}`); }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ✓ ${message}`); }
  else { failed++; failures.push(`${message}\n    expected: ${JSON.stringify(expected)}\n    got:      ${JSON.stringify(actual)}`); console.log(`  ✗ ${message}`); }
}

// ============================================
// Helper functions (replicated from parsers)
// ============================================
function parseDate(dateStr) {
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseEuropeanNumber(value) {
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function computeSourceHash(accountId, date, amount, description, detail) {
  const raw = `${accountId}|${date}|${amount}|${description}|${detail || ''}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

function parseB100(csvText) {
  const transactions = [];
  const errors = [];
  const lines = csvText.split('\n').filter(l => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const fields = splitCSVLine(line);
      if (fields.length < 8) { errors.push({ row: i + 1, message: `Expected 8 fields, got ${fields.length}` }); continue; }
      const [opDate, valueDate, detail, concept, amountStr, balanceStr, currency, movementType] = fields;
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) { errors.push({ row: i + 1, message: `Invalid amount: ${amountStr}` }); continue; }
      const balanceAfter = parseFloat(balanceStr);
      transactions.push({
        date: parseDate(opDate), valueDate: parseDate(valueDate),
        description: detail.trim(), detail: concept.trim(), amount,
        currency: currency.trim(), movementType: movementType.trim(),
        balanceAfter: isNaN(balanceAfter) ? undefined : balanceAfter,
      });
    } catch (e) { errors.push({ row: i + 1, message: e.message }); }
  }
  return { transactions, errors };
}

function parseBBVA(csvText) {
  const transactions = [];
  const errors = [];
  const lines = csvText.split('\n').filter(l => l.trim());
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('F.Valor') && line.includes('Importe') && line.includes(';')) { headerIndex = i; break; }
  }
  if (headerIndex === -1) return { transactions: [], errors: [{ row: 0, message: 'Header not found' }] };
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const fields = line.split(';').map(f => f.trim());
      if (fields.length < 6) { errors.push({ row: i + 1, message: 'Too few fields' }); continue; }
      const [fValor, fecha, concepto, movimiento, importeStr, divisa, disponibleStr, , observaciones] = fields;
      const amount = parseEuropeanNumber(importeStr);
      if (isNaN(amount)) { errors.push({ row: i + 1, message: 'Invalid amount' }); continue; }
      const balanceAfterRaw = disponibleStr ? parseEuropeanNumber(disponibleStr) : NaN;
      transactions.push({
        date: parseDate(fecha), valueDate: parseDate(fValor),
        description: concepto.trim(), detail: movimiento.trim(), amount,
        currency: divisa.trim(), movementType: movimiento.trim(),
        balanceAfter: !isNaN(balanceAfterRaw) ? balanceAfterRaw : undefined,
        observations: observaciones?.trim() || undefined,
      });
    } catch (e) { errors.push({ row: i + 1, message: e.message }); }
  }
  return { transactions, errors };
}

function evaluateRule(tx, rule) {
  const getFieldValue = (field) => {
    const combined = [tx.description, tx.detail, tx.observations].filter(Boolean).join(' ');
    if (field === 'description') return tx.description || '';
    if (field === 'detail') return tx.detail || '';
    if (field === 'observations') return tx.observations || '';
    return combined;
  };
  const fieldValue = getFieldValue(rule.field);
  switch (rule.rule_type) {
    case 'contains_text': return fieldValue.toLowerCase().includes(rule.pattern.toLowerCase());
    case 'sender_is': return fieldValue.toUpperCase().trim() === rule.pattern.toUpperCase().trim();
    case 'description_matches': try { return new RegExp(rule.pattern, 'i').test(fieldValue); } catch { return false; }
  }
  return false;
}

// ============================================
// Tests
// ============================================

console.log('\n📋 Date Parsing');
console.log('─'.repeat(40));
assertEqual(parseDate('12/04/2026'), '2026-04-12', '12/04/2026 → 2026-04-12');
assertEqual(parseDate('01/03/2026'), '2026-03-01', '01/03/2026 → 2026-03-01');
assertEqual(parseDate('28/02/2026'), '2026-02-28', '28/02/2026 → 2026-02-28');
assertEqual(parseDate('1/4/2026'), '2026-04-01', '1/4/2026 → 2026-04-01 (padded)');

console.log('\n🔢 European Number Parsing');
console.log('─'.repeat(40));
assertEqual(parseEuropeanNumber('7279,94'), 7279.94, '7279,94 → 7279.94');
assertEqual(parseEuropeanNumber('-9,07'), -9.07, '-9,07 → -9.07');
assertEqual(parseEuropeanNumber('-11'), -11, '-11 → -11');
assertEqual(parseEuropeanNumber('-160,49'), -160.49, '-160,49 → -160.49');
assertEqual(parseEuropeanNumber('1.234,56'), 1234.56, '1.234,56 → 1234.56');
assertEqual(parseEuropeanNumber('0'), 0, '0 → 0');

console.log('\n🔒 SHA-256 Hash (Dedup)');
console.log('─'.repeat(40));
const h1 = computeSourceHash(1, '2026-04-12', -30, 'Transferencia enviada', 'OFF TO SAVE 10/04');
const h2 = computeSourceHash(1, '2026-04-12', -30, 'Transferencia enviada', 'OFF TO SAVE 10/04');
const h3 = computeSourceHash(2, '2026-04-12', -30, 'Transferencia enviada', 'OFF TO SAVE 10/04');
assert(h1 === h2, 'Same input → same hash (deterministic)');
assert(h1 !== h3, 'Different accountId → different hash');
assertEqual(h1.length, 64, 'Hash is 64 chars (SHA-256 hex)');
assert(/^[a-f0-9]{64}$/.test(h1), 'Hash is valid hex');

console.log('\n🔄 Transfer Rules');
console.log('─'.repeat(40));
const rules = [
  { rule_type: 'contains_text', pattern: 'OFF TO SAVE', field: 'detail' },
  { rule_type: 'contains_text', pattern: 'Move to save', field: 'detail' },
  { rule_type: 'sender_is', pattern: 'DAVID JOSE MUNIESA GALLARDO', field: 'detail' },
  { rule_type: 'description_matches', pattern: 'Transferencia realizada.*(mercadona|compra|pan|café)', field: 'description' },
];
assert(evaluateRule({ description: 'Transferencia enviada', detail: 'OFF TO SAVE 10/04' }, rules[0]), 'OFF TO SAVE matches');
assert(evaluateRule({ description: 'Tipo de operación', detail: 'Move to save día 10/04' }, rules[1]), 'Move to save matches');
assert(evaluateRule({ description: 'Transferencia recibida', detail: 'DAVID JOSE MUNIESA GALLARDO' }, rules[2]), 'Own name matches sender_is');
assert(!evaluateRule({ description: 'Transferencia recibida', detail: 'Some other person' }, rules[2]), 'Other person does not match');
assert(evaluateRule({ description: 'Transferencia realizada a mercadona' }, rules[3]), 'Mercadona regex matches');
assert(!evaluateRule({ description: 'Transferencia recibida' }, rules[3]), 'Recibida does not match regex');
assert(!rules.some(r => evaluateRule({ description: 'Pago con tarjeta', detail: 'Horno paco sanz sl teruel es' }, r)), 'Regular merchant no match');

console.log('\n📄 B100 CSV Parser');
console.log('─'.repeat(40));
const b100File = path.join(__dirname, '..', 'data', 'accounts', 'MovimientosB100.csv');
if (fs.existsSync(b100File)) {
  const b100Result = parseB100(fs.readFileSync(b100File, 'utf-8'));
  assert(b100Result.transactions.length > 0, `Parsed ${b100Result.transactions.length} transactions`);
  assertEqual(b100Result.errors.length, 0, 'No parse errors');
  if (b100Result.transactions.length > 0) {
    const t = b100Result.transactions[0];
    assert(t.date === '2026-04-12', `First date: ${t.date}`);
    assert(t.currency === 'EUR', `Currency: ${t.currency}`);
    assert(typeof t.amount === 'number', `Amount is number: ${t.amount}`);
    assert(b100Result.transactions.filter(t => t.amount < 0).length > 0, 'Has expenses');
    assert(b100Result.transactions.filter(t => t.amount > 0).length > 0, 'Has income');
  }
  // Specific checks
  const txs = b100Result.transactions;
  const offToSave = txs.filter(t => t.detail && t.detail.includes('OFF TO SAVE'));
  assert(offToSave.length > 0, `Found ${offToSave.length} OFF TO SAVE`);
  assert(offToSave.every(t => t.amount === -30), 'All OFF TO SAVE are -30.00');
  const moveToSave = txs.filter(t => t.detail && t.detail.includes('Move to save'));
  assert(moveToSave.length > 0, `Found ${moveToSave.length} Move to save`);
  const mercadona = txs.filter(t => t.detail && t.detail.includes('MERCADONA'));
  assert(mercadona.length > 0, `Found ${mercadona.length} Mercadona`);
  assert(mercadona.every(t => t.amount < 0), 'Mercadona are expenses');
  const incomeTx = txs.filter(t => t.movementType === 'Ingreso');
  assert(incomeTx.length > 0, `${incomeTx.length} Ingreso`);
  assert(incomeTx.every(t => t.amount > 0), 'All Ingreso positive');
  const gastoTx = txs.filter(t => t.movementType === 'Gasto');
  assert(gastoTx.length > 0, `${gastoTx.length} Gasto`);
  assert(gastoTx.every(t => t.amount < 0), 'All Gasto negative');
} else {
  console.log('  ⚠ B100 CSV not found, skipping');
}

console.log('\n📄 BBVA CSV Parser');
console.log('─'.repeat(40));
const bbvaFiles = fs.readdirSync(path.join(__dirname, '..', 'data', 'accounts'))
  .filter(f => f.includes('movimientos') && f.endsWith('.csv'));
if (bbvaFiles.length > 0) {
  const bbvaResult = parseBBVA(fs.readFileSync(path.join(__dirname, '..', 'data', 'accounts', bbvaFiles[0]), 'utf-8'));
  assert(bbvaResult.transactions.length > 0, `Parsed ${bbvaResult.transactions.length} transactions`);
  assertEqual(bbvaResult.errors.length, 0, 'No parse errors');
  if (bbvaResult.transactions.length > 0) {
    const t = bbvaResult.transactions[0];
    assert(/^\d{4}-\d{2}-\d{2}$/.test(t.date), `Date format: ${t.date}`);
    assert(t.currency === 'EUR', `Currency: ${t.currency}`);
    assert(typeof t.amount === 'number', `Amount is number: ${t.amount}`);
    assert(bbvaResult.transactions.filter(t => t.amount < 0).length > 0, 'Has negative amounts');
  }
} else {
  console.log('  ⚠ BBVA CSV not found, skipping');
}

// ============================================
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  • ${f}`));
}
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
