# Documentation

This directory contains all the documentation for the Family Wealth Tracker application.

## Available Documentation

### Core Features
- **[AI Chat](AI-CHAT.md)** - AI assistant with function calling, financial context, and admin chat interface
- **[Transactions](TRANSACTIONS.md)** - Bank transactions: CSV import, AI categorization, analytics, batch operations, and transfer detection

### Deployment & Setup
- **[Docker Deployment](DOCKER_DEPLOYMENT.md)** - Complete Docker deployment guide
- **[General Deployment](DEPLOYMENT.md)** - General deployment instructions
- **[HTTPS Setup](HTTPS-SETUP.md)** - SSL/HTTPS configuration with nginx reverse proxy
- **[Data Model](DATA_MODEL.md)** - Database schema, tables, relationships, and architecture

### External Services
- **[Cloudflare Tunnel](CLOUDFLARE-TUNNEL.md)** - Configure Cloudflare Tunnel for secure external access

## Feature Overview

### Financial Management
- **Accounts** - Banking, Investment, and Debt accounts with multi-currency support
- **Balances** - Historical balance tracking with manual and automatic recording
- **Transactions** - Bank transaction import (B100, BBVA CSV), AI-powered categorization, analytics
- **Debt Tracking** - Amortization schedules, automatic monthly payments, payment scheduling
- **Transfer Detection** - Rule-based identification of internal transfers between accounts

### AI & Automation
- **AI Chat** - Conversational assistant with function calling (get accounts, update balances, spending summaries)
- **AI Categorization** - Automatic transaction categorization with confidence scores
- **Weekly Reports** - Automated email reports with financial summaries and net worth tracking
- **Password Recovery** - Email-based password reset with secure one-time tokens

### Administration
- **User Roles** - Administrator, User, and Guest roles with family-based isolation
- **System Logs** - Comprehensive operation logging with admin panel
- **Backup & Recovery** - Full backup/restore with cloud storage integration (Dropbox, Google Drive)
- **i18n** - Full English and Spanish localization

## Quick Navigation

### For Development
- See main [README.md](../README.md) for development setup and quick start
- See [Data Model](DATA_MODEL.md) for database schema and table definitions

### For Production
1. Start with [Docker Deployment](DOCKER_DEPLOYMENT.md)
2. Set up [HTTPS](HTTPS-SETUP.md) for secure access
3. Optionally configure [Cloudflare Tunnel](CLOUDFLARE-TUNNEL.md) for internet access

### Need Help?
All documentation includes step-by-step instructions and troubleshooting sections.
