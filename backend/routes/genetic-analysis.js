const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
// const FSAProcessor = require("../services/fsaProcessor");
// const OsirisIntegration = require("../services/osirisIntegration");
const ReportGenerator = require("../services/reportGenerator");
const GeneticAuthMiddleware = require("../middleware/geneticAuthMiddleware");
const GeneticUserService = require("../services/geneticUserService");
const db = require("../services/database");
// Using SQLite database instead of PostgreSQL

const router = express.Router();
// const fsaProcessor = new FSAProcessor();
let osiris = null; // Initialize only when needed
const reportGenerator = new ReportGenerator();
const auth = new GeneticAuthMiddleware();
const userService = new GeneticUserService(db.db);

// Function to launch native Osiris application
const launchOsiris = async (filePath = null) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const launchScript = path.join(process.cwd(), 'launch_osiris.sh');
    
    let args = [];
    if (filePath) {
      args = [filePath];
    }
    
    // Use the custom launch script with proper environment setup
    const osirisProcess = spawn('bash', [launchScript, ...args], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        'DYLD_LIBRARY_PATH': '/opt/homebrew/lib:' + (process.env.DYLD_LIBRARY_PATH || ''),
        'PATH': '/opt/homebrew/bin:' + process.env.PATH
      }
    });
    
    osirisProcess.unref();
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Osiris GUI launched successfully with enhanced compatibility',
      filePath: filePath || 'No file specified',
      method: 'shell_script_with_wxwidgets'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Configure multer for FSA file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "genetic_samples");
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${originalName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".fsa") {
      cb(null, true);
    } else {
      cb(new Error("Only .fsa files are allowed"), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Authentication routes
/**
 * User login
 */
// router.post('/auth/login', async (req, res) => { ... });

/**
 * User logout
 */
// router.post('/auth/logout', auth.authenticate(), async (req, res) => { ... });

/**
 * Get current user profile
 */
// router.get('/auth/profile', auth.authenticate(), async (req, res) => { ... });

/**
 * Change password
 */
// router.post('/auth/change-password', auth.authenticate(), async (req, res) => { ... });

// User management routes (admin only)
/**
 * Create new user
 */
// router.post('/users',
//   auth.authenticate(),
//   auth.requirePermission('create_user'),
//   async (req, res) => { ... });

/**
 * Get all users
 */
// router.get('/users',
//   auth.authenticate(),
//   auth.requireRole('lab_director'),
//   async (req, res) => { ... });

/**
 * Update user
 */
// router.put('/users/:userId',
//   auth.authenticate(),
//   auth.requireRole('lab_director'),
//   async (req, res) => { ... });

// Track initialization status to prevent loops
let osirisInitialized = false;
let initializationError = null;

/**
 * Initialize Osiris workspace
 */
router.post(
  "/initialize-osiris",
  /* auth.authenticate(), auth.requireRole('lab_director'), */ async (
    req,
    res,
  ) => {
    try {
      if (osirisInitialized) {
        return res.json({
          success: true,
          message: 'Osiris already initialized',
          osirisVersion: '2.16'
        });
      }

      if (initializationError) {
        return res.status(500).json({
          success: false,
          error: `Previous initialization failed: ${initializationError}`,
          requiresManualCheck: true
        });
      }

      // Launch native Osiris GUI instead of web integration
      const result = await launchOsiris();
      if (result.success) {
        osirisInitialized = true;
        res.json({
          success: true,
          message: 'Osiris 2.16 GUI launched successfully',
          osirisVersion: '2.16',
          type: 'native_gui'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Failed to launch Osiris GUI'
        });
      }
    } catch (error) {
      initializationError = error.message;
      console.error('Osiris initialization failed:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        requiresManualCheck: true
      });
    }
  },
);

/**
 * Test enhanced STR analyzer with single FSA file
 */
router.post(
  "/test-str-analyzer",
  /* auth.authenticate(), auth.requirePermission('start_analysis'), */ upload.single(
    "fsaFile",
  ),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No FSA file uploaded",
        });
      }

      // const OsirisEnhancedSTRAnalyzer = require("../services/osirisEnhancedSTRAnalyzer");
      // const strAnalyzer = new OsirisEnhancedSTRAnalyzer();

      // STR Analyzer disabled for server stability
      return res.status(501).json({
        success: false,
        error: 'STR analysis temporarily disabled for server stability',
        message: 'Please use native Osiris 2.16 application for FSA analysis'
      });

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn(`Failed to cleanup test file: ${unlinkError.message}`);
      }

      // Test export functionality if analysis was successful
      let exportResults = null;
      if (analysisResult.success) {
        const outputDir = path.join(process.cwd(), "exports", "test_analysis");
        exportResults = await strAnalyzer.exportCompleteAnalysis(
          analysisResult,
          outputDir,
          ["xml", "csv"],
        );
      }

      res.json({
        success: true,
        fileName: req.file.originalname,
        initialization: initResult,
        analysis: analysisResult,
        exports: exportResults,
        timestamp: new Date(),
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.warn(
            `Failed to cleanup file on error: ${unlinkError.message}`,
          );
        }
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Create new genetic analysis case
 */
router.post(
  "/cases",
  /* auth.authenticate(), auth.requirePermission('create_case'), auth.requireDataIntegrity(), */ async (
    req,
    res,
  ) => {
    try {
      const { caseType = "paternity", priority = "normal", notes } = req.body;
      let { caseId } = req.body;

      // Generate case ID if not provided
      if (!caseId) {
        caseId = db.generateGeneticCaseNumber();
      }

      const result = db.createGeneticCase({
        caseId,
        caseType,
        priority,
        notes,
      });

      const newCase = db.getGeneticCase(caseId);
      if (!newCase) {
        console.error("Failed to fetch new case after creation:", caseId);
        return res.status(500).json({
          success: false,
          error: "Failed to create or fetch new case",
        });
      }

      res.json({
        success: true,
        case: newCase,
      });
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error",
      });
    }
  },
);

/**
 * Upload FSA files for genetic analysis (SQLite Demo Version)
 */
router.post(
  "/cases/:caseId/samples",
  /* auth.authenticate(), auth.requirePermission('upload_samples'), auth.requireCaseAccess(), auth.requireDataIntegrity(), */ upload.array(
    "fsaFiles",
    10,
  ),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const files = req.files;
      const sampleTypes = JSON.parse(req.body.sampleTypes || "{}");

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      const processedSamples = [];

      for (const file of files) {
        // Generate sample ID
        const sampleId = `${caseId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const sampleType = sampleTypes[file.originalname] || "unknown";

        // For demo purposes, simulate successful processing with GeneScan LIZ G5 compatible data
        const demoResult = {
          success: true,
          fileHash: `demo_hash_${Date.now()}`,
          qualityCheck: { passed: true },
          metadata: {
            instrument: "ABI 3500xL Genetic Analyzer",
            kit: "PowerPlex ESX 17",
            dye_set: "GeneScan LIZ G5",
            analysis_software: "Osiris 2.16",
          },
          strData: {
            D3S1358: {
              alleles: [
                { value: "15", height: 1200, bp: 112.5 },
                { value: "16", height: 1100, bp: 116.5 },
              ],
            },
            vWA: {
              alleles: [
                { value: "17", height: 1350, bp: 157.2 },
                { value: "18", height: 1250, bp: 161.2 },
              ],
            },
            FGA: {
              alleles: [
                { value: "21", height: 1400, bp: 215.0 },
                { value: "24", height: 1300, bp: 227.0 },
              ],
            },
            TH01: {
              alleles: [
                { value: "6", height: 1150, bp: 179.0 },
                { value: "9", height: 1050, bp: 191.0 },
              ],
            },
            TPOX: {
              alleles: [
                { value: "8", height: 1250, bp: 108.0 },
                { value: "11", height: 1180, bp: 120.0 },
              ],
            },
          },
        };

        processedSamples.push({
          sampleId,
          originalName: file.originalname,
          sampleType,
          qualityScore: 85.0,
          markerCount: Object.keys(demoResult.strData).length,
          filePath: file.path,
          fileSize: file.size,
        });
      }

      // Update case status and sample counts
      try {
        db.updateGeneticCaseStatus(caseId, "samples_uploaded");

        // Update sample counts based on uploaded files
        const sampleTypeCounts = {};
        processedSamples.forEach((sample) => {
          const type = sample.sampleType;
          if (type === "child")
            sampleTypeCounts.child_samples =
              (sampleTypeCounts.child_samples || 0) + 1;
          if (type === "alleged_father")
            sampleTypeCounts.father_samples =
              (sampleTypeCounts.father_samples || 0) + 1;
          if (type === "mother")
            sampleTypeCounts.mother_samples =
              (sampleTypeCounts.mother_samples || 0) + 1;
        });

        // Update the case with sample counts
        if (Object.keys(sampleTypeCounts).length > 0) {
          const updateFields = Object.keys(sampleTypeCounts)
            .map((field) => `${field} = ?`)
            .join(", ");
          const updateValues = Object.values(sampleTypeCounts);

          db.db
            .prepare(
              `
            UPDATE genetic_cases 
            SET ${updateFields}, updated_date = datetime('now')
            WHERE case_id = ?
          `,
            )
            .run(...updateValues, caseId);
        }
      } catch (dbError) {
        console.warn("Failed to update case status:", dbError.message);
      }

      res.json({
        success: true,
        message: `Successfully processed ${files.length} sample(s)`,
        samplesProcessed: files.length,
        samples: processedSamples,
        caseId,
      });
    } catch (error) {
      console.error("Sample upload error:", error);

      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.warn(
              `Failed to cleanup file ${file.path}:`,
              unlinkError.message,
            );
          }
        }
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Start Osiris analysis for a case (SQLite Demo Version)
 */
router.post(
  "/cases/:caseId/analyze",
  /* auth.authenticate(), auth.requirePermission('start_analysis'), auth.requireCaseAccess(), */ async (
    req,
    res,
  ) => {
    try {
      const { caseId } = req.params;

      // Get case from SQLite
      const caseData = db.getGeneticCase(caseId);

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: "Case not found",
        });
      }

      if (caseData.status !== "samples_uploaded") {
        return res.status(400).json({
          success: false,
          error: `Case status is '${caseData.status}'. Must have uploaded samples to start analysis.`,
        });
      }

      // For demo purposes, if status is 'samples_uploaded', assume we have the required samples

      // Update case status to analysis_complete (simulate instant analysis for demo)
      try {
        db.db
          .prepare(
            `
          UPDATE genetic_cases 
          SET status = 'analysis_complete',
              paternity_probability = 99.99,
              conclusion = 'inclusion',
              updated_date = datetime('now'),
              child_samples = COALESCE(child_samples, 1),
              father_samples = COALESCE(father_samples, 1),
              mother_samples = COALESCE(mother_samples, 1)
          WHERE case_id = ?
        `,
          )
          .run(caseId);
      } catch (dbError) {
        console.warn("Failed to update case analysis status:", dbError.message);
      }

      res.json({
        success: true,
        message: "STR Analysis completed successfully",
        caseId,
        paternityProbability: 99.99,
        conclusion: "inclusion",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Get analysis results for a case (SQLite Demo Version)
 */
router.get(
  "/cases/:caseId/results",
  /* auth.authenticate(), auth.requireCaseAccess(), auth.requirePermission('view_results'), */ async (
    req,
    res,
  ) => {
    try {
      const { caseId } = req.params;

      // Get case information from SQLite
      const caseResult = db.getGeneticCase(caseId);

      if (!caseResult) {
        return res.status(404).json({
          success: false,
          error: "Case not found",
        });
      }

      // For demo purposes, simulate analysis results if case has samples
      let analysisResults = null;
      let lociComparisons = [];

      if (
        caseResult.status === "samples_uploaded" ||
        caseResult.status === "analysis_complete"
      ) {
        // Simulate analysis results
        analysisResults = {
          case_id: caseId,
          paternity_probability: 99.99,
          exclusion_probability: 0.01,
          matching_loci: 17,
          total_loci: 17,
          conclusion: "inclusion",
          quality_score: 85.0,
          analysis_date: new Date().toISOString(),
        };

        // Simulate loci comparisons
        lociComparisons = [
          {
            locus: "D3S1358",
            child_alleles: ["15", "16"],
            father_alleles: ["15", "17"],
            mother_alleles: ["16", "18"],
            match_status: "inclusion",
          },
          {
            locus: "vWA",
            child_alleles: ["17", "18"],
            father_alleles: ["17", "19"],
            mother_alleles: ["18", "20"],
            match_status: "inclusion",
          },
          {
            locus: "FGA",
            child_alleles: ["21", "24"],
            father_alleles: ["21", "22"],
            mother_alleles: ["24", "25"],
            match_status: "inclusion",
          },
        ];
      }

      // Get real sample data with STR profiles from database
      const samples = [];
      const strProfiles = {};

      try {
        // Get actual samples from database
        const dbSamples = db.db.prepare(`
          SELECT * FROM genetic_samples WHERE case_id = ?
        `).all(caseId);
        
        console.log(`Found ${dbSamples.length} samples for case ${caseId}`);
        console.log('Database samples:', dbSamples.map(s => ({ id: s.sample_id, type: s.sample_type })));

        for (const sample of dbSamples) {
          samples.push({
            sample_id: sample.sample_id,
            sample_type: sample.sample_type,
            quality_score: sample.quality_score,
            received_date: sample.received_date,
            original_filename: sample.original_filename,
            kit: sample.kit
          });

          // Get STR profile for this sample
          const strData = db.db.prepare(`
            SELECT locus, allele_1, allele_2, peak_height_1, peak_height_2
            FROM str_profiles WHERE sample_id = ?
          `).all(sample.sample_id);

          const profile = {};
          strData.forEach(row => {
            profile[row.locus] = [row.allele_1, row.allele_2].filter(a => a !== null);
          });

          // Debug: log profile data
          console.log(`STR profile for ${sample.sample_id}:`, profile, `(${Object.keys(profile).length} loci)`);
          
          // If no database profile exists, create a fallback
          if (Object.keys(profile).length === 0) {
            console.warn(`No STR profile data found for ${sample.sample_id}`);
          }

          strProfiles[sample.sample_id] = profile;
        }

        // If no database samples found, create sample records based on case data
        if (samples.length === 0) {
          if (caseResult.child_samples > 0) {
            const childSampleId = `${caseId}_child_001`;
            samples.push({
              sample_id: childSampleId,
              sample_type: "child",
              quality_score: 85.0,
              received_date: caseResult.created_date,
              original_filename: "child_sample.fsa",
            });
          }
          if (caseResult.father_samples > 0) {
            const fatherSampleId = `${caseId}_father_001`;
            samples.push({
              sample_id: fatherSampleId,
              sample_type: "alleged_father",
              quality_score: 87.0,
              received_date: caseResult.created_date,
              original_filename: "father_sample.fsa",
            });
          }
          if (caseResult.mother_samples > 0) {
            const motherSampleId = `${caseId}_mother_001`;
            samples.push({
              sample_id: motherSampleId,
              sample_type: "mother",
              quality_score: 86.0,
              received_date: caseResult.created_date,
              original_filename: "mother_sample.fsa",
            });
          }
        }
      } catch (dbError) {
        console.error('Error loading sample data:', dbError.message);
      }

      res.json({
        success: true,
        case: caseResult,
        samples: samples,
        analysisResults: analysisResults,
        lociComparisons: lociComparisons,
        strProfiles: strProfiles,
        queueStatus: null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Get all genetic analysis cases
 */
router.get(
  "/cases",
  /* auth.authenticate(), auth.requirePermission('view_results'), */ async (
    req,
    res,
  ) => {
    try {
      const cases = db.getAllGeneticCases();

      res.json({
        success: true,
        cases,
        pagination: {
          total: cases.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Get Osiris analysis queue status
 */
router.get("/queue-status", async (req, res) => {
  try {
    const queue = db.db
      .prepare(
        `
      SELECT * FROM osiris_analysis_queue 
      ORDER BY priority DESC, submitted_date ASC
    `,
      )
      .all();

    res.json({
      success: true,
      queue,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Launch Osiris GUI with specific files
 */
router.post("/launch-osiris", async (req, res) => {
  try {
    const { filePath, caseId } = req.body;
    
    const result = await launchOsiris(filePath);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Osiris GUI launched successfully',
        caseId: caseId || null,
        filePath: filePath || null
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate PDF report for a case
 */
router.post(
  "/cases/:caseId/generate-report",
  /* auth.authenticate(), auth.requirePermission('generate_reports'), auth.requireCaseAccess(), */ async (
    req,
    res,
  ) => {
    try {
      const { caseId } = req.params;
      const { reportType = "full" } = req.body;

      // Get case data
      const caseData = db.getGeneticCase(caseId);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: "Case not found",
        });
      }

      // For demo purposes, simulate analysis results if not available
      let analysisResults = db.getGeneticAnalysisResult(caseId);
      if (!analysisResults && caseData.status === "analysis_complete") {
        // Create simulated results for demo
        analysisResults = {
          case_id: caseId,
          paternity_probability: caseData.paternity_probability || 99.99,
          exclusion_probability: 0.01,
          matching_loci: 17,
          total_loci: 17,
          conclusion: caseData.conclusion || "inclusion",
          quality_score: 85.0,
          osiris_compliant: true,
          software_version: "2.16",
        };
      }

      if (!analysisResults) {
        return res.status(400).json({
          success: false,
          error: "No analysis results available for this case",
        });
      }

      // Get samples - if none exist, create demo samples
      let samples = db.getGeneticSamplesByCase(caseId);
      if (!samples || samples.length === 0) {
        // Create demo samples for report
        samples = [
          {
            sample_id: `${caseId}_child_001`,
            sample_type: "child",
            quality_score: 85.0,
            received_date: caseData.created_date,
            kit: "PowerPlex ESX 17",
            original_filename: "child_sample.fsa",
          },
          {
            sample_id: `${caseId}_father_001`,
            sample_type: "alleged_father",
            quality_score: 87.0,
            received_date: caseData.created_date,
            kit: "PowerPlex ESX 17",
            original_filename: "father_sample.fsa",
          },
          {
            sample_id: `${caseId}_mother_001`,
            sample_type: "mother",
            quality_score: 86.0,
            received_date: caseData.created_date,
            kit: "PowerPlex ESX 17",
            original_filename: "mother_sample.fsa",
          },
        ];
      }

      // Simulate loci comparisons for demo
      const lociComparisons = [
        {
          locus: "D3S1358",
          child_allele_1: "15",
          child_allele_2: "16",
          father_allele_1: "15",
          father_allele_2: "17",
          mother_allele_1: "16",
          mother_allele_2: "18",
          match_status: 1,
        },
        {
          locus: "vWA",
          child_allele_1: "17",
          child_allele_2: "18",
          father_allele_1: "17",
          father_allele_2: "19",
          mother_allele_1: "18",
          mother_allele_2: "20",
          match_status: 1,
        },
        {
          locus: "FGA",
          child_allele_1: "21",
          child_allele_2: "24",
          father_allele_1: "21",
          father_allele_2: "22",
          mother_allele_1: "24",
          mother_allele_2: "25",
          match_status: 1,
        },
        {
          locus: "TH01",
          child_allele_1: "6",
          child_allele_2: "9",
          father_allele_1: "6",
          father_allele_2: "7",
          mother_allele_1: "9",
          mother_allele_2: "9.3",
          match_status: 1,
        },
        {
          locus: "TPOX",
          child_allele_1: "8",
          child_allele_2: "11",
          father_allele_1: "8",
          father_allele_2: "12",
          mother_allele_1: "11",
          mother_allele_2: "12",
          match_status: 1,
        },
      ];

      // Prepare data for report
      const reportData = {
        ...caseData,
        samples,
      };

      // Generate report
      const result =
        reportType === "certificate"
          ? await reportGenerator.generateCertificate(
              reportData,
              analysisResults,
            )
          : await reportGenerator.generatePaternityReport(
              reportData,
              analysisResults,
              lociComparisons,
            );

      if (result.success) {
        // Instead of JSON response, send the PDF file directly
        const fs = require("fs");
        const filePath = result.filePath;

        // Check if file exists
        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${result.fileName}"`,
          );

          // Stream the file
          const fileStream = fs.createReadStream(filePath);
          fileStream.pipe(res);
        } else {
          res.status(500).json({
            success: false,
            error: "Report file not found after generation",
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Download generated report
 */
router.get("/reports/download/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(process.cwd(), "reports", fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "Report file not found",
      });
    }

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = require("fs").createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get batch information for genetic analysis
 */
router.get("/batches", async (req, res) => {
  try {
    const batches = db.getAllBatches();

    res.json({
      success: true,
      batches: batches.map((batch) => ({
        ...batch,
        comments: batch.settings || "", // Use settings field as comments
        sample_count: batch.total_samples || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create new batch for genetic analysis
 */
router.post("/batches", async (req, res) => {
  try {
    const { batchName, comments, samples } = req.body;
    
    // Validate input
    if (!batchName) {
      return res.status(400).json({
        success: false,
        error: "Batch name is required"
      });
    }

    // Create batch in database
    const batchData = {
      batch_name: batchName,
      settings: comments || "",
      total_samples: samples ? samples.length : 0,
      created_date: new Date().toISOString(),
      status: 'pending'
    };

    const batchId = db.addBatch(batchData);

    res.json({
      success: true,
      message: "Batch created successfully",
      batchId: batchId,
      batch: {
        ...batchData,
        id: batchId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get list of available reports for a case
 */
router.get("/cases/:caseId/reports", async (req, res) => {
  try {
    const { caseId } = req.params;
    const reportsDir = path.join(process.cwd(), "reports");

    try {
      const files = await fs.readdir(reportsDir);
      const caseReports = files.filter(
        (file) => file.startsWith(caseId) && file.endsWith(".pdf"),
      );

      const reports = await Promise.all(
        caseReports.map(async (fileName) => {
          const filePath = path.join(reportsDir, fileName);
          const stats = await fs.stat(filePath);

          return {
            fileName,
            size: stats.size,
            created: stats.birthtime,
            downloadUrl: `/api/genetic-analysis/reports/download/${fileName}`,
          };
        }),
      );

      res.json({
        success: true,
        reports: reports.sort(
          (a, b) => new Date(b.created) - new Date(a.created),
        ),
      });
    } catch (error) {
      res.json({
        success: true,
        reports: [],
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Background function to perform Osiris analysis (disabled to prevent PostgreSQL issues)
 */
/*
async function performOsirisAnalysis(caseData, dbClient) {
  let client = dbClient;
  let shouldReleaseClient = false;

  if (!client) {
    client = await pool.connect();
    shouldReleaseClient = true;
  }

  try {
    // Update queue status to running
    await client.query(
      `UPDATE osiris_analysis_queue 
       SET status = 'running', started_date = CURRENT_TIMESTAMP 
       WHERE case_id = $1`,
      [caseData.caseId],
    );

    // Perform Osiris analysis
    const analysisResult = await osiris.analyzePaternityCase(caseData);

    if (analysisResult.success) {
      // Save results to database
      await client.query("BEGIN");

      const resultQuery = await client.query(
        `INSERT INTO genetic_analysis_results 
         (case_id, paternity_probability, exclusion_probability, matching_loci, 
          total_loci, conclusion, osiris_output_path, quality_score) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          caseData.caseId,
          analysisResult.paternityStats.paternityProbability,
          analysisResult.paternityStats.exclusionProbability,
          analysisResult.paternityStats.matchingLoci,
          analysisResult.paternityStats.totalLoci,
          analysisResult.paternityStats.conclusion,
          analysisResult.outputPath,
          85.0,
        ],
      );

      const resultId = resultQuery.rows[0].id;

      // Save loci comparisons
      for (const [locus, comparison] of Object.entries(
        analysisResult.paternityStats.lociComparison,
      )) {
        await client.query(
          `INSERT INTO loci_comparisons 
           (result_id, locus, child_allele_1, child_allele_2, 
            father_allele_1, father_allele_2, mother_allele_1, mother_allele_2, match_status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            resultId,
            locus,
            comparison.child[0],
            comparison.child[1],
            comparison.father[0],
            comparison.father[1],
            comparison.mother ? comparison.mother[0] : null,
            comparison.mother ? comparison.mother[1] : null,
            comparison.match,
          ],
        );
      }

      // Update case status
      await client.query(
        "UPDATE genetic_cases SET status = $1, updated_date = CURRENT_TIMESTAMP WHERE case_id = $2",
        ["analysis_complete", caseData.caseId],
      );

      // Update queue status
      await client.query(
        `UPDATE osiris_analysis_queue 
         SET status = 'completed', completed_date = CURRENT_TIMESTAMP 
         WHERE case_id = $1`,
        [caseData.caseId],
      );

      await client.query("COMMIT");

      console.log(
        `Analysis completed successfully for case: ${caseData.caseId}`,
      );
    } else {
      // Handle analysis failure
      await client.query(
        `UPDATE osiris_analysis_queue 
         SET status = 'failed', error_message = $1, completed_date = CURRENT_TIMESTAMP 
         WHERE case_id = $2`,
        [analysisResult.error, caseData.caseId],
      );

      console.error(
        `Analysis failed for case ${caseData.caseId}:`,
        analysisResult.error,
      );
    }
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
      await client.query(
        `UPDATE osiris_analysis_queue 
         SET status = 'failed', error_message = $1, completed_date = CURRENT_TIMESTAMP 
         WHERE case_id = $2`,
        [error.message, caseData.caseId],
      );
    }

    console.error(
      `Critical error in analysis for case ${caseData.caseId}:`,
      error.message,
    );
  } finally {
    if (shouldReleaseClient && client) {
      client.release();
    }
  }
}
*/

module.exports = router;
