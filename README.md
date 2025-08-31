# Family Wealth Tracker

## 🎯 Project Overview
A comprehensive web application for family wealth tracking where multiple users share access to monitor banking accounts, investments, and debts over time. Track your complete financial picture with automated net worth calculations that account for both assets and liabilities.

## 🏗️ Technical Stack
- **Frontend**: React with Next.js 15.5.2, Tailwind CSS + shadcn/ui components, Recharts for visualizations
- **Backend**: Next.js API routes with TypeScript
- **Database**: SQLite with encrypted IBAN storage
- **Authentication**: Session-based authentication with bcrypt encryption
- **Internationalization**: next-intl (English/Spanish support)
- **Security**: HTTPS, encrypted sensitive data, input validation
- **Deployment**: Docker with Docker Compose support

## 📊 Database Schema

### Users Table
```sql
- id (Primary Key)
- email (Unique)
- password_hash
- name
- family_id (Foreign Key - all users share same family_id)
- created_at
```

### Accounts Table
```sql
- id (Primary Key)
- family_id (Foreign Key)
- name (e.g., "Santander Payroll Account")
- category (ENUM: "Banking", "Investment", "Debt")
- currency (e.g., "EUR", "USD")
- iban_encrypted (Full IBAN encrypted)
- notes (Optional text field)
- created_at
- updated_at
```

### Balances Table
```sql
- id (Primary Key)
- account_id (Foreign Key)
- amount (Decimal)
- date (Date of balance record)
- created_at
- updated_at
```

## 🔐 User Authentication & Authorization
- All users have identical permissions (no role hierarchy)
- Email/password authentication
- All family members share the same `family_id`
- Session-based authentication

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

## 🎛️ User Interface Requirements

### Layout
- Clean, minimalist design using Tailwind CSS + shadcn/ui
- Responsive design (desktop and mobile friendly)
- Sidebar navigation with main sections: Dashboard, Accounts, History, Backups, Settings

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
- **Complete Debt Tracking**: Full support for mortgage, loan, and liability management (no IBAN required)
- **Smart Net Worth Calculation**: Automatic calculation of (Assets - Debts)
- **Visual Debt Management**: Red-coded debt visualization in charts and dashboard
- **Trilingual Account Categories**: Banking, Investment, and Debt account types
- **Intelligent Form Validation**: IBAN required only for banking/investment accounts
- **Comprehensive Dashboard**: 5-card layout showing Banking, Investment, Debt, Net Worth, and Monthly Change
- **Enhanced Charts**: Pie charts with debt visualization and line charts tracking true net worth
- **Automatic Database Migration**: Seamless updates to existing databases
- **Bilingual Interface**: Complete English and Spanish translation support
- **Secure Data Handling**: Encrypted IBAN storage with proper input validation
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Docker Deployment**: Production-ready containerization with Docker Compose
- **Backup & Recovery System**: Complete backup functionality with cloud storage integration
- **Scheduled Backups**: Automated backup creation with configurable intervals
- **Cloud Storage Integration**: OAuth 2.0 authentication for Dropbox and Google Drive

## 🎯 Success Criteria
- ✅ Family members can easily identify and manage all account types including debts
- ✅ Intuitive debt tracking with clear visual distinction from assets
- ✅ Accurate net worth calculation accounting for liabilities
- ✅ Clear visual representation of complete financial picture
- ✅ Secure handling of financial data with encryption
- ✅ Responsive design works on all devices
- ✅ Data export functionality for external analysis
- ✅ Multi-language support for international families

## 🚀 Quick Start

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd web_patrimonio

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

# Optional: Cloud Storage (for backup feature)
DROPBOX_CLIENT_ID=your-dropbox-client-id
DROPBOX_CLIENT_SECRET=your-dropbox-client-secret
GOOGLE_DRIVE_CLIENT_ID=your-google-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-drive-client-secret
```

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

## 📋 Future Enhancements
- Email notifications for balance updates
- Budget tracking and debt payment goals
- Multi-currency conversion with real-time rates
- Mobile app companion
- Automated bank integration (API)
- Expense categorization and cash flow analysis
- Advanced financial reports and debt-to-income ratios
- Debt amortization schedules and payment tracking
- Backup encryption and versioning

---

## 🔒 Security Note
This application handles sensitive financial data including debt information. All security best practices are implemented:
- IBAN encryption at rest
- Secure session management
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection