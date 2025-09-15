import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Slider,
  Button,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  Settings,
  Save,
  RestartAlt,
  Timer,
  Info,
  PlayArrow,
  Pause,
  Speed,
  Science
} from '@mui/icons-material';
import { api } from '../../services/api';

const WorkflowSettings = () => {
  const [stageDurations, setStageDurations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [workflowPaused, setWorkflowPaused] = useState(false);

  // Stage information with descriptions
  const stageInfo = {
    sample_collection: { 
      name: 'Sample Collection', 
      icon: '🧪', 
      description: 'Buccal swab collection and registration',
      minDuration: 1,
      maxDuration: 30
    },
    dna_extraction: { 
      name: 'DNA Extraction', 
      icon: '🧬', 
      description: 'Automated DNA extraction process',
      minDuration: 2,
      maxDuration: 60
    },
    pcr_amplification: { 
      name: 'PCR Amplification', 
      icon: '🔬', 
      description: 'PowerPlex ESX 17 STR amplification',
      minDuration: 3,
      maxDuration: 120
    },
    electrophoresis: { 
      name: 'Electrophoresis', 
      icon: '⚡', 
      description: 'Capillary electrophoresis separation',
      minDuration: 2,
      maxDuration: 90
    },
    osiris_analysis: { 
      name: 'OSIRIS Analysis', 
      icon: '📊', 
      description: 'STR profile analysis',
      minDuration: 1,
      maxDuration: 45
    },
    report_generation: { 
      name: 'Report Generation', 
      icon: '📄', 
      description: 'Paternity report compilation',
      minDuration: 1,
      maxDuration: 30
    }
  };

  useEffect(() => {
    fetchStageDurations();
  }, []);

  const fetchStageDurations = async () => {
    try {
      setLoading(true);
      const response = await api.fetchJson('/workflow/stage-durations', { method: 'GET' });
      if (response && response.data) {
        const durations = {};
        response.data.forEach(stage => {
          durations[stage.stage_name] = stage.duration_minutes;
        });
        setStageDurations(durations);
      }
    } catch (error) {
      console.error('Failed to fetch stage durations:', error);
      setMessage('Failed to load stage durations');
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (stage, value) => {
    setStageDurations(prev => ({
      ...prev,
      [stage]: value
    }));
  };

  const saveDuration = async (stage) => {
    try {
      setSaving(true);
      const response = await api.fetchJson(`/workflow/stage-durations/${stage}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: stageDurations[stage] })
      });
      
      if (response.success) {
        setMessage(`Updated ${stageInfo[stage]?.name || stage} duration to ${stageDurations[stage]} minutes`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save duration:', error);
      setMessage('Failed to save duration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    const defaults = {
      sample_collection: 3,
      dna_extraction: 5,
      pcr_amplification: 10,
      electrophoresis: 8,
      osiris_analysis: 4,
      report_generation: 2
    };
    
    setStageDurations(defaults);
    
    // Save all defaults
    for (const [stage, duration] of Object.entries(defaults)) {
      await saveDuration(stage);
    }
  };

  const getTotalCycleTime = () => {
    return Object.values(stageDurations).reduce((sum, duration) => sum + (duration || 0), 0);
  };

  const toggleWorkflowPause = async () => {
    // This would call an API to pause/resume the workflow
    setWorkflowPaused(!workflowPaused);
    setMessage(workflowPaused ? 'Workflow resumed' : 'Workflow paused');
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
              <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
              Workflow Stage Durations
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Configure how long samples remain at each processing stage
            </Typography>
          </Box>
          <Box>
            <Tooltip title={workflowPaused ? "Resume workflow" : "Pause workflow"}>
              <IconButton 
                onClick={toggleWorkflowPause}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mr: 1 }}
              >
                {workflowPaused ? <PlayArrow /> : <Pause />}
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              onClick={resetToDefaults}
              startIcon={<RestartAlt />}
              sx={{ bgcolor: 'white', color: '#667eea' }}
            >
              Reset to Defaults
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Status Message */}
      {message && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {/* Cycle Time Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                <Timer sx={{ mr: 1, verticalAlign: 'middle' }} />
                Total Cycle Time
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Complete workflow duration for one sample batch
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h3" color="primary">
                {getTotalCycleTime()}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                minutes
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stage Duration Controls */}
      <Grid container spacing={3}>
        {Object.entries(stageInfo).map(([stageId, info]) => (
          <Grid item xs={12} md={6} key={stageId}>
            <Card>
              <CardHeader
                avatar={<Typography variant="h4">{info.icon}</Typography>}
                title={info.name}
                subheader={info.description}
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Duration</Typography>
                    <Chip 
                      label={`${stageDurations[stageId] || 0} minutes`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  <Slider
                    value={stageDurations[stageId] || 0}
                    onChange={(e, value) => handleDurationChange(stageId, value)}
                    min={info.minDuration}
                    max={info.maxDuration}
                    marks={[
                      { value: info.minDuration, label: `${info.minDuration}m` },
                      { value: info.maxDuration, label: `${info.maxDuration}m` }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}m`}
                  />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Info fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="textSecondary">
                      Range: {info.minDuration}-{info.maxDuration} min
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => saveDuration(stageId)}
                    startIcon={<Save />}
                    disabled={saving}
                  >
                    Save
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Presets */}
      <Card sx={{ mt: 3 }}>
        <CardHeader 
          title="Quick Presets"
          subheader="Apply predefined timing configurations"
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Speed />}
                onClick={() => {
                  setStageDurations({
                    sample_collection: 1,
                    dna_extraction: 2,
                    pcr_amplification: 3,
                    electrophoresis: 2,
                    osiris_analysis: 1,
                    report_generation: 1
                  });
                }}
              >
                Fast Mode (10 min total)
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Science />}
                onClick={() => {
                  setStageDurations({
                    sample_collection: 3,
                    dna_extraction: 5,
                    pcr_amplification: 10,
                    electrophoresis: 8,
                    osiris_analysis: 4,
                    report_generation: 2
                  });
                }}
              >
                Standard Mode (32 min total)
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Timer />}
                onClick={() => {
                  setStageDurations({
                    sample_collection: 5,
                    dna_extraction: 15,
                    pcr_amplification: 30,
                    electrophoresis: 20,
                    osiris_analysis: 10,
                    report_generation: 5
                  });
                }}
              >
                Realistic Mode (85 min total)
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkflowSettings;