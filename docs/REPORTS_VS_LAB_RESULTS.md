# Reports vs Lab Results - Page Structure

## Overview
The LabScientific LIMS application has two distinct pages for different aspects of the laboratory workflow:

## 📋 **Reports Page** (`/reports`)
**Purpose**: Final deliverables and client-facing documents

**Location**: `src/components/features/Reports.jsx`

**Content**:
- ✅ Final PDF reports (paternity reports, certificates)
- ✅ Report metadata (batch type, status, file accessibility)
- ✅ Download/view functionality for completed reports
- ✅ Report statistics (legal, peace of mind, completed, pending, sent)
- ✅ Report delivery tracking

**Focus**: **Document management** - managing the final deliverable reports that are sent to clients.

---

## 🧬 **Lab Results Page** (`/lab-results`)
**Purpose**: Raw analytical data and test results

**Location**: `src/components/features/LabResults.jsx`

**Content**:
- ✅ DNA analysis results and STR profiles
- ✅ Electrophoresis data and quality metrics
- ✅ PCR results and instrument data
- ✅ Quality control metrics and success rates
- ✅ Allele data and peak height information
- ✅ Raw data before it's formatted into reports

**Focus**: **Data analysis** - the actual scientific results and quality metrics from laboratory instruments.

---

## Key Differences

| Aspect | Reports | Lab Results |
|--------|---------|-------------|
| **Audience** | Clients | Laboratory staff |
| **Content** | PDF documents | Raw data tables |
| **Purpose** | Final delivery | Quality control & analysis |
| **Data Type** | Formatted reports | Scientific measurements |
| **Actions** | Download, View, Send | Analyze, Review, QC |

## Navigation
- **Reports**: Available via sidebar "Reports" menu
- **Lab Results**: Available via sidebar "Lab Results" menu

## Technical Implementation
- Both pages use responsive Material-UI tables
- Reports connects to `/api/reports` endpoints
- Lab Results uses genetic analysis data (STR profiles, quality metrics)
- Proper separation of concerns maintained
- No duplicate functionality between pages

---

*This structure provides clear separation between the laboratory workflow (Lab Results) and client deliverables (Reports).*