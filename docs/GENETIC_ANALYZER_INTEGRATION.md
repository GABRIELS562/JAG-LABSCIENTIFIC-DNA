# Genetic Analyzer Integration Guide

## Overview
This LIMS integrates with Applied Biosystems 3130xl and 3500 genetic analyzers using real Osiris software for STR analysis and paternity testing.

## Supported Configurations

### 3130xl/3500 Genetic Analyzers
- **16-capillary array configuration**
- **G5 dye set (5-dye chemistry)**
  - FAM (Blue)
  - VIC (Green) 
  - NED (Yellow)
  - PET (Red)
  - LIZ (Orange) - Size standard

### STR Kit
- **PowerPlex ESX 17 System**
- **17 STR Loci analyzed:**
  - D3S1358, vWA, D16S539 (FAM)
  - AMEL, D8S1179, D21S11, D18S51 (VIC)
  - D2S441, D19S433, TH01, FGA (NED)
  - D22S1045, D5S818, D13S317, D7S820 (PET)
  - SE33, D12S391 (Additional loci)

## Export File Formats

### Supported Input Formats
1. **Tab-delimited text (.txt)**
2. **Comma-separated values (.csv)**
3. **FSA files (native genetic analyzer format)**

### Expected Columns
```
Sample_Name | Well | Dye | Locus | Allele | Size | Height | Area | Data_Point | Peak_Start | Peak_End | Comment
```

## Sample Workflow Status Tracking

The LIMS tracks samples through the following workflow states:

1. **sample_collected** - Initial state after sample registration
2. **pcr_ready** - Ready for PCR amplification
3. **pcr_batched** - Added to PCR batch (displays as "PCR Batched")
4. **pcr_completed** - PCR amplification completed
5. **electro_ready** - Ready for electrophoresis
6. **electro_batched** - Added to electrophoresis batch (displays as "Electro Batched")
7. **electro_completed** - Electrophoresis completed
8. **analysis_ready** - Ready for genetic analysis
9. **analysis_completed** - STR analysis completed

### Batch Display Logic
- **PCR Batch**: Shows "PCR Batched" when `workflow_status = 'pcr_batched'`
- **Electro Batch**: Shows "Electro Batched" when `workflow_status = 'electro_batched'`
- **Rerun Batch**: Shows "Rerun Batched" when `workflow_status = 'rerun_batched'`

## Test Data Files

### Location
```
/backend/test_data/genetic_analyzer_export_3130xl_g5_16cap.txt
/backend/test_data/genetic_analyzer_export_3130xl_g5_16cap.csv
```

### Content
- **3 samples**: Child (25_001), Father (25_002), Mother (25_003)
- **Complete STR profiles** with realistic allele calls
- **Size standard peaks** (ILS-600)
- **Quality metrics** (peak height, area, data points)

## Osiris Integration

### Installation Status
✅ **Osiris 2.16** installed and configured
✅ **PowerPlex ESX 17** kit configuration loaded
✅ **Real Osiris thresholds** and parameters active

### Thresholds Configuration
```javascript
{
  minRFU: 150,                    // Minimum peak height
  stutterThreshold: 0.15,         // 15% stutter ratio
  adenylationThreshold: 0.3,      // 30% adenylation ratio
  heterozygousImbalanceLimit: 0.5, // 50% imbalance limit
  alleleRFUOverloadThreshold: 5000 // Peak saturation threshold
}
```

### Analysis Capabilities
- **STR Profile Generation**: Automatic allele calling
- **Quality Assessment**: Peak quality and completeness metrics
- **Paternity Calculation**: PI (Paternity Index) and probability
- **Report Generation**: XML, CSV, and PDF outputs

## Usage Instructions

### 1. Prepare Genetic Analyzer Data
Export data from your 3130xl/3500 in tab-delimited or CSV format with the required columns.

### 2. Upload to LIMS
Use the genetic analysis module to upload your export files.

### 3. Process Analysis
The system will:
- Parse the export file
- Extract STR profiles using Osiris
- Calculate paternity statistics
- Generate comprehensive reports

### 4. Review Results
- View STR profiles for each sample
- Review paternity probability calculations
- Download analysis reports

## Testing Osiris Integration

Run the test script to verify everything is working:
```bash
node backend/test_osiris.js
```

Expected output:
```
🧬 Testing Osiris Integration...
✅ Osiris initialized successfully
   Version: Osiris 2.16
   Kit: PPESX17
   Workspace: /Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace
```

## Troubleshooting

### Common Issues

1. **Osiris fails to launch**
   - Check executable permissions: `chmod +x external/osiris_software/Osiris-2.16.app/Contents/MacOS/osiris`
   - Verify macOS security settings allow the app to run

2. **Missing configuration files**
   - Ensure PowerPlex ESX 17 configuration exists in Osiris installation
   - Check `/external/osiris_software/Osiris-2.16.app/Contents/MacOS/Config/Volumes/PPESX17/`

3. **Sample workflow status not updating**
   - Verify batch creation includes workflow status updates
   - Check database integrity with sample queries

### File Permissions
Ensure proper permissions on Osiris files:
```bash
chmod -R 755 external/osiris_software/Osiris-2.16.app/
```

## DevOps and SRE Relevance

This genetic analyzer integration demonstrates several key skills:

### DevOps Skills
- **Complex System Integration**: Connecting LIMS with specialized scientific software
- **File Processing Automation**: Handling multiple data formats from laboratory equipment
- **Workflow Orchestration**: Managing sample state transitions through complex processes
- **Error Handling**: Robust error handling for file parsing and analysis failures

### SRE Skills
- **Reliability**: Ensuring consistent analysis results with proper error recovery
- **Monitoring**: Tracking sample processing status and analysis completion
- **Performance**: Optimizing STR analysis for laboratory throughput requirements
- **Quality Assurance**: Implementing validation checks for genetic analysis accuracy

This integration showcases production-ready scientific software integration with proper error handling, monitoring, and workflow management - essential skills for both DevOps and SRE roles in biotechnology and scientific computing environments.