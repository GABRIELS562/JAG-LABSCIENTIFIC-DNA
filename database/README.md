# LIMS Database Management

This directory contains the database migration and seeding infrastructure for the LIMS application, providing comprehensive database management capabilities for enterprise-level deployment.

## 🏗️ Architecture

### Directory Structure
```
database/
├── migrations/                 # Database schema migrations
│   ├── 001_create_initial_schema.sql
│   ├── 002_add_advanced_features.sql
│   └── 003_add_compliance_features.sql
├── seeds/                      # Database seed data
│   ├── development/           # Development environment seeds
│   │   ├── 001_seed_users.sql
│   │   ├── 002_seed_clients.sql
│   │   └── 003_seed_samples_and_tests.sql
│   └── production/            # Production environment seeds
│       └── 001_seed_production_essentials.sql
├── backups/                   # Database backups (auto-generated)
├── migration-manager.js       # Migration management CLI tool
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- PostgreSQL 12+
- Environment variables configured

### Setup
```bash
# Install dependencies
npm install

# Check database connection
npm run db:health-check

# View migration status
npm run migrate:status

# Apply all migrations
npm run migrate

# Seed development data
npm run seed:dev

# Complete development setup
npm run db:setup
```

## 📋 Migration Management

### Migration Commands
```bash
# Check migration status
npm run migrate:status
node migration-manager.js status

# Apply all pending migrations
npm run migrate
node migration-manager.js migrate

# Dry run (preview without applying)
npm run migrate:dry-run
node migration-manager.js migrate --dry-run

# Apply migrations up to specific version
node migration-manager.js migrate 002

# Rollback a specific migration
npm run rollback 002
node migration-manager.js rollback 002

# Create new migration
npm run migrate:create add_new_feature "Add new feature table"
node migration-manager.js create add_new_feature "Add new feature table"
```

### Migration Features
- ✅ **Transactional Safety**: All migrations run in transactions
- ✅ **Automatic Backups**: Database backed up before each migration
- ✅ **Checksum Validation**: Prevents modified migrations from running
- ✅ **Rollback Support**: Safe rollback mechanisms
- ✅ **Dry Run Mode**: Preview changes without applying
- ✅ **Progress Tracking**: Detailed migration status and history

## 🌱 Database Seeding

### Seeding Commands
```bash
# Seed development environment
npm run seed:dev
node migration-manager.js seed development

# Seed staging environment
npm run seed:staging
node migration-manager.js seed staging

# Seed production environment (minimal data)
npm run seed:prod
node migration-manager.js seed production
```

### Seed Data Structure
- **Development**: Comprehensive test data with sample users, clients, and test results
- **Staging**: Production-like data for testing
- **Production**: Essential system configuration and admin user only

## 💾 Backup & Restore

### Backup Commands
```bash
# Create database backup
npm run backup
node migration-manager.js backup

# Create labeled backup
node migration-manager.js backup pre_deployment

# Restore from backup
node migration-manager.js restore ./backups/backup_file.sql
```

### Backup Features
- ✅ **Automatic Backups**: Created before migrations and on demand
- ✅ **Labeled Backups**: Custom labels for important backups
- ✅ **Retention Management**: Automatic cleanup of old backups
- ✅ **Point-in-Time Recovery**: Restore to any backup point

## 🔧 Database Management Scripts

### Utility Commands
```bash
# Complete database setup (migrate + seed)
npm run db:setup

# Reset database (backup + migrate + seed)
npm run db:reset

# Fresh installation (backup + migrate + seed)
npm run db:fresh

# Production setup (backup + migrate + production seed)
npm run db:production-setup

# Health check
npm run db:health-check

# Validate migrations and seeds
npm run db:validate

# Clean old backups
npm run db:clean
```

## 🏭 Production Deployment

### Pre-Deployment Checklist
1. **Environment Variables**:
   ```bash
   export DB_HOST=your-production-host
   export DB_PORT=5432
   export DB_NAME=lims_production
   export DB_USER=lims_user
   export DB_PASSWORD=secure_password
   export DB_SSL=true
   ```

2. **Database Setup**:
   ```bash
   # Run production setup
   npm run db:production-setup
   
   # Verify status
   npm run migrate:status
   ```

3. **Post-Deployment Tasks**:
   - Change admin password immediately
   - Update laboratory information
   - Configure SMTP settings
   - Setup monitoring and alerting

### Production Safety Features
- ✅ **Automatic Backups**: Pre-deployment backup creation
- ✅ **Rollback Capability**: Safe rollback to previous state
- ✅ **Compliance Ready**: GDPR, HIPAA, FDA compliance features
- ✅ **Audit Trails**: Comprehensive change tracking
- ✅ **Data Classification**: Automatic PII/PHI classification

## 🔐 Security & Compliance

### Security Features
- **Data Encryption**: Sensitive data encrypted at rest
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete audit trail
- **Data Classification**: Automatic PII/PHI identification

### Compliance Features
- **GDPR**: Data subject rights, consent management
- **HIPAA**: PHI protection, access controls
- **FDA CFR 21 Part 11**: Electronic signatures, audit trails
- **SOC2**: Security controls, monitoring

## 📊 Database Schema Overview

### Core Tables
- **users**: User accounts and authentication
- **clients**: Customer/patient information
- **samples**: Laboratory samples
- **genetic_analysis**: Genetic testing data
- **test_results**: Laboratory test results
- **reports**: Generated reports

### Advanced Features
- **workflow_templates**: Process automation
- **workflow_instances**: Process execution
- **batches**: Batch processing
- **equipment**: Laboratory equipment management
- **reagents**: Inventory management
- **qc_samples**: Quality control

### Compliance Tables
- **consent_records**: GDPR consent tracking
- **data_subject_requests**: Data subject rights
- **electronic_signatures**: FDA Part 11 compliance
- **compliance_audit_trail**: Regulatory audit trails
- **retention_policies**: Data retention management

## 🔄 Migration Workflow

### Development Workflow
1. **Create Migration**: `npm run migrate:create feature_name`
2. **Test Migration**: `npm run migrate:dry-run`
3. **Apply Migration**: `npm run migrate`
4. **Seed Data**: `npm run seed:dev`
5. **Validate**: Test application functionality

### Production Workflow
1. **Backup**: Automatic backup before migration
2. **Validate**: Dry run in staging environment
3. **Apply**: Run migrations in production
4. **Monitor**: Check application health
5. **Rollback**: If issues detected, rollback safely

## 🛠️ Troubleshooting

### Common Issues

**Connection Failed**
```bash
# Check database connectivity
npm run db:health-check

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER
```

**Migration Failed**
```bash
# Check migration status
npm run migrate:status

# Rollback if needed
npm run rollback <version>

# Restore from backup
node migration-manager.js restore ./backups/backup_file.sql
```

**Permission Errors**
```bash
# Ensure database user has required permissions
# GRANT ALL PRIVILEGES ON DATABASE lims_db TO lims_user;
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=true node migration-manager.js status
```

## 📈 Performance Considerations

### Optimization Features
- **Indexes**: Comprehensive indexing strategy
- **Partitioning**: Large table partitioning support
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Performance-tuned queries

### Monitoring
- **Migration Timing**: Track migration performance
- **Backup Size**: Monitor backup storage
- **Query Performance**: Identify slow queries

## 🤝 Contributing

### Adding New Migrations
1. Use descriptive names and comments
2. Include rollback scripts when possible
3. Test thoroughly in development
4. Document any special requirements

### Seed Data Guidelines
- Use realistic but fake data
- Follow data privacy principles
- Include variety for testing
- Document data relationships

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl-best-practices.html)
- [Migration Best Practices](https://www.postgresql.org/docs/current/ddl-alter.html)
- [Backup and Recovery](https://www.postgresql.org/docs/current/backup.html)

---

This database management system provides enterprise-grade capabilities for database lifecycle management, ensuring data integrity, compliance, and operational excellence in production environments.