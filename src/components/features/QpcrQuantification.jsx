import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Thermometer,
  Zap,
  Beaker,
  AlertTriangle,
  TrendingUp,
  FileText,
  Download,
  Eye,
  RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// qPCR instrument simulation data
const QPCR_INSTRUMENTS = [
  {
    id: 'qpcr-01',
    name: 'QuantStudio 5 Real-Time PCR System',
    manufacturer: 'Applied Biosystems',
    status: 'available',
    blocks: 96,
    currentRun: null
  },
  {
    id: 'qpcr-02', 
    name: 'StepOnePlus Real-Time PCR System',
    manufacturer: 'Applied Biosystems',
    status: 'running',
    blocks: 96,
    currentRun: 'RUN-2024-QNT-012'
  }
];

// qPCR protocols for DNA quantification
const QPCR_PROTOCOLS = {
  'quantifiler-trio': {
    name: 'Quantifiler Trio DNA Quantification Kit',
    targets: ['Small Autosomal', 'Large Autosomal', 'Y-Chromosome'],
    cycles: 40,
    plateSetup: '96-well',
    duration: '2.5 hours',
    standards: [50, 16.7, 5.56, 1.85, 0.617, 0.206, 0.0686],
    controls: ['Positive Control', 'Negative Control', 'IPC (Internal PCR Control)']
  },
  'quantifiler-hp': {
    name: 'Quantifiler HP DNA Quantification Kit',
    targets: ['Human DNA', 'Male DNA'],
    cycles: 40,
    plateSetup: '96-well',
    duration: '2 hours',
    standards: [50, 5, 0.5, 0.05, 0.005],
    controls: ['Positive Control', 'Negative Control']
  }
};

// Generate realistic qPCR amplification curves
const generateAmplificationData = (concentration) => {
  const data = [];
  const ctValue = concentration > 1 ? 25 - Math.log10(concentration) * 3 : 35;
  
  for (let cycle = 1; cycle <= 40; cycle++) {
    let rfu = 100; // Baseline
    
    if (cycle > ctValue - 3) {
      // Exponential amplification phase
      const amplificationFactor = Math.pow(1.8, cycle - ctValue + 3);
      rfu = 100 + amplificationFactor * 10;
      
      // Add some noise
      rfu += (Math.random() - 0.5) * 50;
    }
    
    // Plateau phase
    if (rfu > 50000) rfu = 50000 + Math.random() * 5000;
    
    data.push({
      cycle,
      rfu: Math.max(100, rfu),
      deltaRn: Math.max(0.01, (rfu - 100) / 1000)
    });
  }
  
  return data;
};

const QpcrQuantification = () => {
  const [selectedProtocol, setSelectedProtocol] = useState('quantifiler-trio');
  const [currentRun, setCurrentRun] = useState(null);
  const [runProgress, setRunProgress] = useState(0);
  const [samplePlate, setSamplePlate] = useState({});
  const [results, setResults] = useState([]);
  const [amplificationCurves, setAmplificationCurves] = useState({});
  const [selectedSample, setSelectedSample] = useState(null);
  const [pendingSamples, setPendingSamples] = useState([]);

  // Load extracted samples ready for quantification from localStorage
  useEffect(() => {
    loadExtractedSamples();
  }, []);

  const loadExtractedSamples = () => {
    // Check localStorage for extracted samples that need quantification
    const extractedSamples = localStorage.getItem('extractedSamples');
    
    if (extractedSamples) {
      const samples = JSON.parse(extractedSamples);
      setPendingSamples(samples);
    } else {
      // Default samples if none in storage
      const defaultSamples = [
        {
          id: 'EXT-2024-001-C',
          labNumber: 'LAB-2024-001-C',
          caseNumber: 'PAT-2024-001',
          sampleType: 'Child',
          clientName: 'John Doe',
          extractionBatch: 'EXT-BATCH-001',
          extractionDate: new Date().toISOString(),
          volume: 50,
          status: 'ready'
        },
        {
          id: 'EXT-2024-001-M',
          labNumber: 'LAB-2024-001-M', 
          caseNumber: 'PAT-2024-001',
          sampleType: 'Mother',
          clientName: 'Jane Doe',
          extractionBatch: 'EXT-BATCH-001',
          extractionDate: new Date().toISOString(),
          volume: 50,
          status: 'ready'
        },
        {
          id: 'EXT-2024-001-AF',
          labNumber: 'LAB-2024-001-AF',
          caseNumber: 'PAT-2024-001',
          sampleType: 'Alleged Father',
          clientName: 'Robert Smith',
          extractionBatch: 'EXT-BATCH-001',
          extractionDate: new Date().toISOString(),
          volume: 50,
          status: 'ready'
        }
      ];
      setPendingSamples(defaultSamples);
      localStorage.setItem('extractedSamples', JSON.stringify(defaultSamples));
    }
  };

  const startQuantification = () => {
    const runId = `QNT-${Date.now()}`;
    setCurrentRun({
      id: runId,
      protocol: selectedProtocol,
      startTime: new Date(),
      status: 'running',
      samples: pendingSamples.length
    });
    
    setRunProgress(0);
    
    // Simulate qPCR run progress
    const progressInterval = setInterval(() => {
      setRunProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          completeQuantification(runId);
          return 100;
        }
        return prev + 2;
      });
    }, 3000); // 2.5 minute simulation (150 seconds)
  };

  const completeQuantification = (runId) => {
    // Generate quantification results
    const sampleResults = pendingSamples.map((sample, index) => {
      const concentration = Math.random() * 45 + 5; // 5-50 ng/µL
      const degradationIndex = Math.random() * 5 + 1; // 1-6
      const ipcCt = 28 + Math.random() * 3; // Internal PCR Control
      
      return {
        id: sample.id,
        sampleType: sample.sampleType,
        concentration: concentration.toFixed(2),
        degradationIndex: degradationIndex.toFixed(1),
        ipcCt: ipcCt.toFixed(1),
        quality: concentration > 0.5 ? 'Pass' : 'Fail',
        recommendation: concentration > 0.5 ? 
          `Use ${Math.ceil(0.5 / concentration * 1000)}µL for PCR` : 
          'Concentrate or re-extract',
        ctValues: {
          smallAutosomal: (25 - Math.log10(concentration) * 3).toFixed(2),
          largeAutosomal: (26 - Math.log10(concentration) * 3).toFixed(2),
          yChromosome: sample.sampleType === 'Alleged Father' ? 
            (25 - Math.log10(concentration) * 3).toFixed(2) : 'N/A'
        }
      };
    });

    setResults(sampleResults);
    
    // Generate amplification curves
    const curves = {};
    sampleResults.forEach(sample => {
      curves[sample.id] = generateAmplificationData(parseFloat(sample.concentration));
    });
    setAmplificationCurves(curves);
    
    setCurrentRun(prev => ({ ...prev, status: 'completed', endTime: new Date() }));
  };

  const setupPlate = () => {
    // Setup 96-well plate for quantification
    const plate = {};
    
    // Standards (A1-A7)
    QPCR_PROTOCOLS[selectedProtocol].standards.forEach((std, idx) => {
      plate[`A${idx + 1}`] = {
        type: 'standard',
        concentration: std,
        replicate: 1
      };
    });
    
    // Controls (H10-H12)
    plate['H10'] = { type: 'positive_control' };
    plate['H11'] = { type: 'negative_control' };
    plate['H12'] = { type: 'ipc_control' };
    
    // Samples (B1-D3, each in triplicate)
    pendingSamples.forEach((sample, sampleIdx) => {
      for (let rep = 0; rep < 3; rep++) {
        const row = String.fromCharCode(66 + sampleIdx); // B, C, D
        const col = rep + 1;
        plate[`${row}${col}`] = {
          type: 'sample',
          sampleId: sample.id,
          replicate: rep + 1
        };
      }
    });
    
    setSamplePlate(plate);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-teal-600" />
              qPCR DNA Quantification
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Real-time PCR quantification for forensic DNA samples
            </p>
          </div>
        </div>

        {/* Instrument Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QPCR_INSTRUMENTS.map(instrument => (
            <Card key={instrument.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{instrument.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {instrument.manufacturer}
                    </p>
                  </div>
                  <Badge 
                    variant={instrument.status === 'available' ? 'secondary' : 'default'}
                    className={instrument.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {instrument.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Blocks:</span>
                    <span>{instrument.blocks}-well</span>
                  </div>
                  {instrument.currentRun && (
                    <div className="flex justify-between text-sm">
                      <span>Current Run:</span>
                      <span className="text-blue-600">{instrument.currentRun}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Protocol Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Quantification Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(QPCR_PROTOCOLS).map(([key, protocol]) => (
                <div 
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProtocol === key 
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => setSelectedProtocol(key)}
                >
                  <h3 className="font-semibold mb-2">{protocol.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>Targets: {protocol.targets.join(', ')}</div>
                    <div>Duration: {protocol.duration}</div>
                    <div>Cycles: {protocol.cycles}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sample Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Samples Ready for Quantification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2">Lab Number</th>
                    <th className="text-left py-2">Case</th>
                    <th className="text-left py-2">Client</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Extraction Batch</th>
                    <th className="text-left py-2">Volume (µL)</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSamples.map(sample => (
                    <tr key={sample.id} className="border-b dark:border-gray-800">
                      <td className="py-2 font-mono">{sample.labNumber || sample.id}</td>
                      <td className="py-2">{sample.caseNumber || 'N/A'}</td>
                      <td className="py-2">{sample.clientName || 'Unknown'}</td>
                      <td className="py-2">{sample.sampleType}</td>
                      <td className="py-2">{sample.extractionBatch}</td>
                      <td className="py-2">{sample.volume}</td>
                      <td className="py-2">
                        <Badge variant="secondary">{sample.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex gap-4">
              <Button onClick={setupPlate} variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Setup 96-Well Plate
              </Button>
              <Button 
                onClick={startQuantification} 
                disabled={currentRun?.status === 'running'}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Quantification
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Run Progress */}
        {currentRun && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentRun.status === 'running' ? (
                  <>
                    <Clock className="h-5 w-5 text-blue-600" />
                    Quantification in Progress
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Quantification Complete
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Run ID: {currentRun.id}</span>
                  <span>Protocol: {QPCR_PROTOCOLS[currentRun.protocol].name}</span>
                </div>
                
                {currentRun.status === 'running' && (
                  <>
                    <Progress value={runProgress} className="w-full" />
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      {runProgress.toFixed(0)}% Complete - Cycle {Math.floor(runProgress * 40 / 100)}/40
                    </div>
                  </>
                )}
                
                {currentRun.status === 'completed' && (
                  <div className="text-green-600 font-semibold">
                    ✅ Run completed successfully at {currentRun.endTime?.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quantification Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2">Sample</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Concentration (ng/µL)</th>
                        <th className="text-left py-2">Degradation Index</th>
                        <th className="text-left py-2">Quality</th>
                        <th className="text-left py-2">PCR Recommendation</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(result => (
                        <tr key={result.id} className="border-b dark:border-gray-800">
                          <td className="py-2 font-mono">{result.id}</td>
                          <td className="py-2">{result.sampleType}</td>
                          <td className="py-2 font-semibold text-blue-600">
                            {result.concentration}
                          </td>
                          <td className="py-2">{result.degradationIndex}</td>
                          <td className="py-2">
                            <Badge 
                              variant={result.quality === 'Pass' ? 'secondary' : 'destructive'}
                              className={result.quality === 'Pass' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {result.quality}
                            </Badge>
                          </td>
                          <td className="py-2 text-xs">{result.recommendation}</td>
                          <td className="py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSample(result)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Amplification Curves */}
            {selectedSample && amplificationCurves[selectedSample.id] && (
              <Card>
                <CardHeader>
                  <CardTitle>Amplification Curve - {selectedSample.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={amplificationCurves[selectedSample.id]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cycle" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="rfu" 
                          stroke="#0d9488" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">Small Autosomal Ct</div>
                      <div className="text-blue-600">{selectedSample.ctValues.smallAutosomal}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Large Autosomal Ct</div>
                      <div className="text-blue-600">{selectedSample.ctValues.largeAutosomal}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Y-Chromosome Ct</div>
                      <div className="text-blue-600">{selectedSample.ctValues.yChromosome}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QpcrQuantification;