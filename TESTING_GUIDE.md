# 🧬 JAG DNA Scientific LIMS - Complete Testing Guide

## 🚀 Quick Start Testing Commands

### Step 1: Start the Application
```bash
# Option A: Development Mode (with hot reload)
npm run dev
# App will run on http://localhost:5173 (or next available port)

# Option B: Production Preview (test the built version)
npm run build && npm run preview
# App will run on http://localhost:4173 (or next available port)
```

### Step 2: Start Backend (Optional - for full functionality)
```bash
# In a new terminal
cd backend
npm start
# Backend will run on http://localhost:3001
```

## 📋 Complete Forensic Workflow Testing Checklist

### 🏠 **1. Homepage / Dashboard**
**URL:** `http://localhost:5173/`

**Test:**
- [ ] Page loads without errors
- [ ] 5 metric cards display (Today's Submissions, Active Batches, In Process, Pending Reports, Completed)
- [ ] Forensic DNA Workflow Pipeline shows 6 stages with icons
- [ ] All workflow stage circles are visible in both light/dark mode
- [ ] Click each workflow stage - should navigate to correct page
- [ ] Dark mode toggle works (top right)
- [ ] Sidebar navigation works
- [ ] Quick Actions buttons are clickable

---

### 👥 **2. Sample Submission (Client Registration)**
**URL:** `http://localhost:5173/register-client`

**Test Workflow:**
1. Click "New Registration" button or navigate via sidebar
2. Fill in test data:
   ```
   Case ID: TEST-2024-001
   Client Name: John Doe
   Sample Type: Buccal Swab
   Number of Samples: 3 (Child, Mother, Alleged Father)
   ```
3. Submit form
4. Verify success message appears
5. Check that sample is added to queue

---

### 🧪 **3. DNA Extraction**
**URL:** `http://localhost:5173/dna-extraction`

**Test Workflow:**
1. Navigate to DNA Extraction from sidebar or workflow
2. View pending samples for extraction
3. Click "Start Extraction" on a sample batch
4. Watch progress simulation
5. Verify batch moves to "Completed" status
6. Check extraction metrics display

---

### 🔬 **4. PCR Amplification**
**URL:** `http://localhost:5173/pcr-plate`

**Test Workflow:**
1. Navigate to PCR Plate Setup
2. View 96-well plate layout
3. Click on wells to assign samples
4. Add controls:
   - Well A1-A3: Positive controls
   - Well H10-H12: Negative controls
5. Click "Start PCR Run"
6. Verify thermocycler simulation shows:
   - Initial denaturation: 95°C for 11 min
   - 30 cycles of amplification
   - Final extension: 60°C for 60 min

**PCR Batches Page:** `http://localhost:5173/pcr-batches`
- View all PCR runs
- Check batch status
- Export batch data

---

### ⚡ **5. Capillary Electrophoresis**
**URL:** `http://localhost:5173/electrophoresis`

**Test Workflow:**
1. Navigate to Electrophoresis Layout
2. Select a PCR batch to load
3. View 3500 Genetic Analyzer simulation
4. Verify parameters:
   - Injection voltage: 1.6 kV for 10 seconds
   - Run voltage: 15 kV
   - Run time: 1500 seconds
   - Temperature: 60°C
   - Polymer: POP-4
5. Start run and watch progress
6. Verify FSA file generation simulation

---

### 📊 **6. OSIRIS Analysis** ⭐ (Most Important)
**URL:** `http://localhost:5173/osiris-analysis`

**Test Workflow:**
1. Navigate to OSIRIS Analysis
2. Verify header shows:
   - "OSIRIS STR Analysis System v2.17"
   - PowerPlex ESX 17 chip
   - LIZ 500 Size Standard chip
   - 3500 Genetic Analyzer chip
3. Click "Import FSA Files" button
4. Select an electrophoresis batch or upload test files
5. Click "Start OSIRIS Analysis"
6. Watch processing stages:
   - Loading FSA files
   - Size calling with LIZ 500
   - Allele calling
   - Artifact detection
   - Quality metrics calculation
   - Report generation
7. View results in tabs:
   - **Analysis Queue:** Check processing status
   - **Completed Analyses:** View finished batches
   - **STR Profiles:** See 17 STR loci + Amelogenin
   - **Quality Metrics:** Verify RFU, stutter, resolution scores
8. Click view icon on completed analysis
9. Check paternity results:
   - CPI (Combined Paternity Index)
   - Probability percentage
   - INCLUSION or EXCLUSION conclusion
10. Export CMF file

---

### 📄 **7. Report Generation**
**URL:** `http://localhost:5173/reports`

**Test Workflow:**
1. Navigate to Reports
2. Select completed analyses
3. Generate paternity test report
4. Verify report includes:
   - Case information
   - STR profiles for all samples
   - Statistical calculations
   - Conclusion statement
5. Export as PDF

---

## 🔧 Additional Features to Test

### 📈 **Quality Control (ISO 17025)**
**URL:** `http://localhost:5173/quality-control`
- View compliance dashboard
- Check quality metrics
- Review control charts

### 📦 **Sample Queues**
**URL:** `http://localhost:5173/sample-queues`
- Track samples through workflow
- View bottlenecks
- Prioritize urgent cases

### 📊 **Statistics**
**URL:** `http://localhost:5173/statistics`
- View lab performance metrics
- Turnaround time analysis
- Success rate tracking

### 🏭 **Quality Management System**
**URL:** `http://localhost:5173/qms`
- ISO 17025:2017 compliance tracking
- Document control
- Audit management

---

## 🌙 Dark Mode Testing

For each page above, toggle dark mode and verify:
- [ ] Text remains readable
- [ ] Workflow icons are visible
- [ ] Cards have proper contrast
- [ ] Tables are readable
- [ ] Buttons are clearly visible
- [ ] No white text on white backgrounds

---

## 🧪 Test Data Examples

### Sample IDs to Use:
```
PAT-2024-001 through PAT-2024-100
```

### Client Names:
```
John Doe (Alleged Father)
Jane Smith (Mother)
Baby Doe (Child)
```

### Expected Results:
- ~70% of tests show INCLUSION (biological father)
- ~30% show EXCLUSION (not biological father)
- CPI values range from 10^6 to 10^12 for inclusions
- Probability >99.99% for true biological fathers

---

## 🚨 Common Issues & Solutions

### White Screen on Load:
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm install
npm run build
```

### Backend Connection Errors:
```bash
# App works without backend using simulated data
# If you see API errors, they can be ignored for testing
```

### Port Already in Use:
```bash
# Kill processes on common ports
lsof -ti:5173 | xargs kill -9  # Dev server
lsof -ti:4173 | xargs kill -9  # Preview server
lsof -ti:3001 | xargs kill -9  # Backend
```

---

## ✅ Testing Complete Checklist

- [ ] All pages load without errors
- [ ] Complete workflow from submission to report works
- [ ] OSIRIS analysis produces realistic results
- [ ] Dark mode works on all pages
- [ ] Responsive design works (resize browser)
- [ ] No console errors in browser DevTools
- [ ] Export functions work (CMF, PDF)
- [ ] Navigation between pages is smooth
- [ ] Data persists during session

---

## 📝 Testing Commands Summary

```bash
# 1. Start fresh build
npm run build

# 2. Preview production build
npm run preview

# 3. Open in browser
open http://localhost:4173

# 4. Check console for errors (in browser)
# Right-click → Inspect → Console tab

# 5. Test complete workflow
# Follow the numbered sections above in order

# 6. Generate test report
# After testing, results are in browser console
```

---

## 🎯 Expected Outcome

After complete testing, you should have:
1. Successfully navigated through all 6 workflow stages
2. Generated OSIRIS analysis with realistic STR profiles
3. Viewed paternity test results with CPI and probability
4. Confirmed dark mode works throughout
5. No white screens or major errors

**Time Required:** ~15-20 minutes for complete testing

---

## 📞 Support

If any issues occur during testing:
1. Check browser console for errors (F12)
2. Verify all dependencies installed: `npm install`
3. Try clearing browser cache
4. Restart the development server

The application is designed to work standalone without backend for demonstration purposes!