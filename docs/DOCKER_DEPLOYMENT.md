# Docker Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Basic understanding of environment variables

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values
# Generate secure keys with: openssl rand -hex 32
```

### 2. Deploy with Docker Compose
```bash
# Build and start the application
npm run docker:up

# View logs
npm run docker:logs

# Stop the application
npm run docker:down
```

### 3. Access the Application
- Application: http://localhost:3000
- Health check: http://localhost:3000/api/health

## Environment Variables

### Required Variables
- `ENCRYPTION_KEY`: 32-character key for IBAN encryption
- `SESSION_SECRET`: 32-character secret for session management

### Optional Variables
- `DATABASE_PATH`: SQLite database file path (default: ./data/wealth_tracker.db)
- `NODE_ENV`: Environment mode (default: production)
- `PORT`: Application port (default: 3000)

## Docker Commands

### Manual Docker Build
```bash
# Build image
npm run docker:build

# Run container with environment file
npm run docker:run
```

### Docker Compose Commands
```bash
# Start in background
docker-compose up -d

# Start with build
docker-compose up --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart services
docker-compose restart
```

## Data Persistence

The SQLite database is stored in a Docker volume named `wealth_data`. This ensures:
- Data persists between container restarts
- Database is not lost when updating the application
- Easy backup and restore capabilities

### Backup Database
```bash
# Create backup
docker run --rm -v wealth_data:/data -v $(pwd):/backup alpine cp /data/wealth_tracker.db /backup/backup.db

# Restore backup
docker run --rm -v wealth_data:/data -v $(pwd):/backup alpine cp /backup/backup.db /data/wealth_tracker.db
```

## Production Deployment

### Security Checklist
- [ ] Generate strong encryption keys
- [ ] Use secure session secrets
- [ ] Enable HTTPS (reverse proxy recommended)
- [ ] Set up proper firewall rules
- [ ] Regular database backups
- [ ] Monitor application logs

### Recommended Production Setup
1. Use reverse proxy (nginx) for HTTPS
2. Set up automated backups
3. Configure monitoring and logging
4. Use Docker secrets for sensitive data
5. Set up health monitoring

## Troubleshooting

### Common Issues
1. **Permission errors**: Ensure data directory has correct permissions
2. **Database locked**: Check if multiple instances are running
3. **Port conflicts**: Change port in docker-compose.yml
4. **Build failures**: Check Node.js version compatibility

### Logs and Debugging
```bash
# Application logs
docker-compose logs web-patrimonio

# Container status
docker-compose ps

# Enter container for debugging
docker-compose exec web-patrimonio sh
```

## Updates and Maintenance

### Updating Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up --build -d

# View logs to verify
docker-compose logs -f
```

### Database Migration
The application automatically creates and updates database schema on startup.