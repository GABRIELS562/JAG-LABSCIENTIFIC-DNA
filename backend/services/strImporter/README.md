# STR Results Importer

Unified interface for importing Short Tandem Repeat (STR) analysis results into the LIMS from multiple sources.

## Overview

The STR Importer module provides:
- **Contract validation** - All imports are validated against a strict JSON schema
- **Multi-source support** - Parse results from GeneMapper, OSIRIS, or generate synthetic data
- **Deterministic generation** - Same sample name always produces identical profile (for testing)
- **23-locus standard** - Validated against PowerPlex ESX 17 / Identifiler Plus kits

## Quick Start

```javascript
const { getImporter, validate } = require('./services/strImporter');

// Generate synthetic profiles for demo/testing
const synth = getImporter('synthetic');
const payload = synth.generate({
  sampleNames: ['POM26_0001_C_Smith', 'POM26_0001_F_Smith'],
  sourceTag: 'demo'
});

// Parse GeneMapper export
const gm = getImporter('genemapper');
const results = await gm.parse(fileBuffer);

// Parse OSIRIS .oar file
const osiris = getImporter('osiris');
const analysis = await osiris.parse(xmlContent);

// Validate any payload
const validation = validate(payload);
if (!validation.valid) {
  console.error(validation.errors);
}
```

## Mode Selection

Import mode is selected by (in order of precedence):
1. Explicit argument to `getImporter(mode)`
2. `IMPORTER_MODE` environment variable
3. Default: `synthetic`

```bash
# Use synthetic mode (default)
IMPORTER_MODE=synthetic npm start

# Use OSIRIS for real .oar files
IMPORTER_MODE=osiris npm start

# Use GeneMapper for tab-delimited exports
IMPORTER_MODE=genemapper npm start
```

## Import Contract

All adapters produce payloads matching this schema:

```json
{
  "samples": [
    {
      "sampleName": "POM26_0001_C_Smith",
      "markers": {
        "D3S1358": {
          "allele1": "15",
          "allele2": "17",
          "peakHeight1": 2845,
          "peakHeight2": 2567
        },
        "AMEL": {
          "allele1": "X",
          "allele2": "Y"
        }
      }
    }
  ],
  "importDate": "2026-05-02T12:00:00Z",
  "fileName": "GAR_source_1234567890.json"
}
```

## Standard Loci (23)

```
D3S1358, D1S1656, D2S441, D10S1248, D13S317, Penta_E, D16S539,
D18S51, D2S1338, CSF1PO, Penta_D, TH01, vWA, D21S11, D7S820,
D5S818, TPOX, D8S1179, D12S391, D19S433, FGA, D22S1045, AMEL
```

## Adapters

### syntheticAdapter

Generates deterministic, realistic STR profiles for demo/testing.

- Uses Mulberry32 seeded RNG keyed on sample name
- Profiles are reproducible: same name = same profile
- Supports family relationships (`generateFamilies: true`)
- Supports noise simulation (`simulateNoise: true`)

```javascript
const payload = synth.generate({
  sampleNames: ['POM26_0001_M_Test', 'POM26_0001_F_Test', 'POM26_0001_C_Test'],
  generateFamilies: true,  // Child inherits from parents
  simulateNoise: true      // Add stutter/dropout artifacts
});
```

### genemapperAdapter

Parses tab-delimited exports from Applied Biosystems GeneMapper ID software.

**Input format:**
```
Sample_Name	Well	Dye	Locus	Allele	Size	Height	...
25_001_Child	A01	FAM	D3S1358	15	164.21	2845	...
```

- Filters out LIZ size standard dye
- Groups alleles by sample/locus, selects top 2-3 by height
- Normalizes locus names (AMELOGENIN→AMEL, VWA→vWA)

### osirisAdapter

Parses .oar (OSIRIS Analysis Report) XML files from NCBI OSIRIS software.

**Input format:**
```xml
<OsirisAnalysisReport>
  <Sample>
    <Name>25_001_Child</Name>
    <Locus>
      <LocusName>D3S1358</LocusName>
      <Allele><Name>15</Name><RFU>2845</RFU></Allele>
    </Locus>
  </Sample>
</OsirisAnalysisReport>
```

- Supports both nested `<Allele>` elements and embedded `Allele1/Allele2` format
- Extracts metadata (version, kit, ILS, minRFU)
- Filters out controls and ladders

## Sample Naming Convention

Sample names follow the pattern: `<PREFIX><YY>_<NNNN>_<ROLE>_<surname>`

| Component | Values | Description |
|-----------|--------|-------------|
| PREFIX | POM, LT, UP, MAT, IND, SIB | Lab/case type code |
| YY | 25, 26, ... | Two-digit year |
| NNNN | 0001-9999 | Sequence number |
| ROLE | C, F, M | Child, Father, Mother |
| surname | Optional | Family name |

Examples:
- `POM26_0001_C_Smith` - Child in paternity case
- `LT26_0042_F_Jones` - Alleged father in legal test
- `UP26_0100_M_Brown` - Mother in uncontested paternity

**Note:** `UPL` prefix is normalized to `UP` during parsing.

## Validation

The contract module validates:
- Sample structure and naming
- Allele values (AMEL: X/Y only, autosomal: numbers or decimals like 9.3)
- Peak heights (non-negative numbers)
- Required fields (importDate, fileName)

```javascript
const { validate, validateMarker, validateSample } = require('./contract');

// Full payload validation
const result = validate(payload);
// { valid: true } or { valid: false, errors: [...] }

// Per-marker validation
const errors = validateMarker('D3S1358', markerData, sampleName);

// Parse sample name
const parsed = parseSampleName('POM26_0001_C_Smith');
// { prefix: 'POM', year: 2026, sequence: 1, role: 'child', ... }
```

## API Endpoints

```
POST /api/genetic-analysis/str-results
  - Accepts contract-shaped JSON payload
  - Validates and stores each sample's results

POST /api/genetic-analysis/str-results/synthetic
  - Accepts { batchId } or { sampleNames: [...] }
  - Generates and stores synthetic results
```

## Files

```
strImporter/
├── index.js            # Factory (getImporter, validate, MODES)
├── contract.js         # JSON schema, validation, utilities
├── syntheticAdapter.js # Seeded profile generation
├── genemapperAdapter.js # GeneMapper tab-delimited parser
├── osirisAdapter.js    # OSIRIS .oar XML parser
└── README.md           # This file
```

## Testing

```bash
cd backend
npm test -- --testPathPattern="strImporter"
```

Test coverage:
- `contract.test.js` - Validation, locus constants, sample parsing
- `synthetic.test.js` - Determinism, allele ranges, family generation
- `genemapper.test.js` - Tab parsing, peak selection, normalization
- `osiris.test.js` - XML extraction, embedded formats, metadata
- `routes.test.js` - API endpoint validation and storage
