# LabScientific LIMS - Testing Guide

## 🚀 Application Access
- Frontend: http://localhost:5174
- Backend API: http://localhost:3001 (or 30011)

## 🔐 Test Credentials
| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| admin | LabDNA2025!Admin | Administrator | Full access |
| supervisor | LabDNA2025!Super | Supervisor | Lab management |
| analyst1 | LabDNA2025!Analyst | Staff | Analysis & reports |
| technician1 | LabDNA2025!Tech | Staff | Sample processing |
| client_portal | LabDNA2025!Client | Client | View results only |

## 📋 Testing Checklist

### 1. Authentication & Access Control
- [ ] **Login Page** (`/login`)
  - [ ] Login with admin credentials
  - [ ] Login with staff credentials
  - [ ] Login with client credentials
  - [ ] Test incorrect credentials
  - [ ] Test logout functionality
  - [ ] Verify role-based access

### 2. Main Dashboard Pages
- [ ] **Home Page** (`/`)
  - [ ] Dashboard widgets load
  - [ ] Quick stats display
  - [ ] Recent activities
  - [ ] Navigation menu works

- [ ] **Alternative Home** (`/home`)
  - [ ] Compare with main dashboard
  - [ ] Verify all features work

### 3. Sample Management
- [ ] **Client Registration** (`/client-register`)
  - [ ] Fill paternity test form
  - [ ] Submit sample information
  - [ ] Verify data saves to database

- [ ] **Sample Search** (`/sample-search`)
  - [ ] Search by sample ID
  - [ ] Search by patient name
  - [ ] Filter by status
  - [ ] Export results

- [ ] **Sample Management** (`/sample-management`)
  - [ ] View all samples
  - [ ] Edit sample details
  - [ ] Update workflow status
  - [ ] Bulk actions

### 4. Laboratory Workflow

#### PCR Processing
- [ ] **PCR Plate** (`/pcr-plate`)
  - [ ] Create new PCR batch
  - [ ] Assign samples to wells
  - [ ] View plate layout
  - [ ] Export plate configuration

- [ ] **PCR Batches** (`/pcr-batches`)
  - [ ] View all PCR batches
  - [ ] Filter by status
  - [ ] Mark batch complete

#### Electrophoresis
- [ ] **Electrophoresis Layout** (`/electrophoresis-layout`)
  - [ ] Create electrophoresis batch
  - [ ] Assign PCR products
  - [ ] Configure run parameters
  - [ ] Start analysis

- [ ] **Electrophoresis Batches** (`/electrophoresis-batches`)
  - [ ] View all batches
  - [ ] Monitor progress
  - [ ] View results

#### Reruns
- [ ] **Rerun Batches** (`/rerun-batches`)
  - [ ] Select failed samples
  - [ ] Create rerun batch
  - [ ] Track rerun status

- [ ] **Reruns Page** (`/reruns`)
  - [ ] View rerun history
  - [ ] Analyze failure patterns

### 5. Analysis & Results
- [ ] **Genetic Analysis** (`/genetic-analysis`)
  - [ ] Upload GeneMapper files
  - [ ] View STR profiles
  - [ ] Perform paternity calculations
  - [ ] Generate analysis reports

- [ ] **Analysis Summary** (`/analysis-summary`)
  - [ ] View completed analyses
  - [ ] Export results
  - [ ] Print summaries

- [ ] **Lab Results** (`/lab-results`)
  - [ ] View all results
  - [ ] Filter by date/status
  - [ ] Client access verification

### 6. Quality & Compliance
- [ ] **Quality Control** (`/quality-control`)
  - [ ] Run QC checks
  - [ ] View QC metrics
  - [ ] Generate QC reports
  - [ ] Flag out-of-range values

- [ ] **ISO 17025 Dashboard** (`/iso17025`)
  - [ ] View compliance status
  - [ ] Document control
  - [ ] Audit trail
  - [ ] Non-conformance tracking

### 7. Data Import/Export
- [ ] **Batch Completion** (`/batch-completion`)
  - [ ] Complete pending batches
  - [ ] Verify all samples processed
  - [ ] Generate completion reports

- [ ] **GeneMapper Import** (`/genemapper-import`)
  - [ ] Upload .fsa files
  - [ ] Parse electropherograms
  - [ ] Import STR data
  - [ ] Error handling

### 8. Reports
- [ ] **Reports** (`/reports`)
  - [ ] Generate paternity reports
  - [ ] Generate batch reports
  - [ ] Generate QC reports
  - [ ] PDF export
  - [ ] Email reports

### 9. System Features
- [ ] **Settings** (`/settings`)
  - [ ] Update profile
  - [ ] Change password
  - [ ] Configure notifications
  - [ ] System preferences

- [ ] **API Test** (`/api-test`) - Staff only
  - [ ] Test API endpoints
  - [ ] Verify responses
  - [ ] Check error handling

### 10. Real-time Features
- [ ] **WebSocket Notifications**
  - [ ] Sample status updates
  - [ ] Batch completion alerts
  - [ ] System notifications

- [ ] **Auto-refresh**
  - [ ] Dashboard updates
  - [ ] Status changes
  - [ ] New sample alerts

## 🧪 Test Scenarios

### Scenario 1: Complete Paternity Test Workflow
1. Register new client with 3 samples (child, mother, alleged father)
2. Create PCR batch with samples
3. Run electrophoresis
4. Import GeneMapper results
5. Perform paternity analysis
6. Generate and download report

### Scenario 2: Quality Control Check
1. Access QC module
2. Run control samples
3. Verify results within range
4. Document any deviations
5. Generate QC report

### Scenario 3: Batch Processing
1. Create batch with 96 samples
2. Process through PCR
3. Run electrophoresis
4. Handle failed samples (reruns)
5. Complete batch
6. Generate batch report

### Scenario 4: Client Portal Access
1. Login as client
2. Search for case
3. View results (restricted access)
4. Download report
5. Verify no access to lab features

## 🐛 Common Issues to Check

### Database
- [ ] Sample saves correctly
- [ ] Updates persist
- [ ] Search works properly
- [ ] No duplicate entries

### File Upload
- [ ] PDF upload works
- [ ] Image upload works
- [ ] GeneMapper files parse
- [ ] File size limits enforced

### Performance
- [ ] Pages load quickly
- [ ] No memory leaks
- [ ] Batch operations efficient
- [ ] Search responsive

### Security
- [ ] Role-based access works
- [ ] Session timeout
- [ ] XSS protection
- [ ] SQL injection prevention

### UI/UX
- [ ] Responsive design
- [ ] Dark mode toggle
- [ ] Form validation
- [ ] Error messages clear
- [ ] Loading indicators

## 📝 Issue Documentation

Use this format to document any issues:

```
Issue #: [Number]
Page/Feature: [Location]
Severity: [Critical/High/Medium/Low]
Description: [What happened]
Steps to Reproduce: [How to recreate]
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [If applicable]
```

## 🎯 Testing Progress

Mark each section as you complete testing:
- [ ] Authentication ✓
- [ ] Dashboard
- [ ] Sample Management
- [ ] PCR Workflow
- [ ] Electrophoresis
- [ ] Analysis
- [ ] Quality Control
- [ ] Reports
- [ ] Settings
- [ ] Real-time Features

## 🚦 Ready for Deployment?

Before deployment, ensure:
- [ ] All critical features tested
- [ ] No blocking bugs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Data integrity confirmed
- [ ] User acceptance testing complete

---
**Testing Started**: _____________
**Testing Completed**: ___________
**Tested By**: __________________
**Approved for Deployment**: ⬜ Yes ⬜ No