# Workflow Stage Duration Configuration System

## ✅ Implementation Complete

The paternity workflow system has been successfully updated to support **configurable stage durations** with realistic timing constraints.

## 🎯 Key Features Implemented

### 1. Database Schema Updates
- ✅ **`workflow_stage_configs`** table - Stores configurable duration for each workflow stage
- ✅ **`sample_workflow_timing`** table - Tracks when samples enter/exit each stage
- ✅ **Indexes** for optimal performance on timing queries

### 2. Configurable Stage Durations
- ✅ **Default durations** (in minutes):
  - `sample_collected`: 3 minutes
  - `dna_extraction`: 5 minutes  
  - `pcr_amplification`: 4 minutes (configurable via API)
  - `electrophoresis`: 3 minutes
  - `osiris_analysis`: 6 minutes
  - `report_generation`: 2 minutes
- ✅ **Range validation**: 1-1440 minutes (1 minute to 24 hours)
- ✅ **Database persistence** of configuration changes

### 3. Enhanced Workflow Logic
- ✅ **Time-based progression**: Samples only move to next stage after spending required time in current stage
- ✅ **Real-time tracking**: Entry/exit timestamps for every sample stage transition  
- ✅ **Ready-to-progress detection**: System identifies samples that have completed their stage duration
- ✅ **Graceful timing initialization**: Existing samples get timing records automatically

### 4. REST API Endpoints

#### **GET /api/workflow/stage-durations**
Returns all stage configurations with durations and descriptions.

```json
{
  "success": true,
  "data": [
    {
      "stage_name": "pcr_amplification",
      "duration_minutes": 4,
      "is_active": true,
      "description": "PCR amplification of DNA regions"
    }
  ]
}
```

#### **PUT /api/workflow/stage-durations/:stage**
Updates the duration for a specific workflow stage.

```bash
curl -X PUT "http://localhost:3001/api/workflow/stage-durations/pcr_amplification" \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes": 10}'
```

#### **GET /api/workflow/samples-in-stage/:stage**
Gets all samples currently in a specific stage with timing information.

```json
{
  "stageName": "pcr_amplification",
  "totalSamples": 10,
  "readyToProgress": 3,
  "stageDurationMinutes": 10,
  "samples": [
    {
      "lab_number": "2025_001",
      "seconds_in_stage": 420,
      "seconds_remaining": 180,
      "ready_to_progress": 0
    }
  ]
}
```

#### **GET /api/workflow/sample-tracking**
Enhanced sample tracking with timing information for all samples.

#### **GET /api/workflow/timing-stats**
Provides statistics on actual vs. configured stage durations.

### 5. Updated PaternityWorkflowCycler Service
- ✅ **Configurable timing**: Loads stage durations from database
- ✅ **Database-driven progression**: Uses `sample_workflow_timing` table
- ✅ **Dynamic updates**: Picks up configuration changes without restart
- ✅ **Backward compatibility**: Existing workflow continues seamlessly

## 🔧 How It Works

### Workflow Progression Logic
1. **Sample Entry**: When a sample enters a stage, an entry record is created in `sample_workflow_timing`
2. **Duration Check**: Every 30 seconds, the system checks which samples have been in their stage ≥ configured duration
3. **Stage Transition**: Ready samples are moved to the next stage and timing records are updated
4. **Cycle Management**: Batches progress only when all samples in the batch are ready

### Timing Tracking
- **Entry Time**: Recorded when sample enters a stage
- **Exit Time**: Recorded when sample leaves a stage  
- **Duration**: Calculated automatically (exit_time - entry_time)
- **Ready Status**: Computed based on time spent vs. configured duration

## 📊 System Status

### Current Configuration
- **50 samples** actively cycling through 6 workflow stages
- **5 batches** (10 samples each) at different stages
- **Real-time timing** with configurable durations
- **Database persistence** of all timing data

### Performance
- **Sub-second response times** for all API endpoints
- **Efficient database queries** with proper indexing
- **30-second cycle time** for batch progression checks
- **Automatic cleanup** of completed timing records

## 🎮 Testing & Validation

### API Testing
All endpoints tested and working:
```bash
# Get stage configurations
curl "http://localhost:3001/api/workflow/stage-durations"

# Update PCR duration to 10 minutes
curl -X PUT "http://localhost:3001/api/workflow/stage-durations/pcr_amplification" \
  -H "Content-Type: application/json" -d '{"duration_minutes": 10}'

# Check samples in PCR stage
curl "http://localhost:3001/api/workflow/samples-in-stage/pcr_amplification"

# View overall workflow status
curl "http://localhost:3001/api/workflow/paternity/status"
```

### Workflow Validation
- ✅ Stage durations are respected (samples wait for configured time)
- ✅ Configuration changes take effect immediately
- ✅ Timing data is accurately tracked and stored
- ✅ System handles edge cases (missing timing records, configuration updates)

## 🚀 Usage Examples

### Set Realistic Laboratory Timing
```bash
# DNA extraction: 2 hours
curl -X PUT "http://localhost:3001/api/workflow/stage-durations/dna_extraction" \
  -d '{"duration_minutes": 120}'

# PCR amplification: 3 hours  
curl -X PUT "http://localhost:3001/api/workflow/stage-durations/pcr_amplification" \
  -d '{"duration_minutes": 180}'

# OSIRIS analysis: 1 hour
curl -X PUT "http://localhost:3001/api/workflow/stage-durations/osiris_analysis" \
  -d '{"duration_minutes": 60}'
```

### Monitor Sample Progress
```bash
# Check which samples are ready to move to next stage
curl "http://localhost:3001/api/workflow/samples-in-stage/pcr_amplification"

# View complete workflow status with timing
curl "http://localhost:3001/api/workflow/paternity/status"
```

## 📈 Benefits

1. **Realistic Workflow Timing**: No more artificial 10-second stage transitions
2. **Operational Flexibility**: Lab managers can adjust timing based on protocols
3. **Accurate Progress Tracking**: Real-time visibility into sample processing status
4. **Performance Monitoring**: Track actual vs. planned stage durations
5. **Scalable Architecture**: Database-driven configuration supports future enhancements

## 🔄 Migration

The system seamlessly handles existing samples:
- Existing samples continue their workflow without interruption
- Timing records are automatically created for samples without them
- Configuration changes apply immediately to new stage transitions
- No data loss or workflow disruption during updates

## 📝 Future Enhancements

Potential future improvements:
- **Stage-specific alerts** when samples exceed expected duration
- **Workflow analytics dashboard** showing bottlenecks and efficiency metrics
- **Batch-level timing overrides** for special processing requirements
- **Integration with lab equipment** for automatic stage completion detection

---

✅ **Implementation Status: COMPLETE** - The workflow system now supports fully configurable stage durations with realistic timing constraints, maintaining the existing 50-sample cycling functionality while providing precise control over stage progression timing.