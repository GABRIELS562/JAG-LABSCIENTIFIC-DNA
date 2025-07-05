# Osiris Setup Instructions

## Current Issues & Solutions

### 1. **FSA File Problem**
The generated FSA files aren't compatible with Osiris's strict format requirements. 

### 2. **Alternative Solutions:**

#### **Option A: Use Osiris Built-in Test Data (Recommended)**
1. In Osiris, go to **File → Open** 
2. Look for any built-in example files or test data
3. Check if Osiris has a "Demo" or "Test" mode

#### **Option B: Download Real FSA Test Files**
You can download real FSA files from:
- NIST STR databases
- Forensic laboratories that share test data
- Academic resources

#### **Option C: Focus on LIMS Integration**
Since your LIMS system is the main focus:
1. Use the **LIMS electropherogram viewer** (which should work with our STR data)
2. Use **Osiris for reference only** (to see what a real analysis looks like)
3. Generate **PDF reports from LIMS** with the real genetic data

### 3. **Current LIMS Status:**
✅ Demo case `PAT-2025-DEMO` created with real STR data
✅ 18 loci (PowerPlex ESX 17) with proper inheritance patterns  
✅ PDF generation fixed
✅ Electropherogram viewer updated to use real data

### 4. **Next Steps:**
1. **Test the LIMS interface** at http://localhost:5174
2. **View the PAT-2025-DEMO case** to see the electropherogram
3. **Generate a PDF report** to test the complete workflow
4. **Use Osiris as reference** for understanding STR analysis

The LIMS system now contains real genetic data and should display proper electropherograms with actual allele peaks and inheritance patterns.