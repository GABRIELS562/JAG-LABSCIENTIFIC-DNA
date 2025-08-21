# JAG DNA Scientific - User Guide
## Your Paternity Testing Solution

Welcome to JAG DNA Scientific Laboratory Information Management System (LIMS). This comprehensive guide will help you navigate through the paternity testing workflow from sample registration to final report generation.

---

## 🧬 System Overview

JAG DNA Scientific LIMS is specifically designed for paternity testing laboratories, featuring:

- **Complete Paternity Workflow**: From sample collection to final reports
- **Equipment Integration**: 
  - Applied Biosystems 9700 Thermal Cycler
  - 3500 Genetic Analyzer with GeneScan LIZ 500 size standard
  - Identifiler Plus STR Amplification Kit
- **ISO 17025 Compliant Features**: Documentation, quality controls, and audit trails
- **Sample Format**: XXX/YYYY (sample number/year, e.g., 001/2025, 002/2025)

---

## 🔧 Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Administrator privileges for system setup

### Login & Navigation
1. Open your web browser and navigate to the JAG DNA Scientific LIMS
2. Use the sidebar navigation to access different modules
3. The dashboard provides an overview of current system status

---

## 📝 Step-by-Step Workflow Guide

### Step 1: Client & Sample Registration

**Navigate to: Samples** (This IS the client registration page)

1. **Register New Client**:
   - Click "Add New Sample" button
   - Fill in client information:
     - Client Name (Required)
     - Contact Number (Required)
     - Email Address
     - Physical Address
     - ID Number
     - Date of Birth
     - Gender
   
2. **Sample Information**:
   - Sample Type: Buccal Swab (default)
   - Relationship: Child, Mother, Alleged Father
   - Collection Date
   - Additional Notes

3. **Sample Numbering**:
   - Format: XXX/YYYY (e.g., 001/2025, 002/2025, 003/2025)
   - Automatically increments
   - Year corresponds to current year

4. **Family Grouping**:
   - Samples from the same case are automatically grouped
   - Child samples are prioritized first, then alleged father, then mother

### Step 2: DNA Extraction

**Navigate to: DNA Extraction**

1. **View Samples Ready for Extraction**:
   - See samples with status "Sample Collected" or "Extraction Ready"
   - Samples appear in collection date order

2. **Create Extraction Batch**:
   - Select samples for extraction
   - Batch naming: EXT_XXX format
   - Specify operator name
   - Set extraction parameters:
     - Extraction Method
     - Kit Lot Number and Expiry
     - Lysis Time (default: 60 min)
     - Lysis Temperature (default: 56°C)
     - Centrifuge Speed (default: 14,000 rpm)
     - Centrifuge Time (default: 3 min)
     - Elution Volume (default: 200 μL)

3. **Quality Control**:
   - Add quantification results for each sample
   - Record DNA concentration
   - Monitor purity ratios (260/280, 260/230)
   - Flag samples requiring re-extraction

### Step 3: PCR Processing

**Navigate to: PCR Batches**

1. **Sample Selection**:
   - Load samples ready for PCR (extraction completed)
   - Drag and drop samples onto 96-well plate layout
   - Family members are kept together

2. **PCR Setup**:
   - **Kit**: Identifiler Plus STR Amplification Kit
   - **Equipment**: Applied Biosystems 9700 Thermal Cycler
   - **Batch Naming**: JDS_XXX format (changed from LDS_)
   - Add positive and negative controls

3. **Plate Layout**:
   - 96-well plate visualization
   - Sample placement with drag-and-drop interface
   - Controls positioned strategically
   - Export plate layout for thermal cycler

4. **Finalize Batch**:
   - Review sample positions
   - Specify operator name
   - Generate batch documentation
   - Update sample status to "PCR Batched"

### Step 4: Electrophoresis

**Navigate to: Electrophoresis**

1. **Load PCR Products**:
   - Import completed PCR batches
   - Select samples ready for electrophoresis
   - Review PCR completion status

2. **3500 Genetic Analyzer Setup**:
   - **Equipment**: 3500 Genetic Analyzer
   - **Size Standard**: GeneScan LIZ 500
   - **Run Parameters**:
     - Voltage: 15,000V (adjustable 10,000-20,000V)
     - Run Time: 30 minutes (adjustable 15-60 minutes)
     - Temperature: 60°C (adjustable 50-70°C)
     - Injection Time: 5 seconds
     - Polymer: POP-4

3. **Sample Layout**:
   - Capillary array configuration (16 capillaries)
   - Family samples placed vertically for easy analysis
   - Include ladder and controls

4. **Quality Monitoring**:
   - Real-time signal quality monitoring
   - Noise level tracking
   - Baseline stability assessment
   - Capillary status indicators

### Step 5: OSIRIS Analysis

**Navigate to: Analysis**

1. **Data Import**:
   - Upload FSA files from 3500 Genetic Analyzer
   - Files automatically processed through OSIRIS
   - **Configuration**: 3500 Genetic Analyzer data format
   - **STR Markers**: Identifiler Plus panel
   - **Size Standard**: GeneScan LIZ 500

2. **Quality Review**:
   - Review allele calls for each locus
   - Check signal intensity (RFU values)
   - Validate peak patterns
   - Flag samples requiring re-analysis

3. **Results Verification**:
   - Compare child and alleged father profiles
   - Calculate paternity index for each locus
   - Review exclusions or inclusions
   - Document analyst review notes

### Step 6: Report Generation

**Navigate to: Reports**

1. **Select Analysis**:
   - Choose completed OSIRIS analysis
   - Review all quality checks passed
   - Verify chain of custody documentation

2. **Generate Report**:
   - Automated paternity report generation
   - Include statistical calculations
   - Add laboratory interpretation
   - Quality assurance review

3. **Final Review**:
   - Technical review by qualified analyst
   - Administrative review for completeness
   - Client notification system

---

## 🔍 Quality Control Features

### ISO 17025 Compliant Documentation
- **Chain of Custody**: Full traceability from sample receipt to report
- **Equipment Calibration**: Regular maintenance schedules and records
- **Method Validation**: Documented procedures and performance verification
- **Proficiency Testing**: External quality assurance participation

### Built-in Controls
- **Negative Controls**: Monitor for contamination
- **Positive Controls**: Verify system performance
- **Allelic Ladder**: Size standard for accurate genotyping
- **Quality Metrics**: Automated flagging of issues

### Audit Trail
- Complete user activity logging
- Timestamp all actions
- Document all sample status changes
- Maintain version control of procedures

---

## 🧪 Equipment Specifications

### PCR Equipment
- **Thermal Cycler**: Applied Biosystems 9700
- **STR Kit**: Identifiler Plus STR Amplification Kit
- **Reaction Volume**: 25 μL (typical)
- **Cycle Conditions**: JAG DNA Scientific validated protocol

### Electrophoresis Equipment
- **Instrument**: 3500 Genetic Analyzer (8-capillary array)
- **Size Standard**: GeneScan LIZ 500
- **Polymer**: POP-4
- **Capillary Length**: 36 cm
- **Detection**: Multi-color fluorescence

### Analysis Software
- **Primary Analysis**: OSIRIS v2.12 (or latest)
- **Data Format**: FSA files from 3500 Genetic Analyzer
- **STR Panel**: Identifiler Plus (15 STR loci + Amelogenin)

---

## 📊 Sample Tracking & Status

### Workflow Statuses
- **Sample Collected**: Initial registration completed
- **Extraction Ready**: Queued for DNA extraction
- **Extraction Batched**: Assigned to extraction batch
- **Extraction Completed**: DNA extracted, ready for PCR
- **PCR Ready**: Queued for PCR amplification
- **PCR Batched**: Assigned to PCR batch (JDS_XXX)
- **PCR Completed**: Amplification completed
- **Electrophoresis Ready**: Queued for capillary electrophoresis
- **Electrophoresis Batched**: Assigned to electrophoresis batch (ELEC_XXX)
- **Electrophoresis Completed**: Fragment separation completed
- **Analysis Ready**: Ready for OSIRIS analysis
- **Analysis Completed**: Genotyping completed
- **Report Ready**: Ready for report generation
- **Completed**: Final report generated and reviewed

### Rerun Management
- **Rerun Required**: Sample flagged for repeat analysis
- **Rerun Batched**: Assigned to rerun batch (JDS_XXX_RR)
- Maintains traceability to original sample

---

## 🚨 Troubleshooting

### Common Issues

**Sample Not Appearing in Queue**
- Verify sample status is correct for the workflow stage
- Check if sample is already assigned to another batch
- Refresh the page to update sample list

**PCR Batch Creation Fails**
- Ensure all selected samples are in "PCR Ready" status
- Verify operator name is provided
- Check that samples aren't already assigned to another batch

**Electrophoresis Data Import Issues**
- Confirm FSA files are from 3500 Genetic Analyzer
- Verify file format compatibility
- Check file permissions and network access

**OSIRIS Analysis Problems**
- Ensure size standard (GeneScan LIZ 500) is properly configured
- Verify Identifiler Plus panel settings
- Check for software updates

### System Performance
- **Recommended Browser**: Chrome or Firefox for best performance
- **Cache Management**: Clear browser cache if experiencing slow loading
- **Network**: Ensure stable internet connection for cloud features

---

## 👥 User Roles & Permissions

### Laboratory Staff
- Full access to all workflow stages
- Sample registration and management
- Batch creation and processing
- Quality control review
- Report generation

### Quality Assurance
- Review and approval permissions
- Audit trail access
- Quality metrics monitoring
- Procedure documentation

### Laboratory Director
- Complete system access
- User management
- System configuration
- Performance monitoring

---

## 📞 Support & Contact

### Technical Support
For technical issues or system questions:
- Check this user guide first
- Review system status indicators
- Contact system administrator

### Laboratory Operations
For questions about paternity testing procedures:
- Refer to JAG DNA Scientific SOPs
- Contact laboratory supervisor
- Review ISO 17025 quality manual

---

## 🔄 System Updates

### Regular Maintenance
- **Daily**: System backup verification
- **Weekly**: Performance monitoring review
- **Monthly**: Software updates check
- **Quarterly**: User access review

### Version Control
- All system changes are documented
- User notification of updates
- Training provided for new features
- Rollback procedures available

---

## 📚 Additional Resources

### Documentation
- ISO 17025 Quality Manual
- Standard Operating Procedures (SOPs)
- Equipment Maintenance Logs
- Validation Studies

### Training Materials
- New user orientation
- Equipment operation training
- Quality system training
- Continuing education resources

---

**JAG DNA Scientific - Your Paternity Testing Solution**

*This guide covers the essential operations of the JAG DNA Scientific LIMS. For detailed SOPs and quality procedures, refer to the laboratory's quality manual and ISO 17025 documentation.*

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*System includes ISO 17025 compliant documentation and quality control features*