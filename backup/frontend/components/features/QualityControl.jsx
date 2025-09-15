import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { api } from '../../services/api';

export default function QualityControl() {
  const [tab, setTab] = useState('dashboard');
  const [qcRecords, setQcRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQualityControlData();
  }, []);

  const loadQualityControlData = async () => {
    try {
      setLoading(true);
      const [qcResponse, equipmentResponse] = await Promise.all([
        api.getQualityControl(),
        api.getEquipment()
      ]);

      if (qcResponse.success) {
        setQcRecords(qcResponse.data);
      }
      if (equipmentResponse.success) {
        setEquipment(equipmentResponse.data);
      }
    } catch (error) {
      setError('Failed to load quality control data');
    } finally {
      setLoading(false);
    }
  };

  const getQCSummary = () => {
    const total = qcRecords.length;
    const passed = qcRecords.filter(qc => qc.result === 'Passed').length;
    const failed = qcRecords.filter(qc => qc.result === 'Failed').length;
    return { total, passed, failed };
  };

  const getCalibrationStatus = () => {
    const today = new Date();
    return equipment.map(eq => {
      const nextCalibration = new Date(eq.next_calibration);
      const daysUntilCalibration = Math.ceil((nextCalibration - today) / (1000 * 60 * 60 * 24));
      const status = daysUntilCalibration < 0 ? 'Overdue' : 
                   daysUntilCalibration < 30 ? 'Due Soon' : 'Current';
      return { ...eq, daysUntilCalibration, status };
    });
  };
  const summary = getQCSummary();
  const calibrationData = getCalibrationStatus();

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading quality control data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Quality Control</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="batch-controls">Batch Controls</TabsTrigger>
              <TabsTrigger value="calibration">Calibration Status</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Logs</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                    <div className="text-sm text-gray-600">Total QC Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                    <div className="text-sm text-gray-600">Controls Passed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                    <div className="text-sm text-gray-600">Controls Failed</div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Recent QC Records</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Control Type</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Operator</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qcRecords.slice(0, 5).map((qc) => (
                      <TableRow key={qc.id}>
                        <TableCell>{qc.date}</TableCell>
                        <TableCell>{qc.control_type}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            qc.result === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {qc.result}
                          </span>
                        </TableCell>
                        <TableCell>{qc.operator}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="batch-controls">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Control Type</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qcRecords.map((qc) => (
                    <TableRow key={qc.id}>
                      <TableCell>{qc.batch_id || 'N/A'}</TableCell>
                      <TableCell>{qc.date}</TableCell>
                      <TableCell>{qc.control_type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          qc.result === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {qc.result}
                        </span>
                      </TableCell>
                      <TableCell>{qc.operator}</TableCell>
                      <TableCell className="max-w-xs truncate">{qc.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="calibration">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Last Calibration</TableHead>
                    <TableHead>Next Calibration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Until Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calibrationData.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{eq.equipment_id}</TableCell>
                      <TableCell>{eq.type}</TableCell>
                      <TableCell>{eq.last_calibration || 'N/A'}</TableCell>
                      <TableCell>{eq.next_calibration || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          eq.status === 'Current' ? 'bg-green-100 text-green-800' :
                          eq.status === 'Due Soon' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {eq.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {eq.daysUntilCalibration < 0 ? 
                          `${Math.abs(eq.daysUntilCalibration)} days overdue` :
                          `${eq.daysUntilCalibration} days`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="space-y-4">
                <p className="text-gray-600">Maintenance logs functionality coming soon...</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.filter(eq => eq.status === 'maintenance').map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                        <TableCell>{eq.equipment_id}</TableCell>
                        <TableCell>Maintenance required</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {eq.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="docs">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Standard Operating Procedures</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>SOP-001: Sample Processing and Quality Control</li>
                  <li>SOP-002: Equipment Calibration and Maintenance</li>
                  <li>SOP-003: DNA Extraction Quality Standards</li>
                  <li>SOP-004: PCR Quality Control Procedures</li>
                  <li>SOP-005: Electrophoresis Quality Assurance</li>
                </ul>
                
                <h3 className="text-lg font-semibold mt-6">Quality Control Guidelines</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Positive Control: Must amplify all expected alleles</li>
                  <li>Negative Control: No amplification products detected</li>
                  <li>Allelic Ladder: All expected peaks present and sized correctly</li>
                  <li>Sample Quality: RFU values above threshold for all loci</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 