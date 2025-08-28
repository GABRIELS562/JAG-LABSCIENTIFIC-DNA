# JAG DNA Scientific LIMS - API Documentation

## Overview
REST API for Forensic DNA Laboratory Information Management System (LIMS) designed for paternity testing labs using 3500 Genetic Analyzer with PowerPlex ESX 17 STR kit and LIZ 500 size standard.

**Base URL**: `http://localhost:3001/api`

## Authentication
Currently, the API operates without authentication for development. Production deployment should implement JWT-based authentication.

---

## Core Endpoints

### Health & Monitoring

#### GET /health
Health check endpoint for monitoring system status.

**Response**: 
```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T07:42:31.479Z",
  "checks": {
    "database": { "status": "healthy" },
    "memory": { "status": "healthy" },
    "disk": { "status": "warning" }
  }
}
```

#### GET /metrics
Prometheus-compatible metrics endpoint for monitoring.

**Response**: Prometheus text format metrics

---

## Forensic Workflow Endpoints

### Sample Management

#### GET /api/samples
Get all samples with pagination and filtering.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status
- `search` (string): Search by lab number or name

**Response**:
```json
{
  "success": true,
  "samples": [
    {
      "id": 1,
      "lab_number": "JAG2024001",
      "name": "John",
      "surname": "Doe",
      "relation": "child",
      "workflow_status": "pcr_ready",
      "case_number": "2024-000001"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

#### POST /api/samples
Create a new sample.

**Request Body**:
```json
{
  "name": "John",
  "surname": "Doe",
  "relation": "child",
  "id_number": "1234567890",
  "case_number": "2024-000001"
}
```

#### GET /api/samples/:id
Get sample details by ID.

#### PUT /api/samples/:id
Update sample information.

#### DELETE /api/samples/:id
Delete a sample (soft delete).

---

### DNA Extraction

#### POST /api/extraction/create-batch
Create a new extraction batch.

**Request Body**:
```json
{
  "sampleIds": [1, 2, 3],
  "extractionMethod": "automated",
  "kitLotNumber": "EXT2024001"
}
```

#### GET /api/extraction/batches
Get all extraction batches.

#### POST /api/extraction/complete/:batchId
Mark extraction batch as complete.

---

### PCR Amplification

#### POST /api/batches/create-pcr
Create PCR batch with 96-well plate layout.

**Request Body**:
```json
{
  "sampleIds": [1, 2, 3],
  "plateLayout": "96-well",
  "strKit": "PowerPlex ESX 17",
  "primerLot": "PCR2024001"
}
```

#### GET /api/batches/pcr
Get all PCR batches.

#### GET /api/batches/pcr/:id
Get PCR batch details with plate visualization.

#### POST /api/batches/pcr/:id/complete
Mark PCR batch as complete.

---

### Capillary Electrophoresis (3500 Genetic Analyzer)

#### POST /api/electrophoresis/create
Create electrophoresis run for 3500 Genetic Analyzer.

**Request Body**:
```json
{
  "batchId": 1,
  "runName": "Run_2024_001",
  "instrument": "3500 Genetic Analyzer",
  "sizeStandard": "LIZ 500",
  "dyeSet": "G5",
  "capillaryArray": "36cm",
  "polymer": "POP-4"
}
```

#### GET /api/electrophoresis/runs
Get all electrophoresis runs.

#### POST /api/electrophoresis/:id/upload-fsa
Upload FSA files from 3500 Genetic Analyzer.

**Request**: Multipart form data with FSA files

---

### Genetic Analysis (GeneMapper/OSIRIS)

#### POST /api/genetic-analysis/analyze
Analyze genetic profiles using OSIRIS.

**Request Body**:
```json
{
  "sampleId": 1,
  "fsaFile": "sample_001.fsa",
  "analysisType": "paternity",
  "settings": {
    "peakThreshold": 150,
    "stutterFilter": true,
    "pullUpCorrection": true
  }
}
```

#### GET /api/genetic-analysis/results/:sampleId
Get analysis results for a sample.

**Response**:
```json
{
  "sampleId": 1,
  "profile": {
    "D3S1358": { "allele1": "15", "allele2": "16" },
    "vWA": { "allele1": "17", "allele2": "18" },
    "FGA": { "allele1": "22", "allele2": "24" }
  },
  "qualityMetrics": {
    "peakHeight": "adequate",
    "balance": "good",
    "degradation": "none"
  }
}
```

---

## Forensic Analysis Endpoints

### Paternity Testing

#### POST /api/paternity/calculate
Calculate paternity probability using Bayesian statistics.

**Request Body**:
```json
{
  "profiles": [
    {
      "locus": "D3S1358",
      "child": { "allele1": "15", "allele2": "16" },
      "mother": { "allele1": "14", "allele2": "15" },
      "allegedFather": { "allele1": "16", "allele2": "17" }
    }
  ]
}
```

**Response**:
```json
{
  "cpi": 999999.99,
  "probability": 0.999999,
  "conclusion": "INCLUDED",
  "locusResults": [
    {
      "locus": "D3S1358",
      "pi": 2.5,
      "inherited": "16"
    }
  ]
}
```

#### GET /api/paternity/case/:caseId/profiles
Get all genetic profiles for a case.

#### POST /api/paternity/simulate/:caseId
Simulate paternity test with existing profiles.

---

### STR Profile Matching

#### POST /api/str-matching/compare
Compare two STR profiles.

**Request Body**:
```json
{
  "profile1": { "D3S1358": { "allele1": "15", "allele2": "16" } },
  "profile2": { "D3S1358": { "allele1": "15", "allele2": "16" } },
  "stringency": "moderate"
}
```

#### POST /api/str-matching/kinship
Perform kinship analysis between profiles.

**Request Body**:
```json
{
  "profile1": {},
  "profile2": {},
  "relationship": "full-sibling"
}
```

#### POST /api/str-matching/mixture
Analyze DNA mixture profiles.

#### POST /api/str-matching/search
Search profile database for matches.

---

## Reporting Endpoints

### Forensic Reports

#### POST /api/forensic-reports/paternity
Generate court-admissible paternity report (PDF).

**Request Body**:
```json
{
  "caseId": 1,
  "caseData": {
    "caseNumber": "2024-000001",
    "participants": {}
  },
  "results": {
    "cpi": 999999,
    "probability": 0.9999
  },
  "options": {
    "includeElectropherogram": true,
    "includeStatistics": true
  }
}
```

#### GET /api/forensic-reports/:reportId
Get generated report by ID.

#### GET /api/forensic-reports/download/:reportId
Download report as PDF.

#### POST /api/forensic-reports/comprehensive/:caseId
Generate comprehensive case report with all analyses.

---

## Case Management

#### POST /api/case-management/cases
Create new case with auto-generated case number.

**Request Body**:
```json
{
  "testPurpose": "Paternity Testing",
  "priority": "routine",
  "requesterName": "John Smith",
  "requesterOrganization": "Family Court",
  "courtCaseNumber": "FC2024-001",
  "participants": []
}
```

#### GET /api/case-management/cases/:caseId
Get complete case details including timeline and samples.

#### PUT /api/case-management/cases/:caseId/status
Update case status (submitted → in_progress → review → completed).

#### POST /api/case-management/cases/:caseId/notes
Add case notes with confidentiality options.

#### GET /api/case-management/workload
Get workload summary and analytics.

---

## Quality Control

#### POST /api/qc/assess-sample/:sampleId
Assess sample quality metrics.

**Request Body**:
```json
{
  "dna": {
    "concentration": 25.5,
    "ratio_260_280": 1.85,
    "ratio_260_230": 2.1
  },
  "str": {
    "loci": {
      "D3S1358": {
        "peak1_height": 2500,
        "peak2_height": 2300
      }
    }
  }
}
```

#### POST /api/qc/control-checks/:batchId
Run positive/negative control checks.

#### POST /api/qc/contamination-check/:sampleId
Check for sample contamination.

---

## Workflow Status

#### GET /api/workflow-status
Get overall workflow status and metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalSamples": 150,
    "byStatus": {
      "submitted": 10,
      "extraction": 20,
      "pcr": 30,
      "electrophoresis": 25,
      "analysis": 40,
      "completed": 25
    },
    "turnaroundTime": {
      "average": "5.2 days",
      "min": "3 days",
      "max": "10 days"
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional information"
  }
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Rate Limiting

Development environment: No rate limiting
Production recommendation: 100 requests per minute per IP

---

## WebSocket Events (Real-time Updates)

Connect to `ws://localhost:3001` for real-time updates:

**Events**:
- `sample.created` - New sample registered
- `batch.completed` - Batch processing complete
- `analysis.ready` - Analysis results available
- `report.generated` - Report ready for download

---

## Testing Endpoints

#### GET /api/test/generate-data
Generate test data for development.

#### POST /api/test/reset-database
Reset database to initial state (development only).

---

## Notes

1. **3500 Genetic Analyzer Integration**: The system is optimized for Applied Biosystems 3500 Genetic Analyzer with 16-capillary array
2. **PowerPlex ESX 17**: STR analysis configured for Promega PowerPlex ESX 17 kit (16 STR loci + Amelogenin)
3. **LIZ 500 Size Standard**: All electrophoresis runs use Applied Biosystems GeneScan 500 LIZ dye Size Standard
4. **OSIRIS Integration**: Genetic analysis uses OSIRIS for profile interpretation
5. **Court-Admissible Reports**: All reports follow ISO 17025 standards for forensic laboratories

---

## Support

For API issues or questions, contact the development team or check the system health at `/health` endpoint.