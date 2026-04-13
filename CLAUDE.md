# CLAUDE.md - Family Wealth Tracker

## Project Overview

Family Wealth Tracker - A Next.js application for tracking family wealth. Manages bank accounts, investments, debts, and bank transactions with AI-powered categorization.

## Tech Stack

- **Framework**: Next.js 15.5.9, React 19, TypeScript (strict mode)
- **Database**: SQLite3 (`data/wealth_tracker.db`) - migrations in `src/lib/database.ts`
- **Auth**: Iron sessions (`src/lib/auth.ts`)
- **i18n**: next-intl (locales: `en`, `es`) - files in `locales/en.json`, `locales/es.json`
- **UI**: Tailwind CSS v4, Radix UI, Lucide icons
- **Forms**: react-hook-form + Zod
- **Charts**: Recharts
- **Encryption**: AES-256-CBC for IBANs and API keys (`src/lib/encryption.ts`)

## Development

### Commands

```bash
npm run dev          # Dev with Turbopack (see Windows note below)
npx next dev         # Dev WITHOUT Turbopack (recommended on Windows)
npm run build        # Build with Turbopack
npm run build:prod   # Build without Turbopack (production)
npm run start        # Production server
npm run lint         # ESLint
```

### Windows Development

**Turbopack can fail on Windows** with "Jest worker encountered child process exceptions". Fix:
1. Use `npx next dev` instead of `npm run dev` (no `--turbopack` flag)
2. If it fails, clean cache: `rm -rf .next` and kill node processes: `taskkill //F //IM node.exe`
3. The project lives in a Dropbox folder - file locks can happen. Wait a few seconds if `rm -rf .next` fails, then retry.

### Environment Variables (.env.local)

```
ENCRYPTION_KEY=xxx        # 32+ chars for IBAN encryption
SESSION_SECRET=xxx        # 32+ chars for sessions
```

Optional: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`, `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `RESEND_API_KEY`

## Project Structure

```
src/
  app/
    [locale]/           # Pages with i18n (en, es)
      accounts/         # Account management
      transactions/     # Bank transactions (NEW)
        analytics/      # Monthly analytics page
      history/          # Balance history
      settings/         # Settings (includes AI config)
      dashboard/        # Dashboard
    api/                # API routes
      transactions/     # CRUD + import + categorize + analytics
      settings/ai/      # AI provider config
      auth/             # Login, register, me
  components/
    layout/             # Sidebar, MainLayout
    auth/               # Login/Register forms
    transactions/       # Import dialog, edit dialog
    ui/                 # Radix components (button, card, dialog, etc.)
  lib/
    database.ts         # SQLite init + migrations
    db-operations.ts    # Services: UserService, AccountService, BalanceService
    encryption.ts       # AES-256-CBC encrypt/decrypt
    auth.ts             # Session management
    parsers/            # CSV parsers (B100, BBVA) for bank transactions
    transaction-service.ts  # CRUD transactions, analytics
    category-service.ts     # Categories with ai_description
    transfer-rule-service.ts # Transfer detection rules
    ai-service.ts       # Compatible with OpenAI API (OpenAI, Ollama, z.ai)
    hash.ts             # SHA-256 deduplication
  types/index.ts        # TypeScript interfaces
locales/
  en.json, es.json      # Translations
```

## Code Patterns

- **Services**: Static classes (e.g. `UserService.createUser()`) in `src/lib/`
- **API routes**: `getSession()` for auth, Zod for validation, `NextResponse.json()` for response
- **Pages**: `"use client"`, `AuthGuard` + `MainLayout` wrapper, `useTranslations()`
- **Database migrations**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` with `PRAGMA table_info` guards
- **Path aliases**: `@/` = `src/`
- **Dynamic route params**: Next.js 15 uses `params: Promise<{ id: string }>` (await params)

## Key Database Tables

- `users` (id, email, password_hash, name, family_id, role)
- `accounts` (id, family_id, name, category[Banking|Investment|Debt], currency, iban_encrypted)
- `balances` (id, account_id, amount, date)
- `transactions` (id, account_id, family_id, category_id, amount, date, description, detail, is_transfer, source_hash)
- `transaction_categories` (id, family_id, name, type[income|expense|both|non_computable], icon, color, ai_description)
- `transfer_rules` (id, family_id, rule_type, pattern, field, is_active)
- `family_settings` (id, family_id, ai_api_key_encrypted, ai_base_url, ai_model)
- `system_logs` (id, timestamp, level, category, operation, status)

## CSV Import

Parsers in `src/lib/parsers/` support two bank formats:
- **B100**: comma delimiter, 8 columns, dot decimal separator
- **BBVA**: semicolon delimiter, 4 metadata rows, comma decimal separator

Auto-detection via `detectAndParse()` in `src/lib/parsers/index.ts`.

## Docker

```bash
npm run docker:build   # Build image
npm run docker:up      # Start with docker-compose
npm run docker:logs    # View logs
```
