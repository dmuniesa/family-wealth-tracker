# Bank Transactions & AI Categorization

## Overview

The Transactions feature allows importing bank movements from CSV files, automatically categorizing them with AI, and analyzing spending patterns monthly (similar to apps like Fintonic).

**Scope**: Only Banking accounts are supported.

## CSV Import

### Supported Formats

| Bank | Delimiter | Header Row | Decimal Separator | Columns |
|------|-----------|------------|-------------------|---------|
| **B100** (Santander) | Comma `,` | Row 1 | Dot `.` | 8 columns |
| **BBVA** | Semicolon `;` | Row 5 | Comma `,` | 9 columns |

Auto-detection is handled by `src/lib/parsers/index.ts` - it tries each parser until one matches.

### B100 Column Mapping

| CSV Column | Maps To | Example |
|------------|---------|---------|
| Fecha de Operación | `date` | 12/04/2026 |
| Fecha valor | `value_date` | 12/04/2026 |
| Detalle | `description` | Transferencia recibida |
| Concepto | `detail` | David Jose Muniesa Gallardo |
| Cantidad | `amount` (signed) | -30.00 |
| Saldo tras operación | `balance_after` | 240.00 |
| Divisa | `currency` | EUR |
| Tipo de Movimiento | `movement_type` | Ingreso / Gasto |

### BBVA Column Mapping

| CSV Column | Maps To | Example |
|------------|---------|---------|
| F.Valor | `value_date` | 12/04/2026 |
| Fecha | `date` | 13/04/2026 |
| Concepto | `description` | Horno paco sanz sl teruel es |
| Movimiento | `movement_type` | Pago con tarjeta |
| Importe | `amount` (signed) | -9,07 |
| Divisa | `currency` | EUR |
| Disponible | `balance_after` | 7279,94 |
| Observaciones | `observations` | Full merchant details |

### Import Workflow

1. **Parse** (`POST /api/transactions/import/parse`): User selects a Banking account and uploads a CSV file. The server detects the format, parses transactions, checks for duplicates, applies transfer rules, and returns a preview.

2. **Confirm** (`POST /api/transactions/import/confirm`): User reviews the preview and confirms. Transactions are saved with their `source_hash` for future deduplication.

### Deduplication

Each transaction gets a SHA-256 hash of `account_id + date + amount + description + detail`. A `UNIQUE(account_id, source_hash)` constraint prevents the same transaction from being imported twice.

## Transfer Detection

Transfers between own accounts are identified via configurable rules and excluded from spending/income calculations.

### Default Rules

| Rule Type | Pattern | Field | Description |
|-----------|---------|-------|-------------|
| `contains_text` | OFF TO SAVE | detail | Savings account transfers |
| `contains_text` | Move to save | detail | Savings account transfers |
| `sender_is` | DAVID JOSE MUNIESA GALLARDO | detail | Own-account incoming transfers |
| `description_matches` | Transferencia realizada.*(mercadona\|compra\|pan\|café) | description | Reimbursements to secondary card account |

Rules are evaluated during import and can be toggled on/off. New rules can be added via the API (`/api/transactions/transfer-rules`).

## Categories

### Default Categories (20)

| Category | Type | Icon | AI Keywords |
|----------|------|------|-------------|
| Groceries | expense | ShoppingCart | Mercadona, Consum, Dia, Lidl, Alcampo |
| Restaurantes | expense | UtensilsCrossed | Horno paco sanz, tapas, kebab, telepizza |
| Dining Out | expense | Coffee | Coffee shops, breakfast, snacks |
| Transport | expense | Car | Gas, parking, tolls, public transport |
| Housing | expense | Home | Rent, mortgage, utilities, community fees |
| Health | expense | Heart | Pharmacy, doctor, gym, hospital |
| Shopping | expense | ShoppingBag | Clothing, Amazon, El Corte Ingles |
| Electrónica | expense | Monitor | Electronics, AliExpress, technology |
| Material Deportivo | expense | Dumbbell | Sports equipment, Decathlon |
| Entertainment | expense | Gamepad2 | Streaming, cinema, games, subscriptions |
| Education | expense | GraduationCap | Tuition, courses, school supplies |
| Insurance | expense | Shield | Life, car, home insurance |
| Subscriptions | expense | Repeat | Netflix, Spotify, iCloud, phone plan |
| Bizum | expense | Send | Bizum payments |
| Salary | income | Banknote | Payroll, nomina |
| Transfers In | income | ArrowDownLeft | Internal transfers received |
| Transfers Out | expense | ArrowUpRight | Internal transfers sent |
| Other Income | income | Plus | Refunds, cashback, interest |
| Other | both | HelpCircle | Anything uncategorized |
| No computable | non_computable | Ban | Excluded from totals |

### Category Types

- `income`: Only for positive amounts
- `expense`: Only for negative amounts
- `both`: Can be applied to any transaction
- `non_computable`: Excluded from all totals and analytics

Users can manually change a transaction's category from the list (inline dropdown) or the edit dialog.

## AI Categorization

### Compatible Providers

Any provider implementing the OpenAI Chat Completions API (`/chat/completions`):

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | Default |
| Ollama (local) | `http://localhost:11434/v1` | Free, runs locally |
| z.ai | Provider-specific URL | Alternative |

### Configuration

Via **Settings > AI Integration**:
- **API Key**: Encrypted with AES-256-CBC and stored in `family_settings`
- **Base URL**: Configurable endpoint
- **Model**: Default `gpt-4o-mini`, configurable (e.g., `llama3` for Ollama)
- **Test Connection**: Validates the API key and model availability

### How It Works

1. Uncategorized transactions are sent in batches of 50 to the AI
2. The system prompt instructs the AI to act as a transaction categorizer
3. Each category includes an `ai_description` field with keywords
4. The AI returns `{ transactionId, categoryId, confidence }` for each transaction
5. Categories are applied with the confidence score stored for reference

### API Endpoint

```
POST /api/transactions/categorize
Body: { transactionIds: number[] }
Response: { categorized: number, failed: number }
```

## Analytics

### Monthly Summary (`/transactions/analytics`)

- **Summary cards**: Total income, total expenses, net savings
- **Expense bars**: Horizontal bars per category showing amount and percentage
- **Income list**: Breakdown of income by category
- **Transfers excluded**: Shown separately, not counted in totals
- **Month navigation**: Previous/next arrows to browse months

### API Endpoints

```
GET /api/transactions/analytics/monthly?month=YYYY-MM
GET /api/transactions/analytics/trends?months=6
```

## API Reference

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List with filters (accountId, month, categoryId, isTransfer, page, limit) |
| PUT | `/api/transactions/:id` | Update category, notes, isTransfer |
| DELETE | `/api/transactions/:id` | Delete single transaction |
| POST | `/api/transactions/batch-delete` | Delete multiple by IDs |

### Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions/import/parse` | Parse CSV, return preview (no save) |
| POST | `/api/transactions/import/confirm` | Save confirmed transactions |

### Categories & Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/transactions/categories` | List / create categories |
| PUT/DELETE | `/api/transactions/categories/:id` | Update / delete category |
| GET/POST | `/api/transactions/transfer-rules` | List / create rules |
| PUT/DELETE | `/api/transactions/transfer-rules/:id` | Update / delete rule |

### AI Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/settings/ai` | Get (masked key) / save AI config |
| POST | `/api/settings/ai/test` | Test API connection |

## File Structure

```
src/lib/parsers/              # CSV parsers
  types.ts                    # Parser interfaces
  b100-parser.ts              # B100 format parser
  bbva-parser.ts              # BBVA format parser
  index.ts                    # Auto-detect + dispatch

src/lib/                      # Services
  transaction-service.ts      # CRUD, dedup, analytics queries
  category-service.ts         # Categories CRUD + seed defaults
  transfer-rule-service.ts    # Transfer rules CRUD + evaluation
  ai-service.ts               # OpenAI-compatible API integration
  hash.ts                     # SHA-256 source hash

src/app/[locale]/transactions/
  page.tsx                    # Main transactions page
  analytics/page.tsx          # Monthly analytics

src/components/transactions/
  transaction-import-dialog.tsx   # 3-step import wizard
  transaction-edit-dialog.tsx     # Edit category/notes/transfer

src/app/api/transactions/     # API routes (17 endpoints)
```

## Adding a New Bank Parser

1. Create a new file in `src/lib/parsers/` implementing the `BankParser` interface
2. Implement `detect()` to identify the CSV format by header patterns
3. Implement `parse()` to extract transactions from the CSV text
4. Register the parser in `src/lib/parsers/index.ts` by adding it to the `parsers` array
