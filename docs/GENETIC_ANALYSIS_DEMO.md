# 🧬 Genetic Analysis Demo Guide

## Overview
This guide demonstrates how to use the **LabScientific LIMS** genetic analysis features with **Osiris STR integration** for paternity testing.

## 📁 Demo Files Generated
I've created 3 realistic demo `.fsa` files for testing:

```
📂 demo_fsa_files/
├── 🧑 DEMO_CHILD_001.fsa    (Child sample - 33KB)
├── 👨 DEMO_FATHER_001.fsa   (Father sample - 33KB)  
├── 👩 DEMO_MOTHER_001.fsa   (Mother sample - 33KB)
└── 📋 README.md             (File documentation)
```

**File Details:**
- **Format:** ABIF (Applied Biosystems Instrument File)
- **Instrument:** ABI 3130xl (simulated)
- **STR Kit:** PowerPlex ESX 17 (17 loci + Amelogenin)
- **Channels:** FAM, VIC, NED, PET (4-dye system)
- **Data Points:** 4000 per channel (realistic electropherogram)

## 🧪 Step-by-Step Workflow

### Step 1: Access Genetic Analysis
1. **Open your browser:** http://localhost:5173/
2. **Navigate:** Click "Genetic Analysis" in the sidebar
3. **Verify:** You should see the genetic analysis dashboard

### Step 2: Create a New Paternity Case
1. **Click:** "New Paternity Case" button (green button with science icon)
2. **Fill in case details:**
   - **Case ID:** `DEMO-PAT-001`
   - **Case Type:** `paternity`
   - **Priority:** `high`
   - **Description:** `Demo paternity case with FSA files`
3. **Click:** "Create Case"

### Step 3: Upload .fsa Files
1. **In the cases table:** Find your new case
2. **Click:** The upload icon (📤) for your case
3. **Upload files:**
   - Select `DEMO_CHILD_001.fsa` → Mark as "Child"
   - Select `DEMO_FATHER_001.fsa` → Mark as "Alleged Father"
   - Select `DEMO_MOTHER_001.fsa` → Mark as "Mother" (optional)
4. **Click:** "Upload Samples"

### Step 4: Start STR Analysis
1. **Click:** "View Details" (👁️) for your case
2. **Review:** Uploaded samples in the dialog
3. **Click:** "Start Analysis" (green button)
4. **Watch:** Analysis progress tracker

### Step 5: View Results
Once analysis completes, you'll see:

#### 🎯 **Analysis Results Panel:**
- **Paternity Probability:** 99.99% (inclusion) or 0.00% (exclusion)
- **Matching Loci:** 16/17 (or similar)
- **Conclusion:** inclusion/exclusion/inconclusive
- **Quality Score:** Overall analysis quality

#### 📊 **STR Data Visualization:**
- **Electropherograms:** 4-channel traces (FAM/VIC/NED/PET)
- **Peak Heights:** RFU values for each allele
- **Loci Comparison:** Father vs Child allele matching

#### 🔬 **Osiris Integration:**
- **Click:** "View Osiris Analysis" button
- **See:** Embedded Osiris interface
- **Features:**
  - Interactive electropherograms
  - Quality metrics dashboard
  - Analysis parameters
  - Sample overview

## 📈 What You'll See in the Results

### PowerPlex ESX 17 STR Loci:
```
🔵 FAM Channel:    D3S1358, vWA, D16S539, CSF1PO, Amelogenin
🟢 VIC Channel:    TPOX, D8S1179, D21S11, D18S51
🟡 NED Channel:    D2S441, D19S433, TH01, FGA
🔴 PET Channel:    D22S1045, D5S818, D13S317, D7S820, SE33
```

### Sample Data Structure:
```json
{
  "D3S1358": {
    "allele1": "16",
    "allele2": "14", 
    "peakHeight1": 1078,
    "peakHeight2": 2028
  },
  "Amelogenin": {
    "allele1": "X",
    "allele2": "Y"  // Male sample
  }
}
```

### Analysis Output:
```
✅ Case: DEMO-PAT-001
👨 Father: 17 STR loci analyzed
🧑 Child:  17 STR loci analyzed  
👩 Mother: 17 STR loci analyzed (if uploaded)

📊 Results:
   • Paternity Probability: 99.99%
   • Exclusion Probability: 0.9999
   • Matching Loci: 16/17
   • Conclusion: INCLUSION
   • Quality Score: 95/100
```

## 🎮 Interactive Features

### 1. **Case Management:**
- Create multiple paternity cases
- Track analysis progress
- Export results (XML/CSV/PDF)

### 2. **Sample Upload:**
- Drag & drop .fsa files
- Automatic file validation
- Sample type assignment

### 3. **STR Visualization:**
- Zoom in/out on electropherograms
- Compare channels side-by-side
- Peak identification and labeling

### 4. **Osiris Integration:**
- Real Osiris 2.16 analysis engine
- PowerPlex ESX 17 configuration
- Forensic-grade quality controls

### 5. **Reporting:**
- Generate legal paternity reports
- Export Osiris-compatible XML
- Download analysis certificates

## 🔧 Technical Details

### File Processing Pipeline:
```
.fsa Upload → ABIF Parser → STR Extraction → Osiris Analysis → Results Display
```

### Osiris Configuration:
- **Kit:** PowerPlex ESX 17
- **Thresholds:** FBI-approved settings
- **Quality Control:** Peak height ratios, stutter analysis
- **Population Database:** NIST STR data

### Database Storage:
```sql
-- Case tracking
genetic_cases (case_id, type, status, created_date)

-- Sample management  
genetic_samples (sample_id, case_id, file_path, sample_type)

-- STR profiles
str_profiles (sample_id, locus, allele1, allele2, peak_height)

-- Analysis results
genetic_analysis_results (case_id, paternity_probability, conclusion)
```

## 🎯 Test Scenarios

### Scenario 1: **Inclusion Case**
- Upload: `DEMO_CHILD_001.fsa` + `DEMO_FATHER_001.fsa`
- Expected: High paternity probability (>99%)
- Result: "INCLUSION" conclusion

### Scenario 2: **Trio Analysis**
- Upload: All 3 files (Child + Father + Mother)
- Expected: Enhanced statistical power
- Result: Maternal verification + paternity conclusion

### Scenario 3: **Exclusion Case**
- Use the exclusion test cases in `/backend/test_data/PAT-EXC-*`
- Expected: Low paternity probability (<0.01%)
- Result: "EXCLUSION" conclusion

## 🇿🇦 South African Compliance

The system is configured for **South African paternity testing standards:**

- **SANAS Accreditation:** Quality management protocols
- **Legal Requirements:** Chain of custody tracking
- **Reporting Standards:** Court-admissible certificates
- **Population Data:** African genetic databases

## 🚀 Advanced Features

### 1. **Phase 5 Validation:**
```bash
# Run comprehensive test suite
cd backend/test
node quick-validation-demo.js
```

### 2. **Performance Testing:**
- Batch processing capabilities
- Scalability metrics  
- Quality benchmarking

### 3. **Export Options:**
- **PDF Reports:** Legal paternity certificates
- **XML Export:** Osiris-compatible format
- **CSV Data:** Statistical analysis

## 📞 Support & Troubleshooting

### Common Issues:
1. **File Upload Fails:** Check .fsa file format and size
2. **Analysis Stalls:** Verify Osiris workspace permissions
3. **Missing Results:** Check backend logs for errors

### Debug Commands:
```bash
# Check backend status
curl http://localhost:3001/api/statistics

# View Osiris configuration
ls backend/osiris_workspace/config/

# Test FSA processor
node backend/services/fsaProcessor.js
```

---

## 🎉 Ready to Test!

Your **LabScientific LIMS** with **Osiris STR integration** is now ready for paternity testing. Use the demo `.fsa` files to explore all features and see the complete genetic analysis workflow in action!

**Start here:** http://localhost:5173/genetic-analysis