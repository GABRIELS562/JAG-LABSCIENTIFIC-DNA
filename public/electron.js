const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, exec } = require('child_process');
const chokidar = require('chokidar');
const xml2js = require('xml2js');

let mainWindow;
let osirisProcess = null;
let osirisWorkspace = null;

// Osiris configuration
const OSIRIS_CONFIG = {
  executable: process.platform === 'win32' ? 'Osiris.exe' : 'Osiris',
  workspaceDir: path.join(app.getPath('userData'), 'osiris_workspace'),
  configDir: path.join(app.getPath('userData'), 'osiris_config'),
  tempDir: path.join(app.getPath('userData'), 'temp_analysis'),
  version: '2.16'
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'LabScientific LIMS - Osiris 2.16 Integration',
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Comment out for cleaner UI
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    initializeOsiris();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (osirisProcess) {
      osirisProcess.kill();
    }
  });
}

async function initializeOsiris() {
  try {
    console.log('Initializing Osiris 2.16 integration...');
    
    // Create necessary directories
    await fs.ensureDir(OSIRIS_CONFIG.workspaceDir);
    await fs.ensureDir(OSIRIS_CONFIG.configDir);
    await fs.ensureDir(OSIRIS_CONFIG.tempDir);

    // Check if Osiris is installed
    const osirisPath = await findOsirisInstallation();
    
    if (osirisPath) {
      console.log(`Found Osiris at: ${osirisPath}`);
      OSIRIS_CONFIG.executable = osirisPath;
      
      // Send success to renderer
      mainWindow.webContents.send('osiris-status', {
        initialized: true,
        version: OSIRIS_CONFIG.version,
        path: osirisPath,
        workspace: OSIRIS_CONFIG.workspaceDir
      });
      
      // Setup file watchers for result monitoring
      setupFileWatchers();
      
    } else {
      console.log('Osiris not found - showing installation dialog');
      mainWindow.webContents.send('osiris-status', {
        initialized: false,
        error: 'Osiris 2.16 not found. Please install Osiris or specify installation path.',
        requiresInstallation: true
      });
    }
  } catch (error) {
    console.error('Error initializing Osiris:', error);
    mainWindow.webContents.send('osiris-status', {
      initialized: false,
      error: error.message
    });
  }
}

async function findOsirisInstallation() {
  const possiblePaths = [
    // Local installation (bundled with app)
    path.join(__dirname, '../backend/osiris_software/Osiris-2.16.app/Contents/MacOS/osiris'),
    
    // Windows paths
    'C:\\Program Files\\OSIRIS\\bin\\Osiris.exe',
    'C:\\Program Files (x86)\\OSIRIS\\bin\\Osiris.exe',
    'C:\\OSIRIS\\bin\\Osiris.exe',
    
    // macOS paths
    '/Applications/OSIRIS.app/Contents/MacOS/Osiris',
    '/usr/local/bin/Osiris',
    
    // Linux paths
    '/usr/bin/Osiris',
    '/usr/local/bin/Osiris',
    '/opt/OSIRIS/bin/Osiris'
  ];

  for (const osirisPath of possiblePaths) {
    try {
      await fs.access(osirisPath);
      return osirisPath;
    } catch (error) {
      // Continue searching
    }
  }

  return null;
}

function setupFileWatchers() {
  // Watch for Osiris output files
  const watcher = chokidar.watch(OSIRIS_CONFIG.workspaceDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.xml') || filePath.endsWith('.csv')) {
      console.log('Osiris output detected:', filePath);
      parseOsirisResults(filePath);
    }
  });

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.xml') || filePath.endsWith('.csv')) {
      console.log('Osiris output updated:', filePath);
      parseOsirisResults(filePath);
    }
  });
}

async function parseOsirisResults(filePath) {
  try {
    if (filePath.endsWith('.xml')) {
      const xmlContent = await fs.readFile(filePath, 'utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlContent);
      
      // Send parsed results to renderer
      mainWindow.webContents.send('osiris-results', {
        type: 'xml',
        filePath,
        data: result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error parsing Osiris results:', error);
  }
}

// IPC handlers for Osiris operations
ipcMain.handle('osiris-analyze-case', async (event, caseData) => {
  try {
    console.log('Starting Osiris analysis for case:', caseData.caseId);
    
    // Create case workspace
    const caseWorkspace = path.join(OSIRIS_CONFIG.workspaceDir, caseData.caseId);
    await fs.ensureDir(caseWorkspace);
    
    // Copy FSA files to workspace
    const fsaFiles = [];
    for (const file of caseData.fsaFiles) {
      const targetPath = path.join(caseWorkspace, path.basename(file.path));
      await fs.copy(file.path, targetPath);
      fsaFiles.push(targetPath);
    }
    
    // Create Osiris analysis configuration
    const configFile = await createOsirisConfig(caseData, caseWorkspace, fsaFiles);
    
    // Launch Osiris with the configuration
    const analysisResult = await runOsirisAnalysis(configFile, caseWorkspace);
    
    return {
      success: true,
      caseId: caseData.caseId,
      workspace: caseWorkspace,
      configFile,
      analysisId: analysisResult.analysisId,
      outputFiles: analysisResult.outputFiles
    };
    
  } catch (error) {
    console.error('Osiris analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('osiris-open-gui', async (event, caseData) => {
  try {
    console.log('Opening Osiris GUI for case:', caseData.caseId);
    
    const caseWorkspace = path.join(OSIRIS_CONFIG.workspaceDir, caseData.caseId);
    
    // Launch Osiris GUI with the case workspace
    const osirisArgs = [
      '--workspace', caseWorkspace,
      '--case', caseData.caseId
    ];
    
    osirisProcess = spawn(OSIRIS_CONFIG.executable, osirisArgs, {
      cwd: caseWorkspace,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    osirisProcess.stdout.on('data', (data) => {
      console.log('Osiris stdout:', data.toString());
      mainWindow.webContents.send('osiris-log', {
        type: 'stdout',
        data: data.toString()
      });
    });
    
    osirisProcess.stderr.on('data', (data) => {
      console.log('Osiris stderr:', data.toString());
      mainWindow.webContents.send('osiris-log', {
        type: 'stderr',
        data: data.toString()
      });
    });
    
    osirisProcess.on('close', (code) => {
      console.log(`Osiris GUI closed with code ${code}`);
      mainWindow.webContents.send('osiris-gui-closed', { code });
      osirisProcess = null;
    });
    
    return {
      success: true,
      message: 'Osiris GUI launched successfully',
      workspace: caseWorkspace
    };
    
  } catch (error) {
    console.error('Error opening Osiris GUI:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('osiris-select-installation', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Osiris Installation',
      filters: [
        { name: 'Executable Files', extensions: ['exe', 'app'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      OSIRIS_CONFIG.executable = selectedPath;
      
      // Verify the selection
      const isValid = await verifyOsirisInstallation(selectedPath);
      
      if (isValid) {
        // Save the path for future use
        const configPath = path.join(OSIRIS_CONFIG.configDir, 'osiris-path.json');
        await fs.writeJson(configPath, { executable: selectedPath });
        
        return {
          success: true,
          path: selectedPath,
          message: 'Osiris installation verified successfully'
        };
      } else {
        return {
          success: false,
          error: 'Selected file is not a valid Osiris installation'
        };
      }
    }
    
    return { success: false, error: 'No file selected' };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

async function verifyOsirisInstallation(executablePath) {
  return new Promise((resolve) => {
    const osiris = spawn(executablePath, ['--version'], { timeout: 10000 });
    
    let output = '';
    osiris.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    osiris.on('close', (code) => {
      // Check if output contains Osiris version info
      const isValid = output.toLowerCase().includes('osiris') || 
                     output.includes('2.') || 
                     code === 0;
      resolve(isValid);
    });
    
    osiris.on('error', () => {
      resolve(false);
    });
  });
}

async function createOsirisConfig(caseData, workspace, fsaFiles) {
  const configFile = path.join(workspace, 'analysis.xml');
  
  const configXml = `<?xml version="1.0" encoding="UTF-8"?>
<AnalysisConfiguration>
  <CaseInfo>
    <CaseID>${caseData.caseId}</CaseID>
    <CaseType>Paternity</CaseType>
    <CreatedDate>${new Date().toISOString()}</CreatedDate>
  </CaseInfo>
  <InputFiles>
    ${fsaFiles.map(file => `<FSAFile>${file}</FSAFile>`).join('\n    ')}
  </InputFiles>
  <AnalysisParameters>
    <MinRFU>150</MinRFU>
    <StutterThreshold>0.15</StutterThreshold>
    <Kit>PowerPlex_ESX_17</Kit>
    <SizeStandard>LIZ_600</SizeStandard>
  </AnalysisParameters>
  <OutputSettings>
    <OutputDirectory>${workspace}</OutputDirectory>
    <GenerateXML>true</GenerateXML>
    <GenerateCSV>true</GenerateCSV>
    <GeneratePDF>true</GeneratePDF>
  </OutputSettings>
</AnalysisConfiguration>`;

  await fs.writeFile(configFile, configXml, 'utf8');
  return configFile;
}

async function runOsirisAnalysis(configFile, workspace) {
  return new Promise((resolve, reject) => {
    const analysisId = `analysis_${Date.now()}`;
    const outputDir = path.join(workspace, 'results');
    
    fs.ensureDir(outputDir).then(() => {
      const osirisArgs = [
        '--batch',
        '--config', configFile,
        '--output', outputDir
      ];
      
      const osiris = spawn(OSIRIS_CONFIG.executable, osirisArgs, {
        cwd: workspace,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      osiris.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('Osiris analysis stdout:', data.toString());
      });
      
      osiris.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('Osiris analysis stderr:', data.toString());
      });
      
      osiris.on('close', (code) => {
        if (code === 0) {
          // Find output files
          fs.readdir(outputDir).then(files => {
            resolve({
              analysisId,
              outputFiles: files.map(file => path.join(outputDir, file)),
              stdout,
              stderr
            });
          }).catch(reject);
        } else {
          reject(new Error(`Osiris analysis failed with code ${code}: ${stderr}`));
        }
      });
      
      osiris.on('error', (error) => {
        reject(error);
      });
    }).catch(reject);
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (osirisProcess) {
      osirisProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Additional IPC handlers for file operations
ipcMain.handle('select-fsa-files', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select FSA Files',
      filters: [
        { name: 'FSA Files', extensions: ['fsa'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return {
        success: true,
        files: result.filePaths.map(filePath => ({
          path: filePath,
          name: path.basename(filePath),
          size: require('fs').statSync(filePath).size
        }))
      };
    }
    
    return { success: false, error: 'No files selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-results', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Analysis Results',
      defaultPath: `${data.caseId}_results.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, filePath: result.filePath };
    }
    
    return { success: false, error: 'Save cancelled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('open-external', async (event, url) => {
  return await shell.openExternal(url);
});

// Handle app being quit
app.on('before-quit', () => {
  if (osirisProcess) {
    osirisProcess.kill();
  }
});