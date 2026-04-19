# Family Wealth Tracker

<div align="center">
  <img src="public/logo/logotrans.png" alt="Family Wealth Tracker Logo" width="400" />
</div>


## 🎯 Project Overview
A comprehensive web application for family wealth tracking where multiple users share access to monitor banking accounts, investments, and debts over time. Track your complete financial picture with automated net worth calculations that account for both assets and liabilities.

## 🚀 Quick Start

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd family-wealth-track

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your encryption keys and OAuth credentials (optional for cloud backups)

# Start development server
npm run dev
```

### Docker Deployment
```bash
# Quick deployment
npm run docker:up

# Access application
open http://localhost:3000
```

## 🔧 Configuration

### Environment Variables
Required variables in `.env`:
```bash
# Core Configuration
DATABASE_PATH=./data/wealth_tracker.db
ENCRYPTION_KEY=your-32-char-encryption-key-here
SESSION_SECRET=your-32-char-session-secret-here

# Optional: Email Notifications (for weekly reports)
# SMTP Configuration (traditional email server)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Resend Configuration (modern email service - alternative to SMTP)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@yourdomain.com

# Optional: Cloud Storage (for backup feature)
DROPBOX_CLIENT_ID=your-dropbox-client-id
DROPBOX_CLIENT_SECRET=your-dropbox-client-secret
GOOGLE_DRIVE_CLIENT_ID=your-google-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-drive-client-secret
```

## 🏗️ Technical Stack
- **Frontend**: React with Next.js 15.5.9, Tailwind CSS + shadcn/ui components, Recharts for visualizations
- **Backend**: Next.js API routes with TypeScript
- **Database**: SQLite with encrypted IBAN storage
- **Authentication**: Session-based authentication with bcrypt encryption
- **Internationalization**: next-intl (English/Spanish support)
- **Security**: HTTPS, encrypted sensitive data, input validation
- **Deployment**: Docker with Docker Compose support

## 🔐 User Authentication & Authorization
- **Role-Based Access Control**: Three-tier system (Administrator, User, Guest)
- Email/password authentication with secure password recovery
- All family members share the same `family_id`
- Session-based authentication (Iron Session)
- Password hashing with bcrypt

## 🎨 Core Features

### 1. Account Management
- **Create Account**: Add banking, investment, or debt accounts with name, category, currency, and optional notes (IBAN required only for banking/investment accounts)
- **Edit Account**: Modify account details for all account types
- **Delete Account**: Remove account and all associated balance history
- **List Accounts**: Display all family accounts with easy identification via name (and IBAN for banking/investment accounts)
- **Debt Tracking**: Monitor mortgages, loans, and other liabilities alongside assets

### 2. Balance Tracking
- **Add Balance**: Manual entry of balance amount with date
- **Edit Balance**: Modify historical balance entries
- **Delete Balance**: Remove balance records
- **Balance History**: View complete timeline of all balance entries

### 3. Dashboard & Analytics
**Main Dashboard displays**:
- Total banking accounts balance
- Total investment accounts balance
- Total debt balance (highlighted in red)
- Net Worth calculation (Assets - Debts)
- Month-over-month change percentage

**Charts & Visualizations**:
- Line/area chart showing net worth evolution over time
- Pie/donut chart showing asset vs debt distribution with color coding
- Historical trends with comprehensive debt tracking
- Visual distinction between assets (blue/green) and debts (red)

### 4. Data Management
- **Export**: Download comprehensive family financial data as CSV format
- **Import**: Upload balance data from CSV files with automatic account matching
- **Family Management**: Share Family ID for multi-user access
- **Multilingual Support**: Full interface in English and Spanish

### 5. Backup & Recovery
- **Manual Backups**: Create database backups on-demand
- **Scheduled Backups**: Automated backup creation (daily/weekly/monthly)
- **Cloud Storage**: Automatic upload to Dropbox or Google Drive
- **Backup Management**: Download, restore, and delete backup files
- **Secure Storage**: OAuth 2.0 authentication for cloud providers

### 6. Family Member Management
- **Member Overview**: View all family members and their registration details
- **Registration Control**: Enable/disable new member registration for family access
- **Member Removal**: Remove family members (except current user) with confirmation
- **Member Statistics**: Display total family member count and status indicators
- **User Identification**: Clear marking of current user in member listings

### 7. Weekly Email Reports & Notifications
- **Automated Reports**: Weekly financial summaries sent via email with configurable scheduling
- **Unified Email Service**: Support for both SMTP and Resend email providers with seamless switching
- **SMTP Configuration**: Traditional email server setup with connection testing and validation
- **Resend Integration**: Modern email delivery service with excellent deliverability and developer-friendly setup
- **Provider Management**: Easy switching between email providers with real-time status monitoring
- **Report Customization**: Choose day, time, timezone, and include charts in reports
- **Notification History**: Track all sent reports with success/failure status and provider information
- **User Preferences**: Individual opt-in/opt-out for weekly report subscriptions
- **Multi-language Support**: Email templates available in English and Spanish
- **Test Functionality**: Send test emails to verify configuration before scheduling reports
- **Provider Status**: Visual indicators showing active provider and configuration status

### 8. Debt Amortization & Payment Tracking
- **Loan Configuration**: Set up APR rate (TAE), payment amounts, and loan terms for debt accounts
- **Automatic Updates**: Monthly interest application on the 1st of each month (optional per debt)
- **Payment Methods**: Support for French method (fixed payments) and interest-only loans
- **Payment Recording**: Track manual payments with automatic principal/interest breakdown
- **Amortization Schedules**: Generate complete payment schedules showing remaining balance over time
- **Progress Tracking**: Monitor remaining months to payoff and total interest calculations
- **Payment History**: Detailed transaction history distinguishing between automatic updates, manual entries, and payments

### 9. User Management & Administration
- **System-Wide User Management**: View and manage all users across all families in the database with comprehensive oversight
- **Admin Dashboard**: Dedicated administrative section with tabbed interface for system management and multi-service configuration
- **Global User Operations**: Full CRUD operations for all user accounts in the system, not just family members
- **Cross-Family Management**: Administrators can manage users from any family with proper logging and safeguards
- **User Statistics Dashboard**: Real-time statistics showing total users, administrators, regular users, and unique families
- **Enhanced User Interface**: Improved table with family ID identification, advanced search, and role management
- **User Creation**: Create new user accounts with email, name, role, family assignment, and secure password
- **User Editing**: Modify existing user details including cross-family operations with validation
- **User Deletion**: Remove users with intelligent safeguards (prevent deleting last admin per family)
- **Role Management**: Three-tier system (Administrator, User, Guest) with global role assignment capabilities
- **Advanced Search & Filtering**: Search users by name, email, role, or family ID with real-time filtering
- **Family Identification**: Clear family ID badges for easy identification of user family membership
- **Security Validations**: Email uniqueness checking, password strength requirements, and role change restrictions
- **Safe Operations**: Protection against self-deletion and intelligent administrator role removal safeguards

## 🎛️ User Interface Requirements

### Layout
- Clean, minimalist design using Tailwind CSS + shadcn/ui
- Responsive design (desktop and mobile friendly)
- Sidebar navigation with main sections: Dashboard, Accounts, History, Backups, Members, Admin, Settings

### Enhanced UI Components
- **Portal-Based Dropdowns**: Select components render outside container bounds to prevent clipping issues
- **Improved Select Components**: Native dropdown implementation with proper positioning and accessibility
- **Real-time Value Display**: Select components show current values immediately on page load
- **Floating Menus**: Dropdown menus position correctly regardless of table or container overflow constraints

### Account Identification
- Display account name prominently
- Show IBAN for banking/investment accounts (debt accounts don't require IBAN)
- Color-coded categories: Banking (blue), Investment (green), Debt (red)
- Icons to distinguish account types (DollarSign, TrendingUp, CreditCard)

### Forms
- Simple, intuitive forms for adding/editing accounts and balances
- Date picker for balance entry
- Currency selector
- Form validation with clear error messages

## 🔒 Security Requirements
- IBAN numbers stored encrypted in database
- Password hashing with bcrypt
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 📱 User Experience Flow

### 1. Authentication
- Login page with email/password
- Registration for new family members (must use same family_id)
- Logout functionality

### 2. Main Dashboard
- Overview cards showing key metrics
- Interactive charts
- Quick action buttons (Add Account, Record Balance)

### 3. Account Management
- List view of all accounts with search/filter
- Account detail pages with balance history
- Add/Edit account forms

### 4. Balance Entry
- Quick balance entry from dashboard
- Batch balance entry for multiple accounts
- Historical balance editing interface

## ✅ Implemented Features
- **Complete Debt Tracking**: Full support for mortgage, loan, and liability management with amortization schedules
- **Smart Net Worth Calculation**: Automatic calculation of (Assets - Debts) with month-over-month tracking
- **Bank Transactions**: CSV import (B100, BBVA), AI categorization, analytics, batch operations, transfer detection
- **AI Chat Assistant**: Conversational interface with function calling for financial actions
- **Role-Based Access Control**: Three-tier permission system (Administrator, User, Guest)
- **Password Recovery**: Email-based reset with secure one-time tokens
- **Weekly Email Reports**: Automated financial summaries via SMTP or Resend
- **Backup & Recovery**: Manual/scheduled backups with Dropbox and Google Drive integration
- **System Logging**: Comprehensive operation monitoring with admin panel
- **Bilingual Interface**: Complete English and Spanish localization
- **Docker Deployment**: Production-ready containerization with HTTPS and Cloudflare Tunnel support
- **Automatic Migrations**: Seamless database schema updates on startup

## 🎯 Success Criteria
- ✅ Family members can easily identify and manage all account types including debts
- ✅ Intuitive debt tracking with clear visual distinction from assets
- ✅ Accurate net worth calculation accounting for liabilities
- ✅ Clear visual representation of complete financial picture
- ✅ Secure handling of financial data with encryption
- ✅ Responsive design works on all devices
- ✅ Data export functionality for external analysis
- ✅ Multi-language support for international families

## 📖 Documentation

For detailed setup and deployment guides, see the [documentation directory](docs/).
- [Data Model & Database Schema](docs/DATA_MODEL.md) - Complete schema with all 11 tables

## 📊 Database Schema

For the complete schema with all columns, constraints, indexes, and relationships, see [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

### Summary of Tables (11 total)

| Table | Purpose | Key Relationships |
|---|---|---|
| `users` | User accounts with roles | family_id groups users |
| `accounts` | Banking, Investment, Debt accounts | family_id, amortization fields for debt |
| `balances` | Historical balance records | account_id (cascade delete), balance_type |
| `transactions` | Bank transactions with AI categorization | account_id, family_id, category_id, source_hash (unique) |
| `transaction_categories` | Categories with AI descriptions | family_id, type (income/expense/both/non_computable) |
| `transfer_rules` | Auto-transfer detection rules | family_id, rule_type + pattern + field |
| `family_settings` | AI config per family | family_id (unique), encrypted API key |
| `system_logs` | Operation logging | family_id, user_id, level, category, status |
| `password_reset_tokens` | Password recovery tokens | user_id, token_hash (unique), expires_at |
| `chat_conversations` | AI chat sessions | family_id, user_id, type, status |
| `chat_messages` | Individual chat messages | conversation_id (cascade delete), role, content |


### Cloud Storage Setup (Optional)
To enable automatic backup uploads:

**Dropbox**:
1. Create app at [Dropbox Developers](https://www.dropbox.com/developers/apps)
2. Add redirect URI: `https://your-domain.com/api/auth/dropbox/callback`
3. Add client ID and secret to environment variables

**Google Drive**:
1. Create project at [Google Console](https://console.developers.google.com)
2. Enable Google Drive API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `https://your-domain.com/api/auth/google-drive/callback`
5. Add client ID and secret to environment variables

### Email Service Setup (Optional)
Choose between SMTP or Resend for email notifications:

**Resend (Recommended)**:
1. Create account at [Resend](https://resend.com)
2. Verify your domain (or use `onboarding@resend.dev` for testing)
3. Generate API key in dashboard
4. Add `RESEND_API_KEY` and `RESEND_FROM` to environment variables
5. Configure via Admin > Notifications > Resend tab

**SMTP (Traditional)**:
1. Use Gmail with app password or any SMTP server
2. Add SMTP credentials to environment variables
3. Configure via Admin > Notifications > SMTP tab

## 📋 Future Enhancements
- ~~Expense categorization and cash flow analysis~~ ✅ Implemented (see Transactions)
- ~~Automated bank integration (API)~~ ✅ Implemented (CSV import with auto-detection)
- ~~AI-powered financial assistant~~ ✅ Implemented (see AI Chat)
- ~~Password recovery~~ ✅ Implemented (email-based reset)
- Budget tracking and financial goals
- Multi-currency conversion with real-time rates
- Mobile app companion
- Advanced financial reports and debt-to-income ratios
- Backup encryption and versioning
- Investment portfolio analysis
- Cash flow projections and financial planning

### 10. Bank Transactions & AI Categorization
- **CSV Import**: Auto-detect and parse bank statements from multiple banks (B100/Santander, BBVA)
- **Two-Step Import**: Preview transactions before saving, with duplicate detection via SHA-256 hashing
- **Transfer Detection**: Rule-based system to identify internal transfers between own accounts (excluded from calculations)
- **AI Categorization**: Automatic expense/income categorization using OpenAI-compatible APIs (OpenAI, Ollama, z.ai, etc.)
- **20 Default Categories**: Groceries, Restaurants, Transport, Electronics, Sports Equipment, and more - each with AI descriptions
- **Manual Category Editing**: Change categories inline from the transaction list or via edit dialog
- **"Non-computable" Type**: Mark transactions to exclude from totals without deleting them
- **Monthly Analytics**: Bar charts showing expenses/income by category with month navigation
- **Configurable AI Provider**: Settings page with base URL, model, and API key management (supports local Ollama)
- **Batch Operations**: Bulk update categories, mark as transfers, delete multiple transactions
- See [docs/TRANSACTIONS.md](docs/TRANSACTIONS.md) for detailed documentation

### 11. AI Chat Assistant
- **Conversational Interface**: Chat with an AI assistant about your finances (admin page)
- **Function Calling**: AI can execute actions: get account details, update balances, fetch spending summaries
- **Financial Context**: AI has access to current balances, recent transactions, and monthly spending breakdowns
- **Persistent Conversations**: Chat history saved with title, status, and full message log
- **Multi-language**: AI responds in the user's language (Spanish or English)
- **Help Command**: Built-in `/help` command for available actions
- See [docs/AI-CHAT.md](docs/AI-CHAT.md) for detailed documentation

### 12. Password Recovery
- **Email-Based Reset**: Send password reset links via email using configured SMTP or Resend provider
- **Secure Tokens**: One-time use tokens with expiration (stored hashed in database)
- **Rate Limiting**: Prevents email enumeration attacks
- **Localized Templates**: Reset emails available in English and Spanish

### 13. System Logging
- **Comprehensive Logging**: Track operations across categories (debt updates, email, backup, auth, system)
- **Admin Panel**: Dedicated system logs tab in admin dashboard
- **Performance Metrics**: Duration tracking for operations
- **Multi-Level**: Info, warn, error, and success log levels with filtering

---

## 🔒 Security Note
This application handles sensitive financial data including debt information. All security best practices are implemented:
- IBAN encryption at rest
- Secure session management
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection