# Fixing Osiris Setup for macOS

## The Problem
Your current Osiris 2.16 binary is failing because it was built for a different environment or is missing required dependencies.

## Solution: Build Osiris Properly

### Option 1: Quick Fix - Try Environment Setup
Set up the environment variables that Osiris expects:

```bash
# Set wxWidgets path
export WXHOME=/opt/homebrew/opt/wxwidgets
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
export PATH="/opt/homebrew/bin:$PATH"

# Try running Osiris with proper environment
/Applications/Osiris-2.16.app/Contents/MacOS/osiris
```

### Option 2: Build from Source (Recommended)
Based on the official instructions you provided:

1. **Download wxWidgets 3.0.5** (not the newer version from Homebrew):
```bash
cd ~/Downloads
curl -O https://github.com/wxWidgets/wxWidgets/releases/download/v3.0.5/wxWidgets-3.0.5.tar.bz2
tar xvf wxWidgets-3.0.5.tar.bz2
cd wxWidgets-3.0.5
mkdir build-cocoa
```

2. **Get Osiris source code**:
```bash
cd ~/Downloads
git clone https://github.com/ncbi/osiris.git
cd osiris
```

3. **Build wxWidgets with Osiris config**:
```bash
cp ~/Downloads/osiris/buildwx-osx/config.sh ~/Downloads/wxWidgets-3.0.5/build-cocoa/
cd ~/Downloads/wxWidgets-3.0.5/build-cocoa
sh config.sh
make install
```

4. **Build Osiris**:
```bash
cd ~/Downloads/osiris
export WXHOME=~/local/wxRelease
sh README
make
sh cpmac
```

### Option 3: Use Your LIMS System (Immediate Solution)
Since your LIMS is working perfectly with real STR data:

1. **Focus on the LIMS electropherogram** - it has real genetic data
2. **Generate PDF reports** from LIMS  
3. **Use Osiris as reference only** until properly built

## Current LIMS Status: ✅ WORKING
- Real STR profiles for 18 loci
- Proper inheritance patterns
- PDF report generation
- Complete paternity analysis workflow

The LIMS system is fully functional - Osiris is just an additional tool!