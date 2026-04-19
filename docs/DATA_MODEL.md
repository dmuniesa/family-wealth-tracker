# Data Model & Database Schema

Complete reference for the Family Wealth Tracker database schema, table definitions, relationships, and architecture.

## Overview

The application uses **SQLite3** as its database engine. The database file is located at `data/wealth_tracker.db`. All migrations run automatically on application startup via `src/lib/database.ts`.

The schema follows a **multi-family isolation** pattern: every data table includes a `family_id` column, ensuring complete data separation between families.

## Entity-Relationship Diagram

```
users (family_id) ──────────┬── accounts (family_id)
  │                         │       │
  │                         │       └── balances (account_id)
  │                         │
  │                         ├── transactions (family_id, account_id, category_id)
  │                         │
  │                         ├── transaction_categories (family_id)
  │                         │
  │                         ├── transfer_rules (family_id)
  │                         │
  │                         ├── family_settings (family_id)
  │                         │
  │                         └── system_logs (family_id)
  │
  ├── password_reset_tokens (user_id)
  │
  └── chat_conversations (family_id, user_id)
          │
          └── chat_messages (conversation_id)
```

---

## Table Definitions

### 1. users

Stores user accounts with family membership and role-based access control.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `email` | TEXT | UNIQUE, NOT NULL | User email address |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password |
| `name` | TEXT | NOT NULL | Display name |
| `family_id` | INTEGER | NOT NULL | Family group identifier |
| `role` | TEXT | CHECK IN ('administrator', 'user', 'guest'), DEFAULT 'user' | Access role |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

**Indexes:** `idx_users_family_id`, `idx_users_role`

---

### 2. accounts

Financial accounts with full debt amortization support.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `family_id` | INTEGER | NOT NULL, FK | Family group |
| `name` | TEXT | NOT NULL | Account name |
| `category` | TEXT | CHECK IN ('Banking', 'Investment', 'Debt'), NOT NULL | Account type |
| `currency` | TEXT | NOT NULL | Currency code (EUR, USD, GBP, etc.) |
| `iban_encrypted` | TEXT | NOT NULL | AES-256-CBC encrypted IBAN |
| `notes` | TEXT | | Optional notes |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| `apr_rate` | DECIMAL(5,4) | DEFAULT NULL | Annual percentage rate (Debt only) |
| `monthly_payment` | DECIMAL(15,2) | DEFAULT NULL | Fixed monthly payment (Debt only) |
| `loan_term_months` | INTEGER | DEFAULT NULL | Total loan term (Debt only) |
| `remaining_months` | INTEGER | DEFAULT NULL | Months remaining (Debt only) |
| `payment_type` | TEXT | CHECK IN ('fixed', 'interest_only'), DEFAULT 'fixed' | Payment calculation type (Debt only) |
| `auto_update_enabled` | BOOLEAN | DEFAULT FALSE | Auto monthly balance update (Debt only) |
| `last_auto_update` | DATE | DEFAULT NULL | Last auto-update date (Debt only) |
| `original_balance` | DECIMAL(15,2) | DEFAULT NULL | Original loan amount (Debt only) |
| `loan_start_date` | DATE | DEFAULT NULL | Loan start date (Debt only) |

**Indexes:** `idx_accounts_family_id`

---

### 3. balances

Historical balance records with amortization tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `account_id` | INTEGER | NOT NULL, FK, ON DELETE CASCADE | Linked account |
| `amount` | DECIMAL(15,2) | NOT NULL | Balance amount |
| `date` | DATE | NOT NULL | Balance date |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update |
| `balance_type` | TEXT | CHECK IN ('manual', 'automatic', 'payment'), DEFAULT 'manual' | How balance was recorded |
| `interest_amount` | DECIMAL(15,2) | DEFAULT NULL | Interest portion (Debt payments) |
| `principal_amount` | DECIMAL(15,2) | DEFAULT NULL | Principal portion (Debt payments) |
| `payment_amount` | DECIMAL(15,2) | DEFAULT NULL | Total payment (Debt payments) |
| `notes` | TEXT | DEFAULT NULL | Optional notes |

**Indexes:** `idx_balances_account_id`, `idx_balances_date`

---

### 4. transactions

Bank transactions with AI categorization and deduplication.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `account_id` | INTEGER | NOT NULL, FK, ON DELETE CASCADE | Linked account |
| `family_id` | INTEGER | NOT NULL, FK | Family group |
| `category_id` | INTEGER | FK, ON DELETE SET NULL | Linked category (nullable) |
| `amount` | DECIMAL(15,2) | NOT NULL | Amount (negative=expense, positive=income) |
| `currency` | TEXT | NOT NULL, DEFAULT 'EUR' | Currency code |
| `date` | DATE | NOT NULL | Transaction date |
| `value_date` | DATE | DEFAULT NULL | Value date |
| `description` | TEXT | NOT NULL | Main description |
| `detail` | TEXT | DEFAULT NULL | Additional details |
| `observations` | TEXT | DEFAULT NULL | User observations |
| `movement_type` | TEXT | DEFAULT NULL | Bank-specific movement type |
| `balance_after` | DECIMAL(15,2) | DEFAULT NULL | Account balance after transaction |
| `is_transfer` | BOOLEAN | DEFAULT FALSE | Flagged as internal transfer |
| `import_batch_id` | TEXT | DEFAULT NULL | CSV import batch identifier |
| `source` | TEXT | DEFAULT NULL | Original source |
| `source_hash` | TEXT | NOT NULL | SHA-256 hash for deduplication |
| `ai_confidence` | REAL | DEFAULT NULL | AI categorization confidence (0-1) |
| `notes` | TEXT | DEFAULT NULL | User notes |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update |

**Unique constraint:** `(account_id, source_hash)` - prevents duplicate imports

**Indexes:** `idx_transactions_account_id`, `idx_transactions_family_id`, `idx_transactions_date`, `idx_transactions_category_id`, `idx_transactions_is_transfer`, `idx_transactions_source_hash`, `idx_transactions_import_batch`

---

### 5. transaction_categories

Categories for organizing transactions, with AI training support.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `family_id` | INTEGER | NOT NULL, FK | Family group |
| `name` | TEXT | NOT NULL | Category name |
| `type` | TEXT | CHECK IN ('income', 'expense', 'both', 'non_computable'), DEFAULT 'expense' | Category type |
| `icon` | TEXT | DEFAULT NULL | UI icon identifier |
| `color` | TEXT | DEFAULT NULL | UI color code |
| `ai_description` | TEXT | DEFAULT NULL | Description for AI training |
| `is_system` | BOOLEAN | DEFAULT FALSE | System-defined category |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Unique constraint:** `(family_id, name)` - no duplicate category names per family

---

### 6. transfer_rules

Configurable rules for automatic transfer detection.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `family_id` | INTEGER | NOT NULL, FK | Family group |
| `rule_type` | TEXT | CHECK IN ('contains_text', 'sender_is', 'description_matches'), NOT NULL | Matching strategy |
| `pattern` | TEXT | NOT NULL | Pattern to match |
| `field` | TEXT | CHECK IN ('description', 'detail', 'observations', 'any'), DEFAULT 'any' | Target field |
| `is_active` | BOOLEAN | DEFAULT TRUE | Enabled/disabled |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Rule types explained:**
- `contains_text` - Checks if the target field contains the pattern string
- `sender_is` - Matches against the sender/origin information
- `description_matches` - Pattern matched against the description field

---

### 7. family_settings

Per-family configuration, primarily for AI integration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `family_id` | INTEGER | NOT NULL, UNIQUE, FK | Family group (one-to-one) |
| `ai_api_key_encrypted` | TEXT | DEFAULT NULL | AES-256-CBC encrypted API key |
| `ai_base_url` | TEXT | DEFAULT 'https://api.openai.com/v1' | AI API endpoint |
| `ai_model` | TEXT | DEFAULT 'gpt-4o-mini' | Model identifier |
| `ai_last_test` | TEXT | DEFAULT NULL | Last connection test timestamp |
| `ai_chat_enabled` | BOOLEAN | DEFAULT 0 | Enable/disable AI chat |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update |

**Compatible providers:** OpenAI, Ollama, z.ai, and any OpenAI-compatible API endpoint.

---

### 8. system_logs

Operational logging for monitoring and debugging.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `timestamp` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Event timestamp |
| `level` | TEXT | CHECK IN ('info', 'warn', 'error', 'success'), NOT NULL | Log severity |
| `category` | TEXT | CHECK IN ('debt_update', 'email', 'backup', 'system', 'auth'), NOT NULL | Operation category |
| `operation` | TEXT | NOT NULL | Operation name |
| `details` | TEXT | | Additional details |
| `family_id` | INTEGER | FK | Family group (nullable) |
| `user_id` | INTEGER | FK | Triggering user (nullable) |
| `duration_ms` | INTEGER | | Operation duration |
| `status` | TEXT | CHECK IN ('started', 'completed', 'failed'), NOT NULL | Operation status |
| `error_message` | TEXT | | Error details on failure |
| `metadata` | TEXT | | JSON string with extra data |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Indexes:** `idx_system_logs_timestamp`, `idx_system_logs_category`, `idx_system_logs_status`, `idx_system_logs_family_id`, `idx_system_logs_level`

---

### 9. password_reset_tokens

Secure one-time tokens for password recovery flow.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `user_id` | INTEGER | NOT NULL, FK | Target user |
| `token_hash` | TEXT | UNIQUE, NOT NULL | Hashed reset token |
| `expires_at` | DATETIME | NOT NULL | Expiration timestamp |
| `used_at` | DATETIME | DEFAULT NULL | When token was used (null = unused) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:** `idx_password_reset_tokens_hash`, `idx_password_reset_tokens_user_id`

---

### 10. chat_conversations

AI chat conversation sessions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `family_id` | INTEGER | NOT NULL, FK | Family group |
| `user_id` | INTEGER | NOT NULL, FK | Conversation owner |
| `title` | TEXT | NOT NULL, DEFAULT '' | Conversation title |
| `type` | TEXT | CHECK IN ('auto', 'manual'), DEFAULT 'manual' | Conversation type |
| `status` | TEXT | CHECK IN ('active', 'closed'), DEFAULT 'active' | Conversation status |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update |

**Indexes:** `idx_chat_conversations_family_id`, `idx_chat_conversations_user_id`, `idx_chat_conversations_type`, `idx_chat_conversations_status`

---

### 11. chat_messages

Individual messages within chat conversations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Unique identifier |
| `conversation_id` | INTEGER | NOT NULL, FK, ON DELETE CASCADE | Parent conversation |
| `role` | TEXT | NOT NULL | Sender: 'user', 'assistant', 'system', 'tool' |
| `content` | TEXT | NOT NULL | Message content |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Message timestamp |

**Indexes:** `idx_chat_messages_conversation_id`, `idx_chat_messages_timestamp`

---

## Architecture Notes

### Multi-Family Isolation
All data tables include a `family_id` column. Queries are always filtered by family to ensure complete data separation. The `family_id` is derived from the authenticated user's session.

### Encryption
- **IBANs** stored in `accounts.iban_encrypted` use AES-256-CBC encryption (`src/lib/encryption.ts`)
- **AI API keys** stored in `family_settings.ai_api_key_encrypted` use the same encryption
- Encryption key is loaded from `ENCRYPTION_KEY` environment variable (minimum 32 characters)

### Deduplication
- Transactions use `source_hash` (SHA-256 of import-specific fields) with a unique constraint on `(account_id, source_hash)` to prevent duplicate CSV imports
- The hash is computed in `src/lib/hash.ts`

### Cascade Deletes
- Deleting an account cascades to its **balances** and **transactions**
- Deleting a chat conversation cascades to its **messages**
- Deleting a transaction category sets the `category_id` to NULL on related transactions

### Automatic Migrations
All schema changes are managed through `src/lib/database.ts` using:
- `CREATE TABLE IF NOT EXISTS` for initial creation
- `ALTER TABLE` with `PRAGMA table_info` guards for additive migrations
- Migrations run automatically on every application startup, making them safe for upgrades
