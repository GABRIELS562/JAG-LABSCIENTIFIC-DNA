# PostgreSQL Migration Plan for LIMS Backend

## Overview
This document outlines the migration strategy from SQLite to PostgreSQL for improved scalability, concurrent access, and production readiness.

## Current State Analysis

### SQLite Limitations Identified
1. **Concurrency**: Limited write concurrency for multiple users
2. **Scalability**: File-based storage limits horizontal scaling
3. **Advanced Features**: Missing advanced indexing, full-text search, JSON operators
4. **Backup/Recovery**: File-based backup is more complex in production
5. **Multi-user Access**: Writer locks can cause delays under load

### Migration Benefits
- **Better Concurrency**: MVCC (Multi-Version Concurrency Control)
- **Advanced Indexing**: GIN, GiST indexes for complex queries
- **JSON Support**: Native JSON operators for metadata fields
- **Full-Text Search**: Built-in text search capabilities
- **Connection Pooling**: Better resource management
- **Production Ready**: Industry-standard ACID compliance

## Migration Strategy

### Phase 1: Preparation (Week 1-2)
1. **Schema Conversion**
   - Convert SQLite schema to PostgreSQL
   - Add proper constraints and indexes
   - Handle data type differences
   - Implement connection pooling

2. **Configuration Management**
   - Add PostgreSQL configuration
   - Environment-based database selection
   - Connection string management

### Phase 2: Dual Database Support (Week 2-3)
1. **Database Abstraction Layer**
   - Create universal database interface
   - Support both SQLite and PostgreSQL
   - Gradual route migration

2. **Data Migration Tools**
   - Export/import utilities
   - Data validation scripts
   - Rollback procedures

### Phase 3: Testing & Validation (Week 3-4)
1. **Performance Testing**
   - Load testing with PostgreSQL
   - Query optimization
   - Index performance analysis

2. **Data Integrity Verification**
   - Cross-database validation
   - Backup/restore testing
   - Concurrent access testing

### Phase 4: Production Migration (Week 4-5)
1. **Cutover Strategy**
   - Maintenance window planning
   - Data synchronization
   - Rollback procedures

2. **Monitoring & Optimization**
   - Performance monitoring
   - Query optimization
   - Connection pooling tuning

## Technical Implementation

### 1. PostgreSQL Schema Conversion

```sql
-- samples table conversion
CREATE TABLE samples (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES test_cases(id),
    lab_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    relation VARCHAR(50) CHECK (relation IN ('child', 'alleged_father', 'mother')),
    status VARCHAR(50) DEFAULT 'pending',
    workflow_status VARCHAR(50) DEFAULT 'sample_collected',
    -- Add proper indexes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimized indexes
CREATE INDEX idx_samples_workflow_status ON samples(workflow_status);
CREATE INDEX idx_samples_lab_number ON samples(lab_number);
CREATE INDEX idx_samples_case_id ON samples(case_id);
CREATE INDEX idx_samples_created_at ON samples(created_at);

-- Full-text search index
CREATE INDEX idx_samples_fulltext ON samples USING gin(
    to_tsvector('english', name || ' ' || surname || ' ' || lab_number)
);
```

### 2. Connection Management

```javascript
// config/database.js
const { Pool } = require('pg');

const postgresConfig = {
  user: process.env.DB_USER || 'lims_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ashley_lims',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(postgresConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  end: () => pool.end()
};
```

### 3. Universal Database Interface

```javascript
// services/universalDatabase.js
class UniversalDatabase {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'sqlite'; // 'sqlite' or 'postgresql'
    this.initializeDatabase();
  }

  initializeDatabase() {
    if (this.dbType === 'postgresql') {
      this.db = require('../config/database');
    } else {
      this.db = require('./centralizedDatabase');
    }
  }

  async query(sql, params = []) {
    if (this.dbType === 'postgresql') {
      const result = await this.db.query(sql, params);
      return result.rows;
    } else {
      return this.db.raw(sql, params);
    }
  }

  async getSampleCounts() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN workflow_status IN ('sample_collected', 'pcr_ready') 
              AND batch_id IS NULL THEN 1 END) as pending
      FROM samples
    `;
    
    const result = await this.query(sql);
    return this.dbType === 'postgresql' ? result[0] : result[0];
  }
}
```

## Migration Commands

### 1. Data Export from SQLite
```bash
# Export all tables to CSV
npm run export-sqlite-data

# Validate data integrity
npm run validate-export
```

### 2. PostgreSQL Setup
```bash
# Create database and user
createdb ashley_lims
createuser lims_user -P

# Run schema migration
npm run migrate-postgresql-schema

# Import data
npm run import-postgresql-data
```

### 3. Validation Scripts
```bash
# Compare record counts
npm run validate-migration

# Test critical queries
npm run test-postgresql-queries

# Performance benchmark
npm run benchmark-postgresql
```

## Environment Configuration

### Development
```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_USER=lims_user
DB_PASSWORD=secure_password
DB_NAME=ashley_lims_dev
DB_PORT=5432
```

### Production
```env
DB_TYPE=postgresql
DB_HOST=production-db-host
DB_USER=lims_prod_user
DB_PASSWORD=production_secure_password
DB_NAME=ashley_lims_prod
DB_PORT=5432
DB_SSL=true
DB_POOL_SIZE=25
```

## Rollback Strategy

### Emergency Rollback
1. **Immediate Switch**: Change DB_TYPE back to 'sqlite'
2. **Data Sync**: Use latest SQLite backup
3. **Service Restart**: Minimal downtime with SQLite fallback

### Planned Rollback
1. **Data Export**: Export latest PostgreSQL data
2. **SQLite Import**: Import into updated SQLite schema
3. **Validation**: Ensure data integrity
4. **Switch**: Update environment configuration

## Performance Monitoring

### Key Metrics
- Connection pool utilization
- Query execution times
- Lock wait times
- Memory usage
- Disk I/O patterns

### Monitoring Tools
- PostgreSQL built-in statistics
- pg_stat_statements extension
- Connection pool metrics
- Application-level query timing

## Risk Mitigation

### Data Loss Prevention
- Full database backups before migration
- Transaction-level rollback capabilities
- Continuous data validation
- Parallel environment testing

### Performance Degradation
- Query optimization before migration
- Index strategy validation
- Connection pool tuning
- Load testing under realistic conditions

### Downtime Minimization
- Blue-green deployment strategy
- Database replication for cutover
- Automated rollback triggers
- Health check monitoring

## Timeline & Milestones

### Week 1
- [ ] PostgreSQL schema conversion
- [ ] Connection pooling implementation
- [ ] Universal database interface
- [ ] Basic migration scripts

### Week 2
- [ ] Data migration tools
- [ ] Validation scripts
- [ ] Environment configuration
- [ ] Development environment testing

### Week 3
- [ ] Load testing
- [ ] Performance optimization
- [ ] Production environment setup
- [ ] Backup/restore testing

### Week 4
- [ ] User acceptance testing
- [ ] Final performance validation
- [ ] Production migration planning
- [ ] Documentation completion

### Week 5
- [ ] Production migration execution
- [ ] Post-migration monitoring
- [ ] Performance tuning
- [ ] SQLite deprecation planning

## Success Criteria

### Performance
- Query response times < 100ms for 95% of requests
- Support for 50+ concurrent users
- Database connection pool efficiency > 80%

### Reliability
- 99.9% uptime during migration
- Zero data loss during migration
- Successful rollback capability within 15 minutes

### Scalability
- Support for 10x current data volume
- Horizontal scaling capability
- Efficient backup/restore operations

## Post-Migration Optimization

### Immediate (Week 1-2)
- Query performance analysis
- Index optimization
- Connection pool tuning
- Monitoring setup

### Medium-term (Month 1-3)
- Advanced indexing strategies
- Query optimization
- Caching implementation
- Archive data strategy

### Long-term (Month 3-6)
- Read replica setup
- Advanced PostgreSQL features
- Full-text search optimization
- Data partitioning strategy

---

This migration plan provides a comprehensive roadmap for transitioning from SQLite to PostgreSQL while maintaining system reliability and minimizing downtime.