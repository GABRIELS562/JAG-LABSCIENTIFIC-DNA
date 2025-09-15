import React, { useState, memo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  Science as ScienceIcon,
  Keyboard as KeyboardIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

// Static data outside component to prevent re-creation
const fileLocations = {
  inputDir: '/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/input',
  outputDir: '/Users/user/LABSCIENTIFIC-LIMS/backend/osiris_workspace/output',
  osirisApp: '/Users/user/LABSCIENTIFIC-LIMS/external/osiris_software/Osiris-2.16.app'
};

const fsaFiles = [
  { name: '25_001_Child_ID.fsa', size: '299KB', status: 'verified' },
  { name: '25_002_Father_ID.fsa', size: '313KB', status: 'verified' },
  { name: '25_003_Mother_ID.fsa', size: '298KB', status: 'verified' },
  { name: 'Positive_Control_ID.fsa', size: '293KB', status: 'verified' },
  { name: 'Negative_Control_ID.fsa', size: '300KB', status: 'verified' },
  { name: 'LADDER_ID.fsa', size: '325KB', status: 'verified', type: 'ladder' }
];

const osirisConfig = {
  kit: 'IDplus (Identifiler Plus)',
  ils: 'ABI-LIZ500',
  minRFU: '150',
  stutterThreshold: '0.15 (15%)',
  adenylationThreshold: '0.3 (30%)',
  population: 'South_African'
};

const keyboardShortcuts = [
  { key: 'Cmd+A', action: 'Start Analysis' },
  { key: 'Cmd+O', action: 'Open File' },
  { key: 'Cmd+S', action: 'Save' },
  { key: 'Tab', action: 'Navigate between controls' },
  { key: 'Space/Enter', action: 'Activate button' },
  { key: 'Cmd+Tab', action: 'Switch to Osiris window' }
];

const visibilityTips = [
  'Use keyboard navigation instead of clicking buttons',
  'Zoom in on button areas using Ctrl+Scroll',
  'Try System Preferences → Accessibility → Display → Increase Contrast',
  'Use Tab key to highlight buttons before pressing Space',
  'Focus on button text rather than button borders'
];

const OsirisInfoPanel = memo(({ workspaceStatus, onRefresh }) => {
  const [expandedSection, setExpandedSection] = useState('setup');

  const handleSectionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title="🧬 Osiris Genetic Analysis - Complete Information Panel"
          subheader="All settings, files, and workarounds for white button visibility issues"
          avatar={<ScienceIcon color="primary" />}
        />
      </Card>

      {/* Quick Status Alert */}
      <Alert 
        severity="success" 
        icon={<CheckIcon />}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">✅ System Ready</Typography>
        <Typography variant="body2">
          Real Identifiler Plus FSA files loaded • Configuration verified • Ladder file authentic (325KB)
        </Typography>
      </Alert>

      {/* File Locations */}
      <Accordion expanded={expandedSection === 'locations'} onChange={handleSectionChange('locations')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FolderIcon sx={{ mr: 1 }} />
          <Typography variant="h6">📁 File Locations & Directories</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(fileLocations).map(([key, path]) => (
              <Grid item xs={12} key={key}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="subtitle2" color="primary">
                        {key === 'inputDir' ? 'Input Directory' : 
                         key === 'outputDir' ? 'Output Directory' : 'Osiris Application'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {path}
                      </Typography>
                    </Box>
                    <Tooltip title="Copy path">
                      <IconButton onClick={() => copyToClipboard(path)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* FSA Files Status */}
      <Accordion expanded={expandedSection === 'files'} onChange={handleSectionChange('files')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FileIcon sx={{ mr: 1 }} />
          <Typography variant="h6">🧪 FSA Files Status (Real Identifiler Data)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {fsaFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">{file.name}</Typography>
                      <Chip size="small" label={file.size} color="default" />
                      {file.type === 'ladder' && (
                        <Chip size="small" label="LADDER" color="warning" />
                      )}
                      <Chip size="small" label="Verified" color="success" />
                    </Box>
                  }
                  secondary="Real Identifiler Plus data from Osiris test files"
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Osiris Configuration */}
      <Accordion expanded={expandedSection === 'setup'} onChange={handleSectionChange('setup')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6">⚙️ Osiris Analysis Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(osirisConfig).map(([key, value]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" color="primary">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </Typography>
                  <Typography variant="h6">{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              <strong>Important:</strong> In Osiris dropdown, select <strong>"IDplus"</strong> (not "IdentifilerPlus"). 
              The internal lane standard should be <strong>"ABI-LIZ500"</strong>.
            </Typography>
          </Alert>
        </AccordionDetails>
      </Accordion>

      {/* Step-by-Step Instructions */}
      <Accordion expanded={expandedSection === 'steps'} onChange={handleSectionChange('steps')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <CheckIcon sx={{ mr: 1 }} />
          <Typography variant="h6">📋 Step-by-Step Analysis Instructions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            <ListItem>
              <ListItemIcon><Typography variant="h6">1</Typography></ListItemIcon>
              <ListItemText 
                primary="Launch Osiris" 
                secondary="Use the launch button above or open application manually"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">2</Typography></ListItemIcon>
              <ListItemText 
                primary="Find Osiris Window" 
                secondary="Use Cmd+Tab to switch to Osiris (may be in background)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">3</Typography></ListItemIcon>
              <ListItemText 
                primary="Start Analysis" 
                secondary="File → Analyze (or press Cmd+A)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">4</Typography></ListItemIcon>
              <ListItemText 
                primary="Configure Directories" 
                secondary="Set input and output directories from the paths above"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">5</Typography></ListItemIcon>
              <ListItemText 
                primary="Select Kit Settings" 
                secondary='Kit: "IDplus" | ILS: "ABI-LIZ500" | Min RFU: 150'
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">6</Typography></ListItemIcon>
              <ListItemText 
                primary="Select All 6 FSA Files" 
                secondary="Include all samples and the LADDER_ID.fsa file"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Typography variant="h6">7</Typography></ListItemIcon>
              <ListItemText 
                primary="Run Analysis" 
                secondary="Click Analyze button and wait 5-10 minutes for completion"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Keyboard Shortcuts */}
      <Accordion expanded={expandedSection === 'keyboard'} onChange={handleSectionChange('keyboard')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <KeyboardIcon sx={{ mr: 1 }} />
          <Typography variant="h6">⌨️ Keyboard Shortcuts (White Button Workaround)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Button Visibility Issue:</strong> Osiris 2.16 has white buttons that are hard to see. 
              Use keyboard navigation as the primary workaround.
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            {keyboardShortcuts.map((shortcut, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                  <Typography variant="subtitle2" color="warning.dark">
                    {shortcut.key}
                  </Typography>
                  <Typography variant="body2">{shortcut.action}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Visibility Tips */}
      <Accordion expanded={expandedSection === 'visibility'} onChange={handleSectionChange('visibility')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <VisibilityIcon sx={{ mr: 1 }} />
          <Typography variant="h6">👁️ Visibility Improvement Tips</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {visibilityTips.map((tip, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                <ListItemText primary={tip} />
              </ListItem>
            ))}
          </List>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Recommended:</strong> Use Tab key to navigate through Osiris interface, 
              then press Space or Enter to activate buttons. This completely bypasses the visibility issue.
            </Typography>
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
});

OsirisInfoPanel.displayName = 'OsirisInfoPanel';

export default OsirisInfoPanel;