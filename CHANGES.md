# STR Results Importer - Changes

## Summary

Replaced the ad-hoc mock data generators with a unified, contract-validated STR results import system.

## What Changed

### Added

**New Module: `backend/services/strImporter/`**

| File | Purpose |
|------|---------|
| `contract.js` | JSON schema validation, 23-locus standard, allele validators |
| `syntheticAdapter.js` | Deterministic profile generation using seeded RNG |
| `genemapperAdapter.js` | Parser for Applied Biosystems GeneMapper exports |
| `osirisAdapter.js` | Parser for NCBI OSIRIS .oar XML files |
| `index.js` | Factory with mode selection (synthetic/genemapper/osiris) |
| `README.md` | Comprehensive documentation |

**New Tests: `backend/tests/strImporter/`**

| File | Tests |
|------|-------|
| `contract.test.js` | 54 tests - validation, locus constants, sample parsing |
| `synthetic.test.js` | 28 tests - determinism, allele ranges, family generation |
| `genemapper.test.js` | 28 tests - tab parsing, peak selection, normalization |
| `osiris.test.js` | 35 tests - XML extraction, embedded formats, metadata |
| `routes.test.js` | 14 tests - API endpoint validation and storage |

**New API Endpoints:**

```
POST /api/genetic-analysis/str-results
  - Import STR results with contract validation
  - Stores each sample in genetic_analysis_results table

POST /api/genetic-analysis/str-results/synthetic
  - Generate deterministic profiles for demo/testing
  - Accepts { batchId } or { sampleNames: [...] }
```

### Removed

| File | Reason |
|------|--------|
| `osirisIntegration.js` | Generated random mock data |
| `osirisEnhancedSTRAnalyzer.js` | Generated random mock data |

### Modified

| File | Change |
|------|--------|
| `routes/genetic-analysis.js` | Added strImporter import, new /str-results endpoints, removed unused OsirisIntegration |
| `README.md` | Added STR Results Import Modes section |

## Key Features

### Contract Validation

All imports are validated against a strict schema:
- 23 standard loci (PowerPlex ESX 17 / Identifiler Plus compatible)
- AMEL alleles: X or Y only
- Autosomal alleles: integers or decimals (e.g., "15", "9.3")
- Peak heights: non-negative numbers
- Required fields: sampleName, markers, importDate, fileName

### Deterministic Generation

The synthetic adapter uses seeded random number generation:
- Same sample name always produces identical profile
- Family relationships: children inherit alleles from parents
- Realistic peak heights (500-3000 RFU) with heterozygote balance
- Optional noise simulation (stutter, dropout)

### Multi-Source Support

| Source | Format | Use Case |
|--------|--------|----------|
| Synthetic | Generated | Demo, testing, development |
| GeneMapper | Tab-delimited | Applied Biosystems 3130xl/3500 exports |
| OSIRIS | XML (.oar) | NCBI OSIRIS analysis reports |

## Testing

```bash
cd backend
npm test -- --testPathPattern="strImporter"
# 159 tests, 5 suites
```

## Migration Notes

1. **Environment Variable**: Set `IMPORTER_MODE` to control which adapter is used:
   - `synthetic` (default) - for demo/development
   - `genemapper` - for GeneMapper file imports
   - `osiris` - for OSIRIS .oar file imports

2. **Sample Names**: The system normalizes `UPL` prefix to `UP` automatically.

3. **Existing Data**: The new endpoints store to `genetic_analysis_results` table with `analysis_type` of `str_import` or `str_synthetic`.

## Commits

1. `feat(importer): add JSON contract validator for STR results`
2. `feat(importer): add synthetic STR results adapter`
3. `feat(importer): add importer factory with mode selection`
4. `feat(importer): add STR results API endpoints`
5. `feat(importer): add GeneMapper tab-delimited file parser`
6. `feat(importer): add OSIRIS .oar XML parser`
7. `chore(importer): remove deprecated Osiris mock files`
8. `docs(importer): add STR importer documentation`
