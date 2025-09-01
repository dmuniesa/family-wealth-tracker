# Family Wealth Tracker - Deployment Guide

## Production Setup

### Environment Variables
Create a `.env.production` file with:

```bash
# Database
DATABASE_PATH=./data/wealth_tracker.db

# Encryption (CHANGE THESE IN PRODUCTION!)
ENCRYPTION_KEY=your-secure-32-character-key-here!
SESSION_SECRET=your-secure-32-character-secret!!

# Security
NODE_ENV=production
```

### Database Setup
1. Ensure the `data` directory exists
2. The SQLite database will be created automatically on first API call

### Build and Start
```bash
npm run build
npm run start
```

### Security Checklist
- [ ] Change default encryption keys
- [ ] Set up HTTPS with SSL certificate
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Review and update dependencies

### Features Implemented
✅ User authentication with bcrypt password hashing
✅ IBAN encryption for sensitive data protection
✅ Account management (Banking & Investment)
✅ Balance tracking with historical data
✅ Dashboard with analytics and charts
✅ Data export to CSV
✅ Responsive design
✅ Session-based authentication
✅ Input validation and sanitization

### Accessing the Application
- Authentication: `/auth` (login/register)
- Dashboard: `/dashboard` (main overview)
- Accounts: `/accounts` (manage accounts)
- History: `/history` (view balance records)
- Settings: `/settings` (export data, family info)

The application is fully functional and ready for use by family members to track their wealth across multiple accounts.