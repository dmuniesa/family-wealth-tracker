# Family Wealth Tracker - Requirements Specification

## 🎯 Project Overview
Build a web application for family wealth tracking where multiple users share access to a single family account to monitor banking and investment accounts over time.

## 🏗️ Technical Stack
- **Frontend**: React with Next.js, Tailwind CSS + shadcn/ui components, Recharts for charts
- **Backend**: Node.js with Express (or Python FastAPI)
- **Database**: SQLite
- **Authentication**: Email/password with bcrypt encryption
- **Security**: HTTPS, encrypt sensitive data including IBAN numbers

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
- category (ENUM: "Banking", "Investment")
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
- **Create Account**: Add banking or investment accounts with name, category, currency, IBAN, and optional notes
- **Edit Account**: Modify account details
- **Delete Account**: Remove account and all associated balance history
- **List Accounts**: Display all family accounts with easy identification via name + IBAN

### 2. Balance Tracking
- **Add Balance**: Manual entry of balance amount with date
- **Edit Balance**: Modify historical balance entries
- **Delete Balance**: Remove balance records
- **Balance History**: View complete timeline of all balance entries

### 3. Dashboard & Analytics
**Main Dashboard displays**:
- Total banking accounts balance
- Total investment accounts balance
- Net Worth calculation (total assets)
- Month-over-month change percentage

**Charts & Visualizations**:
- Line/area chart showing net worth evolution over time
- Pie/donut chart showing current distribution (Banking vs Investment)
- Historical trends with date range filtering

### 4. Data Management
- **Export**: Download data as CSV/Excel format
- **Import** (Optional): Upload balance data from CSV files

## 🎛️ User Interface Requirements

### Layout
- Clean, minimalist design using Tailwind CSS + shadcn/ui
- Responsive design (desktop and mobile friendly)
- Sidebar navigation with main sections: Dashboard, Accounts, History, Settings

### Account Identification
- Display account name prominently
- Show IBAN for easy recognition
- Use icons or colors to distinguish Banking vs Investment accounts

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

## 🎯 Success Criteria
- Family members can easily identify accounts using names and IBAN
- Intuitive balance entry and editing workflow
- Clear visual representation of wealth evolution
- Secure handling of financial data with encryption
- Responsive design works on all devices
- Data export functionality for external analysis

## 📋 Optional Enhancements (Future Iterations)
- Email notifications for balance updates
- Budget tracking and goals
- Multi-currency conversion
- Mobile app companion
- Automated bank integration (API)
- Expense categorization
- Financial reports and insights

---

**Note**: This application handles sensitive financial data. Ensure all security best practices are implemented, including proper input validation, secure session management, and encrypted data transmission.