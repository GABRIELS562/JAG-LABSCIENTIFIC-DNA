# 🔬 Sample Tracking Through JAG DNA Scientific LIMS

## 📍 How to Track a Sample Through the System

### 🎯 **Method 1: Visual Workflow Tracking**

1. **Start at Dashboard** (`http://localhost:5173/`)
   - Look at the **Forensic DNA Workflow Pipeline** section
   - Each stage shows the number of samples currently in that phase
   - The colored circles represent:
     - 🔵 **Sample Submission** - New samples entering system
     - 🟣 **DNA Extraction** - Samples being extracted
     - 🟠 **PCR Amplification** - Samples in PCR
     - 🟡 **Capillary Electrophoresis** - Running on 3500
     - 🟢 **OSIRIS Analysis** - STR analysis
     - 🔷 **Report Generation** - Final reports

2. **Progress Bar** at bottom shows overall completion percentage

---

### 🚀 **Method 2: Step-by-Step Sample Journey**

Let me walk you through creating and tracking a sample:

#### **Step 1: Create a New Sample**
```
1. Go to Dashboard
2. Click "New Registration" button (or Sample Submission stage)
3. Enter test data:
   - Case ID: PAT-2024-TEST-001
   - Client: John Smith Family
   - Samples: 3 (Child, Mother, Alleged Father)
4. Click Submit
```

**Sample Status:** ⏳ **PENDING SUBMISSION**

---

#### **Step 2: Track Through DNA Extraction**
```
1. Click "DNA Extraction" in workflow pipeline
2. Your sample "PAT-2024-TEST-001" appears in pending
3. Click "Start Extraction" button
4. Watch progress bar (simulated 2-3 seconds)
5. Sample moves to "Completed Extractions"
```

**Sample Status:** 🧪 **EXTRACTED**

---

#### **Step 3: Track Through PCR**
```
1. Click "PCR Amplification" in workflow
2. Go to PCR Batches page
3. Find your sample in "Available for PCR"
4. Click "Add to PCR Plate"
5. Start PCR Run
6. Watch thermocycler simulation
```

**Sample Status:** 🔬 **AMPLIFIED**

---

#### **Step 4: Track Through Electrophoresis**
```
1. Click "Capillary Electrophoresis" 
2. Your PCR batch appears as "Ready for CE"
3. Click "Load on 3500"
4. Start electrophoresis run
5. Watch real-time progress
```

**Sample Status:** ⚡ **SEQUENCED**

---

#### **Step 5: Track Through OSIRIS Analysis**
```
1. Click "OSIRIS Analysis"
2. Click "Import FSA Files"
3. Select your electrophoresis batch
4. Click "Start OSIRIS Analysis"
5. Watch 6 processing stages:
   - Loading FSA files
   - Size calling with LIZ 500
   - Allele calling
   - Artifact detection
   - Quality metrics
   - Report generation
6. View results with CPI and probability
```

**Sample Status:** 📊 **ANALYZED**

---

#### **Step 6: Generate Report**
```
1. Click "Report Generation"
2. Find your analyzed sample
3. Click "Generate Report"
4. Download PDF with results
```

**Sample Status:** ✅ **COMPLETED**

---

## 📊 **Method 3: Sample Queue Tracking**

### Navigate to Sample Queues (`http://localhost:5173/sample-queues`)

You'll see a table with columns:
- **Sample ID**: PAT-2024-TEST-001
- **Current Stage**: (Extraction/PCR/CE/Analysis/Report)
- **Status**: (Pending/In Progress/Completed)
- **Time in Stage**: How long at current stage
- **Total TAT**: Total turnaround time
- **Priority**: Normal/Urgent
- **Actions**: View details, expedite

---

## 🔍 **Method 4: Real-Time Status Indicators**

### Visual Cues Throughout the System:

1. **Color Coding:**
   - 🔵 Blue = Pending
   - 🟡 Yellow = In Progress
   - 🟢 Green = Completed
   - 🔴 Red = Failed/Needs Attention

2. **Progress Bars:**
   - Each stage shows completion percentage
   - Overall workflow progress at dashboard bottom

3. **Status Badges:**
   - Live badges on each sample card
   - Real-time updates as samples progress

---

## 📈 **Method 5: Analytics Dashboard**

### Go to Statistics Page (`http://localhost:5173/statistics`)

View:
- **Samples by Stage** (Pie Chart)
- **Daily Throughput** (Line Graph)
- **Average TAT by Stage** (Bar Chart)
- **Bottleneck Analysis** (Heat Map)

---

## 🎬 **Demo: Track a Sample in Real-Time**

### Terminal Commands:
```bash
# 1. Make sure app is running
cd /Users/user/JAG-LABSCIENTIFIC-DNA
npm run dev

# 2. Open dashboard
open http://localhost:5173
```

### In Browser - Quick Test Flow:

1. **Create Sample** (Sample Submission)
   - Watch the "Today's Submissions" counter increase
   - See "0 samples" change to "1 sample" under Sample Submission

2. **Process Through Each Stage**
   - Click each workflow stage
   - Process the sample
   - Return to dashboard
   - Watch numbers move from one stage to next

3. **Monitor Progress**
   - Overall Progress bar increases
   - "In Process" number changes
   - "Completed" counter increases when done

---

## 📱 **Live Tracking Features**

### The app simulates real-time tracking with:

1. **Auto-Refresh** (every 30 seconds on dashboard)
2. **Live Status Updates** 
3. **Progress Animations**
4. **Stage Transitions**
5. **Completion Notifications**

---

## 🔄 **Sample Flow Visualization**

```
[Sample Submission] 
    ↓ (Manual transfer)
[DNA Extraction] 
    ↓ (Automated)
[PCR Amplification] 
    ↓ (Automated)
[Capillary Electrophoresis] 
    ↓ (Automated)
[OSIRIS Analysis] 
    ↓ (Automated)
[Report Generation]
    ↓
[✅ COMPLETE]
```

---

## 💡 **Pro Tips for Tracking**

1. **Use Case IDs** for easy searching:
   - Format: `PAT-YYYY-###`
   - Example: `PAT-2024-001`

2. **Check Queue Positions**:
   - Each stage shows queue length
   - Helps identify bottlenecks

3. **Priority Samples**:
   - Mark urgent cases
   - They skip to front of queues

4. **Batch Tracking**:
   - Samples grouped in batches of 96
   - Track entire plates at once

---

## 🎯 **Quick Test Scenario**

Try this to see the full flow:

1. **Create 3 test samples** (one family)
2. **Process them together** through each stage
3. **Watch the dashboard numbers change**
4. **Check OSIRIS for paternity results**
5. **Generate final report**

The entire flow takes about 2-3 minutes to simulate what would be 2-3 days in real lab!

---

## 📊 **Sample Status Codes**

- **REGISTERED** - Sample received
- **EXTRACTING** - DNA extraction in progress  
- **EXTRACTED** - Ready for PCR
- **AMPLIFYING** - PCR in progress
- **AMPLIFIED** - Ready for electrophoresis
- **SEQUENCING** - On 3500 Genetic Analyzer
- **SEQUENCED** - FSA files ready
- **ANALYZING** - OSIRIS processing
- **ANALYZED** - Results ready
- **REPORTED** - Report generated
- **COMPLETED** - Delivered to client

---

## 🔔 **Where to See Sample Movement**

1. **Dashboard** - Overall workflow view
2. **Sample Queues** - Detailed queue positions
3. **Individual Stage Pages** - Stage-specific details
4. **Statistics** - Analytics and metrics
5. **Recent Activity** - Live feed of actions

The system simulates realistic forensic DNA lab workflow with proper sample tracking at each stage!