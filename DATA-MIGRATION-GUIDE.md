# LabScientific LIMS - Data Migration Guide

## Overview
This guide will help you migrate your existing Excel lab data into the LIMS database and continue from your current position (LDS_121 batch, sample number 420).

## Your Data Format Analysis

Your Excel data structure matches our system perfectly:

| Excel Column | LIMS Database Field | Example | Notes |
|-------------|-------------------|---------|--------|
| `24_1` | `lab_number` | 24_1 | Unique identifier |
| `child(24_2) f` | `relation` + `gender` | child(24_2) f | Includes gender (M/F) |
| `4-Jan-2024` | `date_of_birth` | 2024-01-04 | Auto-converted to ISO format |
| `111LDSK` | `kit_batch_number` | 111LDSK | Kit identifier |
| `LDS_35` | `lab_batch_number` | LDS_35 | Lab batch identifier |
| `LDSR_79` | `report_number` | LDSR_79 | Report identifier |
| `5-Jan-2024` | `collection_date` | 2024-01-05 | Processing date |
| `urgent` | `status`/`workflow_status` | urgent | Priority indicator |

## Migration Process

### Step 1: Prepare Your Data

1. **Export your Excel data to CSV** with these column headers:
   ```
   lab_number,relation,dob,name,surname,kit_number,batch_number,report_number,process_date,status,notes
   ```

2. **Use the template we created** at `backend/scripts/csv-import-template.csv` as a reference.

3. **Add missing data** (names and surnames) - you can use placeholders if needed:
   - Names: `Patient_24_1`, `Patient_24_2`, etc.
   - Surnames: `Family_111LDSK`, `Family_113LDSK`, etc.

### Step 2: Run the Migration Script

```bash
cd /Users/user/LABSCIENTIFIC-LIMS/backend/scripts

# Import your CSV data, starting from BN-0121 and lab number 420
node csv-import.js your-data.csv 121 420
```

**Parameters:**
- `your-data.csv` - Path to your CSV file
- `121` - Next BN kit number (starts from BN-0121)
- `420` - Next lab number (starts from 25_420)

### Step 3: Verify Import

After running the script, you'll see:
```
📈 Import completed successfully!
   📁 Cases created: X
   🧪 Samples imported: Y

📊 Current Database Status:
   🧪 Total Samples: Z
   📁 Total Cases: W

🔍 Most Recent Samples:
   24_16: Jessica Garcia (child) [LDS_36]
   LT24_15: Linda Wilson (mother) [LDS_36]
   ...
```

## Data Mapping Details

### Relation Mapping
Your Excel relations are automatically normalized:
- `child(24_2) f` → `child` (with gender `F`)
- `alleged father` → `alleged_father`
- `Mother(LT24_13)` → `mother`

### Workflow Status Mapping
Based on your batch numbers and status:
- `LDS_35` → `pcr_batched`
- `ELEC_XX` → `electro_batched` 
- `ReRun` status → `rerun_batched`
- Default → `sample_collected`

### Client Type Detection
- Lab numbers starting with `LT` → Legal Type (`lt`)
- Regular numbers → Paternity (`paternity`)

### Case Grouping
Samples are grouped by kit number:
- All samples with `111LDSK` → `CASE_111LDSK`
- All samples with `117LDSK` → `CASE_117LDSK`

## Continuing Operations

### New Sample Registration
After migration, the system will automatically:
1. **Generate new lab numbers** starting from `25_420`
2. **Generate new BN kit numbers** starting from `BN-0121`
3. **Maintain proper sequencing** for all future registrations

### Batch Management
The system will recognize your existing batches:
- `LDS_35`, `LDS_36` are preserved as `lab_batch_number`
- New batches will continue the sequence appropriately

## File Structure Created

```
backend/scripts/
├── csv-import.js              # Main CSV import script
├── csv-import-template.csv    # Template for your data format
├── import-excel-data.js       # Alternative direct JS import
└── [your-data].csv           # Your converted Excel data
```

## Example CSV Format

```csv
lab_number,relation,dob,name,surname,kit_number,batch_number,report_number,process_date,status,notes
24_1,child(24_2) f,4-Jan-2024,John,Smith,111LDSK,LDS_35,LDSR_79,5-Jan-2024,urgent,
24_2,alleged father,4-Jan-2024,Robert,Smith,111LDSK,LDS_35,LDSR_79,5-Jan-2024,urgent,
LT24_13,child(LT24_14) M,9-Jan-2024,Anthony,Wilson,117LDSK,LDS_36,LDSR_4LT,11-Jan-2024,urgent,
LT24_14,Alleged Father(LT24_13),9-Jan-2024,Thomas,Wilson,117LDSK,LDS_36,LDSR_4LT,11-Jan-2024,urgent,
LT24_15,Mother(LT24_13),9-Jan-2024,Linda,Wilson,117LDSK,LDS_36,LDSR_4LT,11-Jan-2024,urgent,
```

## Database Schema Compatibility

Your data maps to these database tables:
- **`test_cases`** - Groups samples by kit number
- **`samples`** - Individual sample records
- **`lab_sequence`** - Maintains lab number continuity
- **`bn_sequence`** - Maintains BN kit number continuity

## Troubleshooting

### Common Issues:
1. **Date Format Errors**: Ensure dates are in "4-Jan-2024" or "2024-01-04" format
2. **Missing Names**: Use placeholder names if real names aren't available
3. **Duplicate Lab Numbers**: Each lab_number must be unique
4. **Invalid Relations**: Use standard relations (child, alleged_father, mother)

### Validation:
- Check import logs for any warnings or errors
- Verify sample counts match your Excel data
- Confirm case grouping is correct
- Test new sample registration continues from 25_420

## Next Steps

After successful migration:
1. ✅ All existing data will be in the LIMS
2. ✅ New registrations will continue from your current numbers
3. ✅ The samples page will show all imported data with proper grouping
4. ✅ You can continue using the system normally

The migration is designed to be **non-destructive** - it won't overwrite existing data, and you can run it multiple times safely.