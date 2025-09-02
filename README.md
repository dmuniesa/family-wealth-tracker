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
-- Debt Amortization Fields (for Debt category accounts)
- apr_rate (Annual Percentage Rate as decimal)
- monthly_payment (Fixed monthly payment amount)
- loan_term_months (Original loan term)
- remaining_months (Months remaining to pay)
- payment_type (ENUM: "fixed", "interest_only")
- auto_update_enabled (Boolean for automatic updates)
- last_auto_update (Date of last automatic update)
- original_balance (Original loan amount)
- loan_start_date (When the loan started)
```

### Balances Table
```sql
- id (Primary Key)
- account_id (Foreign Key)
- amount (Decimal)
- date (Date of balance record)
- created_at
- updated_at
-- Payment Tracking Fields
- balance_type (ENUM: "manual", "automatic", "payment")
- interest_amount (Interest portion of payment/update)
- principal_amount (Principal portion of payment)
- payment_amount (Total payment amount)
- notes (Transaction description)
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

### 6. Family Member Management
- **Member Overview**: View all family members and their registration details
- **Registration Control**: Enable/disable new member registration for family access
- **Member Removal**: Remove family members (except current user) with confirmation
- **Member Statistics**: Display total family member count and status indicators
- **User Identification**: Clear marking of current user in member listings

### 8. Weekly Email Reports
- **Automated Reports**: Weekly financial summaries sent via email with configurable scheduling
- **SMTP Configuration**: Admin-level email server setup with connection testing
- **Report Customization**: Choose day, time, timezone, and include charts in reports
- **Notification History**: Track all sent reports with success/failure status
- **User Preferences**: Individual opt-in/opt-out for weekly report subscriptions
- **Multi-language Support**: Email templates available in English and Spanish

### 9. Debt Amortization & Payment Tracking
- **Loan Configuration**: Set up APR rate (TAE), payment amounts, and loan terms for debt accounts
- **Automatic Updates**: Monthly interest application on the 1st of each month (optional per debt)
- **Payment Methods**: Support for French method (fixed payments) and interest-only loans
- **Payment Recording**: Track manual payments with automatic principal/interest breakdown
- **Amortization Schedules**: Generate complete payment schedules showing remaining balance over time
- **Progress Tracking**: Monitor remaining months to payoff and total interest calculations
- **Payment History**: Detailed transaction history distinguishing between automatic updates, manual entries, and payments

### 7. User Management & Administration
- **Comprehensive User Management**: Full CRUD operations for family user accounts through admin interface
- **Admin Dashboard**: Dedicated administrative section with tabbed interface for system management
- **User Creation**: Administrators can create new family member accounts with email, name, role, and password
- **User Editing**: Modify existing user details including email, name, role, and optional password updates
- **User Deletion**: Remove family members with proper safeguards (cannot delete self or last administrator)
- **Role Management**: Three-tier system (Administrator, User, Guest) with role assignment and modification
- **User Search & Filtering**: Search users by name or email with real-time filtering
- **Security Validations**: Email uniqueness checking, password strength requirements, and role change restrictions
- **Safe Operations**: Protection against self-deletion and administrator role removal safeguards

## 🎛️ User Interface Requirements

### Layout
- Clean, minimalist design using Tailwind CSS + shadcn/ui
- Responsive design (desktop and mobile friendly)
- Sidebar navigation with main sections: Dashboard, Accounts, History, Backups, Members, Admin, Settings

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
- **Family Member Management**: Complete member administration with registration controls
- **Dynamic Registration Settings**: Toggle new user registration on/off for family access control
- **Member Administration**: View, manage, and remove family members with proper safeguards
- **Role-Based Access Control**: Three-tier permission system with Administrator, User, and Guest roles
- **Permission Management**: Administrators can assign and modify user roles with proper restrictions
- **Feature-Level Security**: Role-based access to backups, user management, and system settings
- **Copy Confirmation Feedback**: Visual confirmation when copying Family ID to clipboard
- **Weekly Email Notifications**: Automated weekly financial reports sent via email with customizable scheduling
- **Email Configuration**: SMTP setup with test functionality and notification history tracking
- **Debt Amortization System**: Advanced loan tracking with automatic monthly interest application
- **Payment Scheduling**: French method and interest-only payment calculations with full amortization schedules
- **Administrative User Management**: Complete user administration system with create, read, update, delete operations
- **Admin Interface**: Tabbed administrative dashboard combining notification management and user administration
- **User Management API**: RESTful endpoints for user CRUD operations with proper authentication and authorization
- **Form Validation**: Comprehensive client and server-side validation for user creation and editing
- **Password Management**: Secure password handling with optional updates and strength requirements

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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

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
- Budget tracking and financial goals
- Multi-currency conversion with real-time rates
- Mobile app companion
- Automated bank integration (API)
- Expense categorization and cash flow analysis
- Advanced financial reports and debt-to-income ratios
- Backup encryption and versioning
- Investment portfolio analysis
- Cash flow projections and financial planning
- Integration with external financial services

---

## 🔒 Security Note
This application handles sensitive financial data including debt information. All security best practices are implemented:
- IBAN encryption at rest
- Secure session management
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection