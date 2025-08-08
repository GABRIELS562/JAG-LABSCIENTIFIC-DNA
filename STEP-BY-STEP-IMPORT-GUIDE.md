# Step-by-Step Lab Data Import Guide

## 📋 **Prerequisites Checklist**
- [ ] Google Cloud account set up
- [ ] Google Sheets with your lab data
- [ ] Service account credentials (JSON file)
- [ ] Backend server running

---

## 🚀 **Step 1: Set Up Google Cloud API Access**

### 1.1 Create Google Cloud Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it: `LabScientific-LIMS-Import`
4. Click **"Create"**
5. **Wait for project to be created** (you'll see notification)

### 1.2 Enable Required APIs
1. In your new project, click **"APIs & Services"** → **"Library"**
2. Search for **"Google Sheets API"**
3. Click on it → Click **"Enable"**
4. Go back to Library, search for **"Google Drive API"**
5. Click on it → Click **"Enable"**

### 1.3 Create Service Account
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"Service account"**
3. Fill in:
   - **Service account name**: `lims-data-importer`
   - **Service account ID**: `lims-data-importer` (auto-fills)
   - **Description**: `Import lab data from Google Sheets`
4. Click **"CREATE AND CONTINUE"**
5. Skip the role section → Click **"CONTINUE"**
6. Skip user access → Click **"DONE"**

### 1.4 Download Service Account Key
1. Find your service account in the list → **Click on it**
2. Go to **"Keys"** tab
3. Click **"ADD KEY"** → **"Create new key"**
4. Select **"JSON"** format
5. Click **"CREATE"**
6. **Save the downloaded file** as `service-account-key.json`
7. **Copy this file** to `/Users/user/LABSCIENTIFIC-LIMS/backend/scripts/`

---

## 📊 **Step 2: Prepare Your Google Sheet**

### 2.1 Format Your Data
Make sure your Google Sheet has these column headers (exact spelling):
```
lab_number | relation | dob | name | surname | kit_number | batch_number | report_number | process_date | status | notes
```

**Example data row:**
```
24_1 | child(24_2) f | 4-Jan-2024 | John | Smith | 111LDSK | LDS_35 | LDSR_79 | 5-Jan-2024 | urgent |
```

### 2.2 Share Sheet with Service Account
1. **Open your Google Sheet**
2. Click **"Share"** button (top right)
3. **Copy the email** from your service account key file (look for `"client_email"`)
4. **Paste this email** in the share box
5. Set permission to **"Viewer"**
6. **Uncheck** "Notify people"
7. Click **"Send"**

### 2.3 Get Your Sheet ID
From your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                      ↑                                                    ↑
                                      This long string is your SHEET_ID
```
**Copy this ID** - you'll need it for the import.

---

## 💻 **Step 3: Install Dependencies**

1. **Open Terminal**
2. **Navigate to backend folder:**
   ```bash
   cd /Users/user/LABSCIENTIFIC-LIMS/backend
   ```
3. **Install Google Sheets packages:**
   ```bash
   npm install google-spreadsheet google-auth-library
   ```

---

## 🔄 **Step 4: Run the Import**

### 4.1 Start Backend Server
1. **Open a new Terminal window**
2. **Navigate to backend:**
   ```bash
   cd /Users/user/LABSCIENTIFIC-LIMS/backend
   ```
3. **Start the server:**
   ```bash
   npm start
   ```
4. **Leave this terminal open** (server must stay running)

### 4.2 Run Import Script
1. **Open another Terminal window**
2. **Go to scripts folder:**
   ```bash
   cd /Users/user/LABSCIENTIFIC-LIMS/backend/scripts
   ```
3. **Run the import:**
   ```bash
   node google-sheets-import.js service-account-key.json YOUR_SHEET_ID "Sheet1" 121 420
   ```
   
   **Replace:**
   - `YOUR_SHEET_ID` with the ID from Step 2.3
   - `"Sheet1"` with your actual sheet name (if different)

### 4.3 Expected Output
You should see:
```
📊 Google Sheets Import Script for LabScientific LIMS
🔐 Authenticating with Google Sheets API...
   ✅ Connected to spreadsheet: Your Sheet Name
   📄 Available sheets: 1
📥 Reading sheet data...
   📋 Reading from sheet: Sheet1
   📊 Rows: 100, Columns: 11
   📑 Headers found: lab_number, relation, dob, name, surname...
   ✅ Read 50 data rows
🔧 Setting up sequence numbers...
   ✅ BN sequence set to start from BN-0121
   ✅ Lab numbers will continue from 25_420
🚀 Starting Google Sheets import...
📁 Cases created: 15
🧪 Samples imported: 45
📈 Import completed successfully!
```

---

## ✅ **Step 5: Verify Import**

### 5.1 Check LIMS Application
1. **Open your browser**
2. **Go to:** `http://localhost:5174`
3. **Click "Samples"** in the sidebar
4. **Verify your data appears** with proper grouping

### 5.2 Check Next Numbers
New registrations will automatically use:
- **Next BN Kit:** BN-0122, BN-0123, etc.
- **Next Lab Numbers:** 25_421, 25_422, etc.

---

## 🔧 **Troubleshooting**

### Problem: "Authentication failed"
**Solution:**
1. Check that `service-account-key.json` is in the scripts folder
2. Verify the Google Sheet is shared with the service account email
3. Ensure Google Sheets API is enabled in your Google Cloud project

### Problem: "Sheet not found"
**Solution:**
1. Double-check your Sheet ID
2. Make sure the sheet name matches (case-sensitive)
3. Verify the sheet is shared with the service account

### Problem: "No data found"
**Solution:**
1. Check that your sheet has data in the expected format
2. Verify column headers match the expected format
3. Make sure data starts from row 2 (row 1 should be headers)

### Problem: "Backend connection failed"
**Solution:**
1. Make sure backend server is running (`npm start`)
2. Check that no other process is using port 3001
3. Restart the backend server if needed

---

## 📱 **Quick Command Reference**

**Start backend server:**
```bash
cd /Users/user/LABSCIENTIFIC-LIMS/backend && npm start
```

**Run import (basic):**
```bash
cd /Users/user/LABSCIENTIFIC-LIMS/backend/scripts
node google-sheets-import.js service-account-key.json YOUR_SHEET_ID
```

**Run import (with options):**
```bash
node google-sheets-import.js service-account-key.json YOUR_SHEET_ID "Sheet1" 121 420
```

**Check samples page:**
```bash
open http://localhost:5174
```

---

## 🎯 **Final Checklist**

After successful import:
- [ ] All your lab data appears in the Samples page
- [ ] Cases are properly grouped by kit numbers
- [ ] New registrations continue from the correct numbers
- [ ] Workflow statuses are correctly set
- [ ] No duplicate data exists

**Your lab is now fully migrated and ready to continue operations! 🎉**

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check the error message in the terminal
2. Verify all prerequisite steps were completed
3. Ensure your Google Sheet format matches the expected structure
4. Make sure the backend server is running during import