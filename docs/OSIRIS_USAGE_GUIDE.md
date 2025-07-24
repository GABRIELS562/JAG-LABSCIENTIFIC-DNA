# Osiris 2.16 Genetic Analyzer Integration - Complete Usage Guide

## Table of Contents
1. [Troubleshooting macOS Security Issues](#troubleshooting-macos-security-issues)
2. [Step-by-Step Usage Instructions](#step-by-step-usage-instructions)
3. [Viewing and Interpreting Results](#viewing-and-interpreting-results)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Manual Osiris Launch (Alternative)](#manual-osiris-launch-alternative)

---

## Troubleshooting macOS Security Issues

### Issue: Osiris Won't Launch Due to Security Restrictions

**Step 1: Check Security Settings**
```bash
# Check if app is quarantined
xattr -l /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app

# Remove quarantine if present
sudo xattr -r -d com.apple.quarantine /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app
```

**Step 2: Verify App Signature**
```bash
# Check code signing
codesign -v /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app

# Check security policy
spctl -a -t exec -vv /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app
```

**Step 3: Manual Security Authorization**
1. Go to **System Preferences → Security & Privacy → General**
2. If you see "Osiris was blocked from opening", click **"Open Anyway"**
3. Or manually allow: **System Preferences → Security & Privacy → Privacy → Developer Tools**

**Step 4: Alternative Launch Method**
```bash
# Try launching directly from Terminal
open /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app
```

---

## Step-by-Step Usage Instructions

### Phase 1: Access the Genetic Analysis Interface

1. **Open the LIMS Application**
   - Navigate to: `http://localhost:5173` (or your frontend URL)
   - Click on **"Genetic Analysis"** in the navigation menu

2. **Locate Case PAT-2025-004**
   - You should see the case in the cases list
   - Status: "Queued"
   - Priority: 5

### Phase 2: Launch Osiris

3. **Initialize Osiris Workspace**
   ```bash
   # Test the initialization endpoint
   curl -X POST http://localhost:3001/api/genetic-analysis/initialize-osiris
   ```

4. **Launch Osiris GUI**
   - Click the **"Launch Osiris"** button in the LIMS interface
   - Or use the API endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/genetic-analysis/launch-osiris \
     -H "Content-Type: application/json" \
     -d '{"caseId":"PAT-2025-004"}'
   ```

5. **Verify Workspace Setup**
   - **Input Directory**: `/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input`
   - **Output Directory**: `/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/output`
   - **Test Files Available**:
     - `genetic_analyzer_export_3130xl_g5_16cap.txt`
     - `genetic_analyzer_export_3130xl_g5_16cap.csv`

### Phase 3: Configure Osiris Analysis

6. **In Osiris GUI, Set Analysis Parameters**
   - **Input Directory**: Should be pre-filled with workspace input path
   - **Output Directory**: Should be pre-filled with workspace output path
   - **Kit**: Select **"PowerPlex ESX 17"** (PPESX17)
   - **Population**: Select **"South African"** or your preferred population
   - **Minimum RFU**: 150 (recommended)

7. **Analysis Settings**
   - **Operating Procedure Name**: `Paternity Analysis`
   - **Internal Lane Standard**: `ILS-600` (G5 dye set)
   - **Minimum RFU**: 150
   - **Analysis Parameters**:
     - Stutter Threshold: 15%
     - Adenylation Threshold: 30%
     - Heterozygous Imbalance: 50%

### Phase 4: Run Analysis

8. **Start Analysis**
   - Click **"Analyze"** in Osiris
   - Select input files from the workspace input directory
   - Monitor progress in the Osiris GUI

9. **Monitor Progress**
   - Use the LIMS Analysis Progress Tracker
   - Check queue status: `http://localhost:3001/api/genetic-analysis/queue-status`

### Phase 5: Review Results

10. **Check Analysis Completion**
    - Results will appear in the output directory
    - Expected output files:
      - `*.xml` - Analysis results
      - `*.osr` - Osiris sample results
      - `*.plt` - Plot files
      - `*.tab` - Tabular data

---

## Viewing and Interpreting Results

### In Osiris GUI

1. **Open Results Tab**
   - View STR profiles for each sample
   - Check allele calls and peak heights
   - Review quality metrics

2. **Export Results**
   - File → Export → XML
   - File → Export → Text Report
   - File → Export → CODIS Report

### In LIMS Interface

3. **View Case Results**
   - Navigate to the case in genetic analysis interface
   - Click **"View Results"** 
   - Or API endpoint:
   ```bash
   curl http://localhost:3001/api/genetic-analysis/cases/PAT-2025-004/results
   ```

4. **Generate Reports**
   - Click **"Generate Report"** in the LIMS
   - Select report type: Full Report or Certificate
   - Download PDF report

### Result Interpretation

5. **STR Profile Analysis**
   - **Child Sample (25_001)**: Complete STR profile with 17 loci
   - **Father Sample (25_002)**: Complete STR profile with 17 loci  
   - **Mother Sample (25_003)**: Complete STR profile with 17 loci

6. **Paternity Statistics**
   - **Paternity Index (PI)**: Calculated for each locus
   - **Combined Paternity Index (CPI)**: Overall paternity likelihood
   - **Probability of Paternity**: Percentage probability
   - **Conclusion**: Inclusion, Exclusion, or Inconclusive

---

## Common Issues and Solutions

### Issue 1: "Osiris won't launch"
**Solution**:
```bash
# Remove quarantine and try again
sudo xattr -r -d com.apple.quarantine /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app
open /Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app
```

### Issue 2: "Input/Output directories not found"
**Solution**:
```bash
# Manually create workspace directories
mkdir -p /Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/{input,output,config,temp}

# Copy test data
cp /Users/user/LABSCIENTIFIC-LIMS/backend/test_data/*.txt /Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input/
cp /Users/user/LABSCIENTIFIC-LIMS/backend/test_data/*.csv /Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input/
```

### Issue 3: "No test data available"
**Solution**:
```bash
# Check if test files exist
ls -la /Users/user/LABSCIENTIFIC-LIMS/backend/test_data/
ls -la /Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input/

# If missing, the files should contain STR data for 3 samples with PowerPlex ESX 17 kit
```

### Issue 4: "Analysis fails in Osiris"
**Solution**:
- Check file format is compatible (.fsa, .txt, .csv)
- Verify kit selection matches data (PowerPlex ESX 17)
- Ensure minimum RFU threshold is appropriate (150)
- Check that G5 dye set is selected

---

## Manual Osiris Launch (Alternative)

If the automated launch fails, use manual method:

### Method 1: Terminal Launch
```bash
# Navigate to LIMS directory
cd /Users/user/LABSCIENTIFIC-LIMS

# Run the launch script
bash launch_osiris.sh

# Or launch directly
open external/osiris_software/Osiris-2.16.app
```

### Method 2: Manual GUI Setup
1. **Open Osiris Manually**
   - Double-click `Osiris-2.16.app` in Finder
   - Go to Applications and find Osiris

2. **Configure Directories Manually**
   - Input Directory: `/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input`
   - Output Directory: `/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/output`

3. **Load Test Data**
   - Navigate to input directory in Osiris
   - Select test files: `genetic_analyzer_export_3130xl_g5_16cap.txt`

---

## Quick Test Commands

### Test Workspace Status
```bash
curl http://localhost:3001/api/genetic-analysis/workspace-status | jq
```

### Test Osiris Launch
```bash
curl -X POST http://localhost:3001/api/genetic-analysis/launch-osiris \
  -H "Content-Type: application/json" \
  -d '{"caseId":"PAT-2025-004"}' | jq
```

### Check Queue Status
```bash
curl http://localhost:3001/api/genetic-analysis/queue-status | jq
```

### View Case Results
```bash
curl http://localhost:3001/api/genetic-analysis/cases/PAT-2025-004/results | jq
```

---

## Support Information

- **Osiris Version**: 2.16
- **Kit**: PowerPlex ESX 17
- **Genetic Analyzers**: ABI 3130xl, 3500xL
- **Dye Set**: G5 (5-dye chemistry)
- **File Formats**: .fsa, .txt, .csv

For additional support, refer to:
- `OsirisHelp.pdf` in the Osiris application directory
- Test data documentation in `/backend/test_data/`
- LIMS genetic analysis documentation