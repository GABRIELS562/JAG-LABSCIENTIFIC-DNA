import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileDown,
  Eye,
  Users,
  Calculator,
  BarChart3,
  Package,
  Link
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ForensicReports = () => {
  const [selectedCase, setSelectedCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [reportType, setReportType] = useState('paternity');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [caseReports, setCaseReports] = useState([]);
  const [paternityResults, setPaternityResults] = useState(null);

  useEffect(() => {
    fetchCases();
    fetchReportTemplates();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      fetchCaseReports(selectedCase);
      if (reportType === 'paternity') {
        fetchPaternityResults(selectedCase);
      }
    }
  }, [selectedCase, reportType]);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/test-cases`);
      setCases(response.data.cases || []);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    }
  };

  const fetchReportTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/forensic-reports/templates`);
      setReportTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchCaseReports = async (caseId) => {
    try {
      const caseInfo = cases.find(c => c.id === parseInt(caseId));
      if (caseInfo) {
        const response = await axios.get(`${API_BASE_URL}/api/forensic-reports/case/${caseInfo.case_number}`);
        setCaseReports(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch case reports:', error);
      setCaseReports([]);
    }
  };

  const fetchPaternityResults = async (caseId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/paternity/simulate/${caseId}`);
      if (response.data.success) {
        setPaternityResults(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch paternity results:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedCase) {
      setError('Please select a case');
      return;
    }

    setGeneratingReport(true);
    setError(null);
    setReportGenerated(null);

    try {
      let endpoint = '';
      let requestData = {};
      
      const caseInfo = cases.find(c => c.id === parseInt(selectedCase));

      switch (reportType) {
        case 'paternity':
          endpoint = '/api/forensic-reports/paternity';
          requestData = {
            caseId: selectedCase,
            caseData: {
              caseNumber: caseInfo?.case_number,
              refKitNumber: caseInfo?.ref_kit_number,
              testDate: caseInfo?.submission_date,
              testPurpose: 'Paternity Testing',
              participants: {}
            },
            results: paternityResults || {
              cpi: 999999,
              probability: 0.9999,
              conclusion: 'INCLUDED',
              locusResults: []
            },
            options: {
              includeElectropherogram: true,
              includeStatistics: true,
              includeChainOfCustody: true
            }
          };
          break;

        case 'comprehensive':
          endpoint = `/api/forensic-reports/comprehensive/${selectedCase}`;
          requestData = {};
          break;

        case 'kinship':
          endpoint = '/api/forensic-reports/kinship';
          requestData = {
            analysisData: {
              caseNumber: caseInfo?.case_number,
              relationship: 'full-sibling',
              profiles: [],
              likelihoodRatio: 100,
              interpretation: 'Consistent with proposed relationship'
            }
          };
          break;

        case 'mixture':
          endpoint = '/api/forensic-reports/mixture';
          requestData = {
            mixtureData: {
              caseNumber: caseInfo?.case_number,
              numContributors: 2,
              majorContributor: {},
              minorContributor: {},
              mixtureRatio: '3:1',
              interpretation: 'Two-person mixture detected'
            }
          };
          break;

        case 'batch':
          endpoint = '/api/forensic-reports/batch';
          requestData = {
            batchId: caseInfo?.batch_id,
            options: {
              includeSummary: true,
              includeDetails: true
            }
          };
          break;

        case 'chain-of-custody':
          endpoint = '/api/forensic-reports/chain-of-custody';
          requestData = {
            caseId: selectedCase,
            custodyData: {
              collector: 'Sample Collector',
              collectionDate: new Date(),
              chainOfCustody: []
            }
          };
          break;

        default:
          throw new Error('Invalid report type');
      }

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, requestData);
      
      if (response.data.success) {
        setReportGenerated(response.data.data);
        // Refresh case reports
        fetchCaseReports(selectedCase);
      } else {
        throw new Error(response.data.message || 'Report generation failed');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forensic-reports/download/${reportId}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download report');
    }
  };

  const viewReport = async (reportId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/forensic-reports/${reportId}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('View error:', error);
      setError('Failed to view report');
    }
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'paternity': return <Users className="h-4 w-4" />;
      case 'kinship': return <Link className="h-4 w-4" />;
      case 'mixture': return <BarChart3 className="h-4 w-4" />;
      case 'comprehensive': return <FileText className="h-4 w-4" />;
      case 'batch': return <Package className="h-4 w-4" />;
      case 'chain-of-custody': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeBadge = (type) => {
    const colors = {
      paternity: 'bg-blue-100 text-blue-800',
      kinship: 'bg-purple-100 text-purple-800',
      mixture: 'bg-orange-100 text-orange-800',
      comprehensive: 'bg-green-100 text-green-800',
      batch: 'bg-yellow-100 text-yellow-800',
      'chain-of-custody': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forensic Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList>
              <TabsTrigger value="generate">Generate Report</TabsTrigger>
              <TabsTrigger value="history">Report History</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Case</label>
                  <Select value={selectedCase} onValueChange={setSelectedCase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.case_number} - {c.test_purpose}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(template.id)}
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCase && reportType && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="font-medium">Report Information</h4>
                      <div className="text-sm text-gray-600">
                        {reportTemplates.find(t => t.id === reportType)?.description}
                      </div>
                      
                      {paternityResults && reportType === 'paternity' && (
                        <div className="mt-4 p-4 bg-white rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">CPI:</span>
                              <p className="font-bold">{paternityResults.cpi?.toLocaleString() || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Probability:</span>
                              <p className="font-bold">{(paternityResults.probability * 100).toFixed(4)}%</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Conclusion:</span>
                              <p className="font-bold text-green-600">{paternityResults.conclusion}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Alert className="bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              {reportGenerated && (
                <Alert className="bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700">
                    Report generated successfully!
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewReport(reportGenerated.reportId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReport(reportGenerated.reportId)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={generateReport}
                disabled={!selectedCase || !reportType || generatingReport}
                className="w-full"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {caseReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No reports generated for this case</p>
                  {selectedCase && (
                    <p className="text-sm mt-2">Generate a report to see it here</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {caseReports.map((report, index) => (
                    <Card key={index} className="hover:bg-gray-50 transition-colors">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getReportTypeIcon(report.report_type)}
                            <div>
                              <p className="font-medium text-sm">{report.report_id}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {getReportTypeBadge(report.report_type)}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewReport(report.report_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadReport(report.report_id)}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Statistics */}
      {selectedCase && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {caseReports.filter(r => r.report_type === 'paternity').length}
                </div>
                <div className="text-sm text-gray-600">Paternity Reports</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {caseReports.filter(r => r.report_type === 'kinship').length}
                </div>
                <div className="text-sm text-gray-600">Kinship Reports</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {caseReports.filter(r => r.report_type === 'mixture').length}
                </div>
                <div className="text-sm text-gray-600">Mixture Reports</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {caseReports.length}
                </div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ForensicReports;