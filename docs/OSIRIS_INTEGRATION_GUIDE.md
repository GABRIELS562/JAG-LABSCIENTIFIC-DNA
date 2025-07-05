# Osiris Integration Guide

## Overview

This LIMS system has been integrated with **Osiris 2.16** for real STR analysis. The integration provides:

- ✅ **Interactive Electropherogram** with zoom, pan, and peak measurement
- ✅ **Correct STR Loci Count** - PowerPlex ESX 17 (17 loci + Amelogenin = 18 markers)
- ✅ **PDF Report Generation** with auto-open functionality
- ✅ **Batch Comments** displayed in genetic analyzer
- ✅ **Desktop Application** with native Osiris GUI integration

## How It Works

### 1. **Electron Desktop App**
The system runs as an Electron desktop application that integrates with the real Osiris software:

```bash
# Start development mode
npm run dev:all

# Start Electron with Osiris integration
npm run electron-dev

# Build desktop application
npm run build-electron
```

### 2. **Osiris Installation Detection**
When you first open the genetic analysis page, the system will:

1. **Automatically detect** Osiris 2.16 installation on your system
2. **Show installation dialog** if Osiris is not found
3. **Provide download link** to NCBI Osiris repository
4. **Allow manual selection** of Osiris installation path

### 3. **Sample Analysis Workflow**

#### Step 1: Create a Case
1. Navigate to "Genetic Analysis" page
2. Click "New Case" 
3. Fill case details (Case ID, type, priority)

#### Step 2: Upload FSA Files
1. Click "Upload Files" on the case
2. Select FSA files from your sequencer
3. System validates and processes files

#### Step 3: Start Osiris Analysis
1. Open case details dialog
2. Go to "STR Analysis" tab
3. Click "Start Osiris Analysis"
4. System will:
   - Create Osiris workspace for the case
   - Copy FSA files to workspace
   - Configure PowerPlex ESX 17 parameters
   - Launch real Osiris analysis

#### Step 4: Interactive Analysis
1. Click "Open Osiris GUI" to launch the real Osiris interface
2. **Full interactive capabilities**:
   - Zoom and pan electropherograms
   - Measure peak heights and areas
   - Adjust analysis parameters
   - Set allele calls manually
   - Review artifact detection

#### Step 5: Generate Reports
1. After analysis completion in Osiris
2. Click "Generate Report" in the LIMS
3. System automatically opens PDF report
4. Reports are saved and accessible in reports page

### 4. **Osiris Configuration**

The system uses PowerPlex ESX 17 kit configuration:
- **17 STR Loci**: D3S1358, vWA, D16S539, CSF1PO, TPOX, D8S1179, D21S11, D18S51, D2S441, D19S433, TH01, FGA, D22S1045, D5S818, D13S317, D7S820, SE33
- **Amelogenin**: For sex determination
- **Size Standard**: LIZ 600
- **Analysis Thresholds**: MinRFU 150, Stutter 0.15

### 5. **File Structure**

```
├── backend/
│   ├── osiris_software/         # Osiris 2.16 installation
│   ├── osiris_workspace/        # Case workspaces
│   └── services/
│       ├── osirisIntegration.js # Osiris service integration
│       └── reportGenerator.js   # PDF report generation
├── public/
│   ├── electron.js             # Main Electron process
│   └── preload.js              # IPC communication bridge
└── src/components/features/
    ├── OsirisIntegration.jsx   # Main Osiris UI component
    ├── OsirisWorkspaceManager.jsx # Workspace management
    └── GeneticAnalysis.jsx     # Analysis dashboard
```

### 6. **Key Features**

#### Real Osiris Integration
- Uses actual Osiris 2.16 executable
- Native file format support (.fsa, .hid)
- Real-time result monitoring
- Authentic STR analysis algorithms

#### Interactive Analysis
- Full zoom and pan capabilities
- Peak height measurement tools
- Manual allele calling
- Artifact review and editing
- Quality assessment tools

#### Automated Workflow
- Automatic workspace creation
- File organization and management
- Result parsing and import
- Report generation and distribution

### 7. **System Requirements**

#### For Development:
```bash
npm run dev:all        # Web version (limited functionality)
```

#### For Full Osiris Integration:
```bash
npm run electron-dev   # Desktop app with Osiris
```

**Requirements:**
- Osiris 2.16 installed on system
- Electron-compatible OS (Windows, macOS, Linux)
- FSA files from genetic analyzer

### 8. **Troubleshooting**

#### Osiris Not Found
1. Download Osiris 2.16 from: https://github.com/ncbi/osiris
2. Install according to platform instructions
3. Use "Select Installation" button to locate manually

#### FSA Files Not Loading
1. Ensure files are valid FSA format
2. Check file permissions
3. Verify PowerPlex ESX 17 compatibility

#### Analysis Not Starting
1. Verify Osiris installation is working
2. Check workspace permissions
3. Ensure sufficient disk space

### 9. **Production Deployment**

For production deployment, build and distribute the desktop application:

```bash
npm run build-electron
```

This creates platform-specific installers:
- **macOS**: `.dmg` file
- **Windows**: `.exe` installer  
- **Linux**: `.AppImage` file

## Support

For issues with:
- **LIMS functionality**: Check application logs
- **Osiris integration**: Verify Osiris installation
- **FSA file processing**: Ensure correct file format

The system provides comprehensive logging and error reporting for troubleshooting.