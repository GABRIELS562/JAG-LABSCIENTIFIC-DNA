# Google Sheets Import Setup Guide

## Overview
This guide will help you set up Google Sheets API access and import your lab data directly from Google Sheets into the LIMS database.

## Prerequisites
- Google Cloud account
- Google Sheets with your lab data
- Node.js installed

## Step 1: Google Cloud Setup

### 1.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable Google Sheets API
1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and click **Enable**
4. Also enable "Google Drive API" (needed for file access)

### 1.3 Create Service Account
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in:
   - Service account name: `lims-sheets-importer`
   - Service account ID: `lims-sheets-importer`
   - Description: `Service account for importing lab data from Google Sheets`
4. Click **Create and Continue**
5. Skip role assignment (click **Continue**)
6. Click **Done**

### 1.4 Create Service Account Key
1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Click **Create**
6. Save the downloaded JSON file as `service-account-key.json` in your project

## Step 2: Google Sheets Setup

### 2.1 Prepare Your Sheet
Your Google Sheet should have columns matching this format:

| lab_number | relation | dob | name | surname | kit_number | batch_number | report_number | process_date | status | notes |
|------------|----------|-----|------|---------|------------|--------------|---------------|--------------|--------|-------|
| 24_1 | child(24_2) f | 4-Jan-2024 | John | Smith | 111LDSK | LDS_35 | LDSR_79 | 5-Jan-2024 | urgent | |
| 24_2 | alleged father | 4-Jan-2024 | Robert | Smith | 111LDSK | LDS_35 | LDSR_79 | 5-Jan-2024 | urgent | |

### 2.2 Share Sheet with Service Account
1. Open your Google Sheet
2. Click **Share** button
3. Add the service account email (found in your JSON file as `client_email`)
4. Give it **Viewer** access
5. Click **Send**

### 2.3 Get Sheet ID
From your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
```
The Sheet ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 3: Install Dependencies

```bash
cd /Users/user/LABSCIENTIFIC-LIMS/backend
npm install google-spreadsheet google-auth-library
```

## Step 4: Run the Import

```bash
cd backend/scripts

# Basic import
node google-sheets-import.js service-account-key.json YOUR_SHEET_ID

# Specify sheet name and continue from your current position
node google-sheets-import.js service-account-key.json YOUR_SHEET_ID "Sheet1" 121 420

# With custom sheet name
node google-sheets-import.js service-account-key.json YOUR_SHEET_ID "Lab Data 2024" 121 420
```

### Parameters:
- `service-account-key.json` - Path to your service account key file
- `YOUR_SHEET_ID` - The Google Sheet ID from step 2.3
- `"Sheet1"` - Name of the sheet/tab (optional, defaults to first sheet)
- `121` - Next BN kit number (optional, defaults to 121)
- `420` - Next lab number (optional, defaults to 420)

## Step 5: Verify Import

After running the import, you'll see:
```
📈 Import completed successfully!
   📁 Cases created: X
   🧪 Samples imported: Y

📊 Current Database Status:
   🧪 Total Samples: Z
   📁 Total Cases: W
```

Check your samples page in the LIMS to verify the data was imported correctly.

## Troubleshooting

### Common Issues:

1. **Authentication Error**
   - Verify service account key file path
   - Check that the sheet is shared with the service account email

2. **Sheet Not Found**
   - Verify the Sheet ID is correct
   - Check sheet name if specified

3. **Permission Denied**
   - Ensure service account has access to the sheet
   - Check that Google Sheets API is enabled

4. **Column Mapping Issues**
   - The script automatically normalizes common column name variations
   - Supported variations: `lab_number`, `Lab Number`, `sample_id`, etc.

### Supported Column Variations:
The import script automatically recognizes these column name variations:

- **Lab Number**: `lab_number`, `Lab Number`, `sample_id`, `Sample ID`
- **Relation**: `relation`, `relationship`, `role`
- **DOB**: `dob`, `date_of_birth`, `Date of Birth`, `birth_date`
- **Names**: `name`/`first_name`, `surname`/`last_name`/`family_name`
- **Kit**: `kit_number`, `Kit Number`, `kit`
- **Batch**: `batch_number`, `Batch Number`, `batch`, `lab_batch`
- **Report**: `report_number`, `Report Number`, `report`
- **Status**: `status`, `priority`, `urgent`
- **Notes**: `notes`, `comments`, `remarks`

## Security Notes

- Keep your service account key file secure and never commit it to version control
- Only grant necessary permissions to the service account
- Regularly rotate service account keys for production use

## Next Steps

After successful import:
1. ✅ All Google Sheets data will be in the LIMS
2. ✅ New registrations will continue from your current numbers (421+)
3. ✅ The samples page will show all imported data with proper grouping
4. ✅ You can continue using the system normally

The import process preserves your existing data and continues numbering from your current position!