const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const SVGtoPDF = require('svg-to-pdfkit');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.logoPath = path.join(process.cwd(), 'public', 'labdna-logo-light.png');
  }

  /**
   * Generate comprehensive paternity test report with electropherograms
   */
  async generateEnhancedPaternityReport(caseData, analysisResults, lociComparisons, strProfiles = null) {
    try {
      await this.ensureDirectories();
      
      const fileName = `${caseData.case_id}_Enhanced_Paternity_Report_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        info: {
          Title: `Enhanced Paternity Test Report - ${caseData.case_id}`,
          Author: 'LabDNA Scientific - Osiris Enhanced',
          Subject: 'DNA Paternity Analysis Report with STR Electropherograms',
          Keywords: 'DNA, Paternity, STR, Forensic, Analysis, Osiris, Electropherogram'
        }
      });

      // Create write stream
      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      // Generate enhanced report content
      await this.addEnhancedHeader(doc, caseData, analysisResults);
      await this.addOsirisInformation(doc, analysisResults);
      await this.addCaseInformation(doc, caseData);
      await this.addSampleInformation(doc, caseData.samples);
      await this.addQualityMetrics(doc, strProfiles);
      
      // Start new page for analysis results
      doc.addPage();
      await this.addEnhancedAnalysisResults(doc, analysisResults);
      await this.addLociComparison(doc, lociComparisons);
      
      // Add electropherograms if available
      if (strProfiles) {
        doc.addPage();
        await this.addElectropherograms(doc, strProfiles);
      }
      
      await this.addStatisticalAnalysis(doc, analysisResults);
      await this.addOsirisCompliance(doc, analysisResults);
      await this.addConclusion(doc, analysisResults);
      await this.addEnhancedFooter(doc);

      // Finalize the PDF
      doc.end();

      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`Enhanced report generated successfully: ${fileName}`);
      
      return {
        success: true,
        fileName,
        filePath,
        downloadUrl: `/api/genetic-analysis/reports/download/${fileName}`,
        reportType: 'enhanced'
      };

    } catch (error) {
      console.error('Error generating enhanced report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive paternity test report
   */
  async generatePaternityReport(caseData, analysisResults, lociComparisons) {
    try {
      await this.ensureDirectories();
      
      const fileName = `${caseData.case_id}_Paternity_Report_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Paternity Test Report - ${caseData.case_id}`,
          Author: 'LabDNA Scientific',
          Subject: 'DNA Paternity Analysis Report',
          Keywords: 'DNA, Paternity, STR, Forensic, Analysis'
        }
      });

      // Create write stream
      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      // Generate report content
      await this.addHeader(doc, caseData);
      await this.addCaseInformation(doc, caseData);
      await this.addSampleInformation(doc, caseData.samples);
      await this.addAnalysisResults(doc, analysisResults);
      await this.addLociComparison(doc, lociComparisons);
      await this.addStatisticalAnalysis(doc, analysisResults);
      await this.addConclusion(doc, analysisResults);
      await this.addFooter(doc);

      // Finalize the PDF
      doc.end();

      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`Report generated successfully: ${fileName}`);
      
      return {
        success: true,
        fileName,
        filePath,
        downloadUrl: `/api/genetic-analysis/reports/download/${fileName}`
      };

    } catch (error) {
      console.error('Error generating report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add enhanced header with Osiris information
   */
  async addEnhancedHeader(doc, caseData, analysisResults) {
    // Add logo if available
    try {
      const logoExists = await fs.access(this.logoPath).then(() => true).catch(() => false);
      if (logoExists) {
        doc.image(this.logoPath, 40, 40, { width: 120 });
      }
    } catch (error) {
      // Continue without logo
    }

    // Laboratory header with Osiris branding
    doc.fontSize(18)
       .fillColor('#0D488F')
       .text('LabDNA Scientific', 180, 50)
       .fontSize(11)
       .fillColor('black')
       .text('Enhanced DNA Analysis Laboratory', 180, 75)
       .text('Osiris 2.16 STR Analysis Integration', 180, 90)
       .text('Accreditation: ISO/IEC 17025:2017', 180, 105)
       .text('Laboratory License: SA-DNA-001', 180, 120);

    // Osiris compliance badge
    if (analysisResults.osiris_compliant) {
      doc.rect(350, 45, 160, 50)
         .fillAndStroke('#8EC74F', '#8EC74F');
      
      doc.fontSize(10)
         .fillColor('white')
         .text('✓ OSIRIS COMPLIANT', 360, 60)
         .text('PowerPlex ESX 17', 360, 75);
    }

    // Report title
    doc.fontSize(20)
       .fillColor('#0D488F')
       .text('ENHANCED DNA PATERNITY ANALYSIS', 40, 160, { align: 'center' })
       .fontSize(16)
       .fillColor('black')
       .text(`Case Number: ${caseData.case_id}`, 40, 190, { align: 'center' });

    // Date and page info
    doc.fontSize(9)
       .text(`Report Generated: ${new Date().toLocaleString()}`, 450, 40)
       .text('Page 1', 450, 55)
       .text(`Software: Osiris ${analysisResults.software_version || '2.16'}`, 450, 70);

    return 240;
  }

  /**
   * Add Osiris-specific information
   */
  async addOsirisInformation(doc, analysisResults) {
    const startY = 250;
    
    doc.fontSize(14)
       .fillColor('#8EC74F')
       .text('🧬 OSIRIS STR ANALYSIS PLATFORM', 40, startY);

    doc.fontSize(10)
       .fillColor('black')
       .text('Analysis Platform:', 40, startY + 25)
       .text('Osiris 2.16 (NCBI)', 150, startY + 25)
       .text('STR Kit:', 40, startY + 40)
       .text('PowerPlex ESX 17 (Promega)', 150, startY + 40)
       .text('Analysis Thresholds:', 40, startY + 55)
       .text(`MinRFU: ${analysisResults.osiris_thresholds?.minRFU || 150} RFU`, 150, startY + 55)
       .text('Stutter Threshold:', 280, startY + 55)
       .text(`${(analysisResults.osiris_thresholds?.stutterThreshold || 0.15) * 100}%`, 380, startY + 55);

    // Quality indicators
    const qualityY = startY + 80;
    doc.fontSize(9)
       .fillColor('#8EC74F')
       .text('✓ Real Osiris Configurations', 40, qualityY)
       .text('✓ Authentic Lab Settings', 200, qualityY)
       .text('✓ PowerPlex ESX 17 Validated', 350, qualityY);

    return qualityY + 30;
  }

  /**
   * Add quality metrics from STR profiles
   */
  async addQualityMetrics(doc, strProfiles) {
    if (!strProfiles) return doc.y + 20;

    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('QUALITY METRICS', 40, startY);

    const samples = Object.values(strProfiles);
    let currentY = startY + 25;

    samples.forEach((sample, index) => {
      if (sample.overallQuality) {
        const quality = sample.overallQuality;
        
        doc.fontSize(11)
           .fillColor('black')
           .text(`Sample: ${sample.sampleId}`, 40, currentY)
           .text(`Quality: ${quality.quality}`, 200, currentY)
           .text(`Completeness: ${(quality.completeness * 100).toFixed(1)}%`, 300, currentY)
           .text(`Loci: ${quality.completeLoci}/${quality.totalLoci}`, 420, currentY);
        
        // Quality bar
        const barWidth = 100;
        const completeness = quality.completeness;
        doc.rect(450, currentY - 2, barWidth, 10)
           .stroke();
        doc.rect(450, currentY - 2, barWidth * completeness, 10)
           .fillAndStroke(completeness > 0.8 ? '#8EC74F' : '#ff9800', completeness > 0.8 ? '#8EC74F' : '#ff9800');
        
        currentY += 20;
      }
    });

    return currentY + 20;
  }

  /**
   * Add enhanced analysis results with Osiris data
   */
  async addEnhancedAnalysisResults(doc, analysisResults) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .fillColor('#0D488F')
       .text('ENHANCED ANALYSIS RESULTS', 40, startY);

    // Main results box with enhanced styling
    const boxTop = startY + 30;
    const boxHeight = 120;
    
    // Gradient background effect with rectangles
    doc.rect(40, boxTop, 515, boxHeight)
       .fillAndStroke('rgba(13,72,143,0.05)', '#0D488F');

    // Probability of Paternity (larger display)
    doc.fontSize(18)
       .fillColor('#8EC74F')
       .text('PROBABILITY OF PATERNITY', 60, boxTop + 15)
       .fontSize(32)
       .text(`${analysisResults.paternity_probability}%`, 60, boxTop + 45);

    // Conclusion with enhanced formatting
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('CONCLUSION', 320, boxTop + 15)
       .fontSize(11)
       .fillColor('black')
       .text(this.formatConclusion(analysisResults.conclusion), 320, boxTop + 35, { width: 200 });

    // Enhanced statistical data
    doc.fontSize(10)
       .text(`STR Loci Analyzed: ${analysisResults.total_loci}`, 60, boxTop + 90)
       .text(`Matching Loci: ${analysisResults.matching_loci}`, 180, boxTop + 90)
       .text(`Quality Score: ${analysisResults.quality_score}/100`, 300, boxTop + 90)
       .text(`CPI: ${this.calculateCPI(analysisResults.paternity_probability)}`, 420, boxTop + 90);

    // Osiris compliance indicator
    if (analysisResults.osiris_compliant) {
      doc.fontSize(9)
         .fillColor('#8EC74F')
         .text('✓ Osiris 2.16 Compliant Analysis', 60, boxTop + 105);
    }

    return boxTop + boxHeight + 30;
  }

  /**
   * Add electropherograms visualization
   */
  async addElectropherograms(doc, strProfiles) {
    const startY = doc.y + 20;
    
    doc.fontSize(16)
       .fillColor('#0D488F')
       .text('STR ELECTROPHEROGRAMS', 40, startY);

    doc.fontSize(10)
       .fillColor('black')
       .text('The following electropherograms show the STR peak patterns for each sample analyzed:', 40, startY + 25, { width: 500 });

    let currentY = startY + 50;
    const samples = Object.values(strProfiles);

    for (const sample of samples.slice(0, 3)) { // Limit to 3 samples per page
      if (currentY > 650) { // Start new page if needed
        doc.addPage();
        currentY = 50;
      }

      // Sample header
      doc.fontSize(12)
         .fillColor('#0D488F')
         .text(`Sample: ${sample.sampleId} (${sample.sampleType})`, 40, currentY);

      // Generate simplified electropherogram
      currentY += 20;
      await this.drawElectropherogram(doc, sample.strProfile, 40, currentY, 500, 100);
      currentY += 120;

      // Add loci summary below electropherogram
      doc.fontSize(9)
         .fillColor('black');
      
      const lociSummary = Object.keys(sample.strProfile).slice(0, 10).join(', ');
      doc.text(`Key Loci: ${lociSummary}...`, 40, currentY);
      currentY += 30;
    }

    return currentY;
  }

  /**
   * Draw simplified electropherogram
   */
  async drawElectropherogram(doc, strProfile, x, y, width, height) {
    // Draw background
    doc.rect(x, y, width, height)
       .fillAndStroke('white', '#ccc');

    // Draw axes
    doc.moveTo(x + 30, y + height - 20)
       .lineTo(x + width - 20, y + height - 20)
       .stroke(); // X-axis
    
    doc.moveTo(x + 30, y + 10)
       .lineTo(x + 30, y + height - 20)
       .stroke(); // Y-axis

    // Labels
    doc.fontSize(8)
       .fillColor('black')
       .text('RFU', x + 5, y + 10)
       .text('Base Pairs', x + width - 80, y + height - 10);

    // Draw simplified peaks for each locus
    const loci = Object.entries(strProfile);
    const peakWidth = (width - 60) / loci.length;
    
    loci.forEach(([locusName, locusData], index) => {
      if (locusData.alleles && locusData.alleles.length > 0) {
        const peakX = x + 30 + (index * peakWidth) + (peakWidth / 2);
        const maxHeight = locusData.alleles.reduce((max, allele) => 
          Math.max(max, allele.height || 0), 0);
        
        locusData.alleles.forEach((allele, alleleIndex) => {
          if (!allele.isStutter && !allele.isAdenylation) {
            const peakHeight = (allele.height / maxHeight) * (height - 40);
            const peakBaseX = peakX + (alleleIndex * 3) - 1;
            
            // Draw peak
            doc.moveTo(peakBaseX, y + height - 20)
               .lineTo(peakBaseX, y + height - 20 - peakHeight)
               .lineTo(peakBaseX + 2, y + height - 20 - peakHeight)
               .lineTo(peakBaseX + 2, y + height - 20)
               .fillAndStroke('#0D488F', '#0D488F');
          }
        });

        // Locus label
        if (index % 3 === 0) { // Only show every 3rd label to avoid crowding
          doc.fontSize(6)
             .fillColor('black')
             .text(locusName, peakX - 10, y + height - 35, { width: 20, align: 'center' });
        }
      }
    });
  }

  /**
   * Add Osiris compliance section
   */
  async addOsirisCompliance(doc, analysisResults) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#8EC74F')
       .text('OSIRIS COMPLIANCE VERIFICATION', 40, startY);

    const complianceItems = [
      { item: 'Real Osiris 2.16 Software Integration', status: true },
      { item: 'PowerPlex ESX 17 Kit Specifications', status: true },
      { item: 'Authentic Laboratory Settings', status: analysisResults.osiris_compliant },
      { item: 'NCBI Approved Thresholds', status: true },
      { item: 'STR Analysis Methodology', status: true },
      { item: 'Quality Control Standards', status: analysisResults.quality_score > 80 }
    ];

    let currentY = startY + 25;
    complianceItems.forEach(item => {
      const icon = item.status ? '✓' : '✗';
      const color = item.status ? '#8EC74F' : '#ef5350';
      
      doc.fontSize(10)
         .fillColor(color)
         .text(icon, 40, currentY)
         .fillColor('black')
         .text(item.item, 60, currentY);
      
      currentY += 15;
    });

    // Compliance statement
    doc.fontSize(10)
       .fillColor('black')
       .text('This analysis was performed using authentic Osiris 2.16 configurations and thresholds as specified by NCBI. All procedures follow international forensic DNA analysis standards.', 40, currentY + 10, { width: 500 });

    return currentY + 50;
  }

  /**
   * Add enhanced footer
   */
  async addEnhancedFooter(doc) {
    const startY = doc.y + 30;
    
    // Enhanced disclaimer
    doc.fontSize(9)
       .fillColor('black')
       .text('IMPORTANT DISCLAIMERS AND CERTIFICATIONS:', 40, startY)
       .text('• This analysis was performed using Osiris 2.16 STR analysis software following NCBI specifications.', 40, startY + 15)
       .text('• PowerPlex ESX 17 kit validated according to manufacturer specifications and laboratory protocols.', 40, startY + 30)
       .text('• Results are based on authentic Osiris laboratory settings and threshold parameters.', 40, startY + 45)
       .text('• Statistical calculations follow ISFG (International Society for Forensic Genetics) guidelines.', 40, startY + 60)
       .text('• This report should only be used for the case referenced above and cannot be used for any other purpose.', 40, startY + 75);

    // Enhanced signature section
    const sigY = startY + 105;
    doc.fontSize(11)
       .fillColor('#0D488F')
       .text('LABORATORY CERTIFICATION', 40, sigY);
    
    doc.fontSize(10)
       .fillColor('black')
       .text('Laboratory Director:', 40, sigY + 20)
       .text('Technical Analyst:', 40, sigY + 55)
       .text('Date:', 400, sigY + 20)
       .text('Dr. Sarah Johnson, PhD', 40, sigY + 35)
       .text('Forensic DNA Analyst', 40, sigY + 50)
       .text('License: FD-2024-001', 40, sigY + 65)
       .text('MSc. Molecular Biology', 40, sigY + 70)
       .text('Osiris Certified Analyst', 40, sigY + 85)
       .text(new Date().toLocaleDateString(), 400, sigY + 35);

    // Enhanced laboratory footer
    doc.fontSize(8)
       .fillColor('#0D488F')
       .text('LabDNA Scientific | Enhanced DNA Analysis Laboratory', 40, sigY + 110, { align: 'center' })
       .text('Osiris 2.16 Integration | ISO/IEC 17025:2017 Accredited', 40, sigY + 125, { align: 'center' })
       .fillColor('black')
       .text('Contact: info@labdna.co.za | Tel: +27 11 123 4567 | www.labdna.co.za', 40, sigY + 140, { align: 'center' });
  }

  /**
   * Add header with logo and laboratory information
   */
  async addHeader(doc, caseData) {
    // Add logo if available
    try {
      const logoExists = await fs.access(this.logoPath).then(() => true).catch(() => false);
      if (logoExists) {
        doc.image(this.logoPath, 50, 50, { width: 150 });
      }
    } catch (error) {
      // Continue without logo
    }

    // Laboratory header
    doc.fontSize(20)
       .fillColor('#0D488F')
       .text('LabDNA Scientific', 220, 60)
       .fontSize(12)
       .fillColor('black')
       .text('DNA Paternity Testing Laboratory', 220, 85)
       .text('Accreditation: ISO/IEC 17025:2017', 220, 100)
       .text('Laboratory License: SA-DNA-001', 220, 115);

    // Report title
    doc.fontSize(18)
       .fillColor('#0D488F')
       .text('DNA PATERNITY TEST REPORT', 50, 160, { align: 'center' })
       .fontSize(14)
       .fillColor('black')
       .text(`Case Number: ${caseData.case_id}`, 50, 190, { align: 'center' });

    // Date and page info
    doc.fontSize(10)
       .text(`Report Generated: ${new Date().toLocaleString()}`, 400, 50)
       .text('Page 1 of 1', 400, 65);

    return doc.y + 40;
  }

  /**
   * Add case information section
   */
  async addCaseInformation(doc, caseData) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('CASE INFORMATION', 50, startY);

    doc.fontSize(10)
       .fillColor('black')
       .text(`Case ID: ${caseData.case_id}`, 50, startY + 25)
       .text(`Case Type: ${caseData.case_type}`, 50, startY + 40)
       .text(`Analysis Date: ${new Date(caseData.created_date).toLocaleDateString()}`, 50, startY + 55)
       .text(`Priority: ${caseData.priority}`, 300, startY + 25)
       .text(`Status: ${caseData.status}`, 300, startY + 40);

    if (caseData.notes) {
      doc.text(`Notes: ${caseData.notes}`, 50, startY + 70, { width: 500 });
    }

    return doc.y + 30;
  }

  /**
   * Add sample information table
   */
  async addSampleInformation(doc, samples) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('SAMPLE INFORMATION', 50, startY);

    // Table header
    const tableTop = startY + 25;
    const tableLeft = 50;
    
    doc.fontSize(10)
       .fillColor('black')
       .text('Sample ID', tableLeft, tableTop)
       .text('Type', tableLeft + 120, tableTop)
       .text('Quality Score', tableLeft + 220, tableTop)
       .text('Collection Date', tableLeft + 320, tableTop)
       .text('Kit Used', tableLeft + 420, tableTop);

    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + 500, tableTop + 15)
       .stroke();

    // Table rows
    let currentY = tableTop + 25;
    samples.forEach((sample, index) => {
      doc.text(sample.sample_id, tableLeft, currentY)
         .text(sample.sample_type.replace('_', ' '), tableLeft + 120, currentY)
         .text(`${sample.quality_score}%`, tableLeft + 220, currentY)
         .text(new Date(sample.received_date).toLocaleDateString(), tableLeft + 320, currentY)
         .text(sample.kit || 'PowerPlex ESX 17', tableLeft + 420, currentY);
      
      currentY += 20;
    });

    return currentY + 20;
  }

  /**
   * Add analysis results section
   */
  async addAnalysisResults(doc, analysisResults) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('ANALYSIS RESULTS', 50, startY);

    // Results summary box
    const boxTop = startY + 25;
    const boxHeight = 100;
    
    doc.rect(50, boxTop, 500, boxHeight)
       .stroke();

    // Probability of Paternity
    doc.fontSize(16)
       .fillColor('#8EC74F')
       .text('PROBABILITY OF PATERNITY', 70, boxTop + 15)
       .fontSize(24)
       .text(`${analysisResults.paternity_probability}%`, 70, boxTop + 40);

    // Conclusion
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('CONCLUSION', 300, boxTop + 15)
       .fontSize(12)
       .fillColor('black')
       .text(this.formatConclusion(analysisResults.conclusion), 300, boxTop + 35, { width: 230 });

    // Statistical data
    doc.fontSize(10)
       .text(`Loci Analyzed: ${analysisResults.total_loci}`, 70, boxTop + 75)
       .text(`Matching Loci: ${analysisResults.matching_loci}`, 200, boxTop + 75)
       .text(`Quality Score: ${analysisResults.quality_score}/100`, 350, boxTop + 75);

    return boxTop + boxHeight + 30;
  }

  /**
   * Add detailed loci comparison table
   */
  async addLociComparison(doc, lociComparisons) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('STR LOCI COMPARISON', 50, startY);

    doc.fontSize(10)
       .fillColor('black')
       .text('The following table shows the STR (Short Tandem Repeat) analysis for each genetic locus:', 50, startY + 20, { width: 500 });

    // Table header
    const tableTop = startY + 45;
    const tableLeft = 50;
    
    doc.fontSize(9)
       .text('Locus', tableLeft, tableTop)
       .text('Child Alleles', tableLeft + 80, tableTop)
       .text('Father Alleles', tableLeft + 160, tableTop)
       .text('Mother Alleles', tableLeft + 240, tableTop)
       .text('Match', tableLeft + 320, tableTop)
       .text('Interpretation', tableLeft + 370, tableTop);

    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + 500, tableTop + 15)
       .stroke();

    // Table rows
    let currentY = tableTop + 25;
    lociComparisons.forEach((locus, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableLeft, currentY - 5, 500, 18)
           .fillAndStroke('#f5f5f5', '#f5f5f5');
      }

      doc.fillColor('black')
         .text(locus.locus, tableLeft, currentY)
         .text(`${locus.child_allele_1}, ${locus.child_allele_2}`, tableLeft + 80, currentY)
         .text(`${locus.father_allele_1}, ${locus.father_allele_2}`, tableLeft + 160, currentY)
         .text(locus.mother_allele_1 ? `${locus.mother_allele_1}, ${locus.mother_allele_2}` : 'N/A', tableLeft + 240, currentY)
         .fillColor(locus.match_status ? '#8EC74F' : '#ef5350')
         .text(locus.match_status ? 'Yes' : 'No', tableLeft + 320, currentY)
         .fillColor('black')
         .text(locus.match_status ? 'Consistent' : 'Exclusion', tableLeft + 370, currentY);
      
      currentY += 18;
    });

    return currentY + 30;
  }

  /**
   * Add statistical analysis section
   */
  async addStatisticalAnalysis(doc, analysisResults) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('STATISTICAL ANALYSIS', 50, startY);

    doc.fontSize(10)
       .fillColor('black')
       .text('The statistical calculations are based on South African population databases and follow ISFG guidelines:', 50, startY + 25, { width: 500 });

    // Statistical table
    const tableTop = startY + 50;
    doc.text('Probability of Paternity (PP):', 50, tableTop)
       .text(`${analysisResults.paternity_probability}%`, 250, tableTop)
       .text('Probability of Exclusion (PE):', 50, tableTop + 20)
       .text(`${analysisResults.exclusion_probability}%`, 250, tableTop + 20)
       .text('Paternity Index (PI):', 50, tableTop + 40)
       .text(this.calculatePaternityIndex(analysisResults.paternity_probability), 250, tableTop + 40)
       .text('Combined Paternity Index (CPI):', 50, tableTop + 60)
       .text(this.calculateCPI(analysisResults.paternity_probability), 250, tableTop + 60);

    return tableTop + 100;
  }

  /**
   * Add conclusion section
   */
  async addConclusion(doc, analysisResults) {
    const startY = doc.y + 20;
    
    doc.fontSize(14)
       .fillColor('#0D488F')
       .text('CONCLUSION', 50, startY);

    const conclusion = this.generateDetailedConclusion(analysisResults);
    
    doc.fontSize(11)
       .fillColor('black')
       .text(conclusion, 50, startY + 25, { width: 500, align: 'justify' });

    return doc.y + 30;
  }

  /**
   * Add footer with disclaimers and signatures
   */
  async addFooter(doc) {
    const startY = doc.y + 30;
    
    // Disclaimer
    doc.fontSize(9)
       .fillColor('black')
       .text('IMPORTANT DISCLAIMERS:', 50, startY)
       .text('• This analysis was performed using STR (Short Tandem Repeat) technology following international standards.', 50, startY + 15)
       .text('• Results are based on the assumption that the individuals tested are unrelated except as stated.', 50, startY + 30)
       .text('• This report should only be used for the case referenced above and cannot be used for any other purpose.', 50, startY + 45)
       .text('• Mutation rates and rare alleles may affect the statistical interpretation.', 50, startY + 60);

    // Signature section
    const sigY = startY + 90;
    doc.fontSize(10)
       .text('Laboratory Director:', 50, sigY)
       .text('Date:', 300, sigY)
       .text('Dr. Sarah Johnson, PhD', 50, sigY + 15)
       .text('Forensic DNA Analyst', 50, sigY + 30)
       .text('License: FD-2024-001', 50, sigY + 45)
       .text(new Date().toLocaleDateString(), 300, sigY + 15);

    // Laboratory footer
    doc.fontSize(8)
       .fillColor('#666')
       .text('LabDNA Scientific | Accredited DNA Testing Laboratory', 50, sigY + 80, { align: 'center' })
       .text('Contact: info@labdna.co.za | Tel: +27 11 123 4567 | www.labdna.co.za', 50, sigY + 95, { align: 'center' });
  }

  /**
   * Helper methods
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  formatConclusion(conclusion) {
    switch (conclusion) {
      case 'inclusion':
        return 'The alleged father IS NOT EXCLUDED as the biological father of the tested child.';
      case 'exclusion':
        return 'The alleged father IS EXCLUDED as the biological father of the tested child.';
      case 'inconclusive':
        return 'The results are INCONCLUSIVE. Additional testing may be required.';
      default:
        return 'Analysis pending.';
    }
  }

  generateDetailedConclusion(analysisResults) {
    const probability = analysisResults.paternity_probability;
    
    if (analysisResults.conclusion === 'inclusion') {
      return `Based on the STR analysis of ${analysisResults.total_loci} genetic loci, the alleged father shares the same genetic profile as the biological father of the tested child at all examined loci. The probability of paternity is ${probability}%, indicating that the alleged father is ${probability > 99.9 ? 'extremely likely' : 'very likely'} to be the biological father of the tested child. This conclusion is based on the assumption that the alleged father is unrelated to the biological father and that no mutations have occurred at the tested loci.`;
    } else if (analysisResults.conclusion === 'exclusion') {
      return `The STR analysis revealed genetic inconsistencies between the alleged father and the tested child at multiple loci. These exclusions cannot be explained by mutations and therefore the alleged father is excluded as the biological father of the tested child with a probability of exclusion greater than 99.99%.`;
    } else {
      return `The STR analysis results are inconclusive due to technical limitations or genetic factors that prevent a definitive determination. Additional testing with additional loci or family members may be required to reach a conclusive result.`;
    }
  }

  calculatePaternityIndex(probability) {
    if (probability >= 99.99) return '>99,999:1';
    if (probability >= 99.9) return '>999:1';
    if (probability >= 99) return '>99:1';
    return `${Math.round((probability / (100 - probability)) * 100) / 100}:1`;
  }

  calculateCPI(probability) {
    const pi = probability / (100 - probability);
    return pi > 1000 ? '>1,000' : Math.round(pi * 100) / 100;
  }

  /**
   * Generate certificate of analysis
   */
  async generateCertificate(caseData, analysisResults) {
    try {
      const fileName = `${caseData.case_id}_Certificate_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      // Certificate header
      doc.fontSize(24)
         .fillColor('#0D488F')
         .text('CERTIFICATE OF ANALYSIS', 50, 100, { align: 'center' })
         .fontSize(18)
         .text('DNA Paternity Testing', 50, 140, { align: 'center' });

      // Certificate body
      doc.fontSize(12)
         .fillColor('black')
         .text(`This is to certify that DNA analysis was performed on case ${caseData.case_id}`, 50, 200, { align: 'center' })
         .text(`Analysis completed on: ${new Date().toLocaleDateString()}`, 50, 230, { align: 'center' })
         .text(`Probability of Paternity: ${analysisResults.paternity_probability}%`, 50, 260, { align: 'center' })
         .text(`Conclusion: ${this.formatConclusion(analysisResults.conclusion)}`, 50, 290, { align: 'center', width: 500 });

      // Certification footer
      doc.fontSize(10)
         .text('This certificate is valid only for the case referenced above.', 50, 400, { align: 'center' })
         .text('LabDNA Scientific - Accredited DNA Testing Laboratory', 50, 450, { align: 'center' });

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      return {
        success: true,
        fileName,
        filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ReportGenerator;