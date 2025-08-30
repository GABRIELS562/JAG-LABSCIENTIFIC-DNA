import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Users,
  TestTube,
  Dna,
  Zap,
  BarChart3,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowRight,
  Beaker,
  FlaskConical,
  Microscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const PaternityLabDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSamples: 0,
    pendingSubmission: 0,
    inExtraction: 0,
    inPCR: 0,
    inElectrophoresis: 0,
    inAnalysis: 0,
    completed: 0,
    todaySubmissions: 0,
    activeBatches: 0,
    pendingReports: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [workflowMetrics, setWorkflowMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paternityWorkflow, setPaternityWorkflow] = useState(null);
  const [sampleTracking, setSampleTracking] = useState(null);

  // Workflow stages for 3500 Genetic Analyzer with PowerPlex ESX 17
  const workflowStages = [
    {
      id: 'submission',
      name: 'Sample Submission',
      icon: <Users className="h-5 w-5" />,
      color: 'blue',
      description: 'Buccal swab collection',
      route: '/client-register'
    },
    {
      id: 'extraction',
      name: 'DNA Extraction',
      icon: <Beaker className="h-5 w-5" />,
      color: 'purple',
      description: 'Automated extraction',
      route: '/dna-extraction'
    },
    {
      id: 'quantification',
      name: 'qPCR Quantification',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'teal',
      description: 'Real-time PCR quantification',
      route: '/qpcr-quantification'
    },
    {
      id: 'pcr',
      name: 'PCR Amplification',
      icon: <FlaskConical className="h-5 w-5" />,
      color: 'orange',
      description: 'PowerPlex ESX 17 STR kit',
      route: '/pcr-batches'
    },
    {
      id: 'electrophoresis',
      name: 'Capillary Electrophoresis',
      icon: <Zap className="h-5 w-5" />,
      color: 'yellow',
      description: '3500 Genetic Analyzer',
      route: '/electrophoresis'
    },
    {
      id: 'analysis',
      name: 'OSIRIS Analysis',
      icon: <Microscope className="h-5 w-5" />,
      color: 'green',
      description: 'LIZ 500 size standard',
      route: '/osiris-analysis'
    },
    {
      id: 'reporting',
      name: 'Report Generation',
      icon: <FileText className="h-5 w-5" />,
      color: 'indigo',
      description: 'Paternity reports',
      route: '/forensic-reports'
    }
  ];

  useEffect(() => {
    fetchDashboardData();
    fetchPaternityWorkflow(); // Initial fetch
    
    // Fetch immediately after component mounts
    setTimeout(() => {
      fetchPaternityWorkflow();
    }, 1000);
    
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchPaternityWorkflow();
    }, 10000); // Refresh every 10 seconds for live updates
    return () => clearInterval(interval);
  }, []);

  const fetchPaternityWorkflow = async () => {
    try {
      console.log('Fetching paternity workflow...');
      const [workflowRes, trackingRes] = await Promise.all([
        api.fetchJson('/workflow/paternity/status', { method: 'GET' }),
        api.fetchJson('/workflow/sample-tracking', { method: 'GET' })
      ]);
      
      console.log('Paternity workflow response:', workflowRes);
      
      if (workflowRes && workflowRes.data) {
        setPaternityWorkflow(workflowRes.data);
        console.log('Paternity workflow state set:', workflowRes.data);
        console.log('Stage distribution:', workflowRes.data.stageDistribution);
      }
      if (trackingRes && trackingRes.data) {
        setSampleTracking(trackingRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch paternity workflow:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);

      // Fetch multiple endpoints in parallel
      const [samplesRes, batchesRes, workflowRes] = await Promise.all([
        api.fetchJson('/samples', { method: 'GET' }),
        api.fetchJson('/batches', { method: 'GET' }),
        api.fetchJson('/workflow-status', { method: 'GET' })
      ]);

      // Process samples data
      const samples = samplesRes?.samples || [];
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));

      const stats = {
        totalSamples: samples.length,
        pendingSubmission: samples.filter(s => s.workflow_status === 'sample_collected').length,
        inExtraction: samples.filter(s => s.workflow_status === 'extraction_ready' || s.workflow_status === 'extraction_in_progress').length,
        inPCR: samples.filter(s => s.workflow_status === 'pcr_ready' || s.workflow_status === 'pcr_in_progress').length,
        inElectrophoresis: samples.filter(s => s.workflow_status === 'electro_ready' || s.workflow_status === 'electro_in_progress').length,
        inAnalysis: samples.filter(s => s.workflow_status === 'analysis_ready' || s.workflow_status === 'analysis_in_progress').length,
        completed: samples.filter(s => s.workflow_status === 'analysis_completed').length,
        todaySubmissions: samples.filter(s => new Date(s.collection_date) >= todayStart).length,
        activeBatches: batchesRes?.batches?.filter(b => b.status === 'processing').length || 0,
        pendingReports: samples.filter(s => s.workflow_status === 'analysis_completed' && !s.report_generated).length
      };

      setStats(stats);

      // Process workflow metrics
      if (workflowRes?.success) {
        setWorkflowMetrics(workflowRes.data);
      }

      // Generate recent activity
      const recentSamples = samples
        .sort((a, b) => new Date(b.updated_at || b.collection_date) - new Date(a.updated_at || a.collection_date))
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          labNumber: s.lab_number,
          name: `${s.name} ${s.surname}`,
          status: s.workflow_status,
          time: new Date(s.updated_at || s.collection_date).toLocaleTimeString(),
          caseNumber: s.case_number
        }));

      setRecentActivity(recentSamples);
      setLoading(false);
      setRefreshing(false);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sample_collected: 'bg-blue-100 text-blue-800',
      extraction_ready: 'bg-purple-100 text-purple-800',
      pcr_ready: 'bg-orange-100 text-orange-800',
      electro_ready: 'bg-yellow-100 text-yellow-800',
      analysis_ready: 'bg-green-100 text-green-800',
      analysis_completed: 'bg-green-500 text-white'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getWorkflowProgress = () => {
    const total = stats.totalSamples || 1;
    return {
      submission: ((stats.pendingSubmission / total) * 100).toFixed(1),
      extraction: ((stats.inExtraction / total) * 100).toFixed(1),
      pcr: ((stats.inPCR / total) * 100).toFixed(1),
      electrophoresis: ((stats.inElectrophoresis / total) * 100).toFixed(1),
      analysis: ((stats.inAnalysis / total) * 100).toFixed(1),
      completed: ((stats.completed / total) * 100).toFixed(1)
    };
  };

  // Get sample count for a specific workflow stage from live data
  const getStageCount = (stageId) => {
    if (!paternityWorkflow || !paternityWorkflow.stageDistribution) {
      console.log(`No workflow data for stage ${stageId}`);
      return 0;
    }
    
    // Map frontend stage IDs to possible API workflow_status values
    // The API returns various statuses, we need to sum related ones
    const stageMapping = {
      'submission': ['sample_collected'],
      'extraction': ['dna_extraction', 'extraction_ready', 'extraction_in_progress'],
      'quantification': ['pcr_ready', 'qpcr_ready'],
      'pcr': ['pcr_batched', 'pcr_in_progress', 'pcr_completed'],
      'electrophoresis': ['electro_ready', 'electro_batched', 'electro_in_progress', 'electro_completed'],
      'analysis': ['analysis_ready', 'analysis_in_progress', 'analysis_completed', 'osiris_analysis'],
      'reporting': ['report_ready', 'report_generation', 'report_sent']
    };
    
    const apiStageIds = stageMapping[stageId] || [stageId];
    let totalCount = 0;
    
    console.log(`Checking stage ${stageId}, looking for:`, apiStageIds);
    console.log('Available stages:', paternityWorkflow.stageDistribution.map(s => s.workflow_status));
    
    // Sum counts for all related statuses
    apiStageIds.forEach(apiId => {
      const stage = paternityWorkflow.stageDistribution.find(s => s.workflow_status === apiId);
      if (stage) {
        console.log(`Found ${stage.count} samples in ${apiId}`);
        totalCount += stage.count;
      }
    });
    
    console.log(`Stage ${stageId} total: ${totalCount}`);
    return totalCount;
  };

  const progress = getWorkflowProgress();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Paternity Lab Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
            3500 Genetic Analyzer • PowerPlex ESX 17 • LIZ 500 Size Standard
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {refreshing ? 'Refreshing...' : 'Live Data'}
          </Badge>
          <Button onClick={fetchDashboardData} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Today's Submissions</p>
                <p className="text-2xl font-bold">{stats.todaySubmissions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Active Batches</p>
                <p className="text-2xl font-bold">{stats.activeBatches}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">In Process</p>
                <p className="text-2xl font-bold">
                  {stats.inExtraction + stats.inPCR + stats.inElectrophoresis + stats.inAnalysis}
                </p>
              </div>
              <Activity className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Pending Reports</p>
                <p className="text-2xl font-bold">{stats.pendingReports}</p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Paternity Workflow Tracker - ALWAYS VISIBLE */}
      <Card className="border-2 border-green-500 dark:border-green-400 shadow-lg">
        <CardHeader className="bg-green-50 dark:bg-green-900/20">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-green-600 animate-pulse" />
              <span className="text-xl font-bold">🔬 Live Paternity Testing Workflow</span>
              <Badge variant="default" className="bg-green-500 text-white px-3 py-1">
                RUNNING
              </Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {paternityWorkflow ? (
                <>Cycles: <span className="font-bold text-lg">{paternityWorkflow.cyclesCompleted || 0}</span></>
              ) : (
                <>Connecting...</>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400 font-semibold">
                {paternityWorkflow?.totalSamples || 50} Paternity Test Samples Auto-Processing
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Updates every 10 seconds ⏱️
              </span>
            </div>
          </div>
          
          {/* Stage Distribution Grid */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-11 gap-2 mb-4">
            {paternityWorkflow && paternityWorkflow.stageDistribution ? (
              paternityWorkflow.stageDistribution.map(stage => (
                <div key={stage.workflow_status} className="text-center">
                  <div className={`p-2 rounded-lg border-2 ${
                    stage.count > 0 ? 'border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'
                  } ${
                    stage.workflow_status === 'sample_collected' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    stage.workflow_status === 'pcr_ready' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    stage.workflow_status === 'pcr_batched' ? 'bg-orange-100 dark:bg-orange-900/30' :
                    stage.workflow_status === 'pcr_completed' ? 'bg-orange-200 dark:bg-orange-800/30' :
                    stage.workflow_status === 'electro_ready' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    stage.workflow_status === 'electro_batched' ? 'bg-yellow-200 dark:bg-yellow-800/30' :
                    stage.workflow_status === 'electro_completed' ? 'bg-green-100 dark:bg-green-900/30' :
                    stage.workflow_status === 'analysis_ready' ? 'bg-teal-100 dark:bg-teal-900/30' :
                    stage.workflow_status === 'analysis_completed' ? 'bg-green-200 dark:bg-green-800/30' :
                    stage.workflow_status === 'report_ready' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                    stage.workflow_status === 'report_sent' ? 'bg-green-500 text-white' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <div className="text-2xl font-bold">{stage.count}</div>
                    <div className="text-xs mt-1 font-medium">
                      {stage.workflow_status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Show placeholder stages while loading
              ['Collection', 'PCR Ready', 'PCR Batch', 'PCR Done', 'Electro', 'Analysis', 'Report'].map(stage => (
                <div key={stage} className="text-center">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
                    <div className="text-2xl font-bold text-gray-400">--</div>
                    <div className="text-xs mt-1">{stage}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Visual Progress Bar */}
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-green-500 animate-pulse" />
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              🔄 Live demonstration - Samples cycle through all stages automatically
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dna className="h-5 w-5" />
            DNA Workflow Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {workflowStages.map((stage, index) => (
              <div key={stage.id} className="relative">
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate(stage.route)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-3 rounded-full mb-3 ${
                        stage.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        stage.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        stage.color === 'teal' ? 'bg-teal-100 dark:bg-teal-900/30' :
                        stage.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
                        stage.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        stage.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        stage.color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                        'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <div className={`${
                          stage.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          stage.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                          stage.color === 'teal' ? 'text-teal-600 dark:text-teal-400' :
                          stage.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                          stage.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          stage.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          stage.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {stage.icon}
                        </div>
                      </div>
                      <h4 className="font-semibold text-sm mb-1 dark:text-gray-100 transition-colors duration-300">{stage.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-300">{stage.description}</p>
                      <Badge variant="outline">
                        {getStageCount(stage.id)} samples
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                {index < workflowStages.length - 1 && (
                  <ArrowRight className="absolute top-1/2 -right-6 transform -translate-y-1/2 text-gray-400 hidden md:block" />
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2 transition-colors duration-300">
              <span>Overall Progress</span>
              <span>{progress.completed}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div className="h-full flex">
                <div className="bg-blue-500" style={{ width: `${progress.submission}%` }} title="Submission" />
                <div className="bg-purple-500" style={{ width: `${progress.extraction}%` }} title="Extraction" />
                <div className="bg-orange-500" style={{ width: `${progress.pcr}%` }} title="PCR" />
                <div className="bg-yellow-500" style={{ width: `${progress.electrophoresis}%` }} title="Electrophoresis" />
                <div className="bg-green-400" style={{ width: `${progress.analysis}%` }} title="Analysis" />
                <div className="bg-green-600" style={{ width: `${progress.completed}%` }} title="Completed" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4 transition-colors duration-300">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors duration-300">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm dark:text-gray-100 transition-colors duration-300">{activity.labNumber}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">• {activity.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(activity.status)} variant="outline">
                          {activity.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/register-client')}
              >
                <Users className="h-4 w-4 mr-2" />
                New Registration
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/pcr-batches')}
              >
                <Package className="h-4 w-4 mr-2" />
                Create PCR Batch
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/electrophoresis')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Run Electrophoresis
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/osiris-analysis')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze Results
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/forensic-reports')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => navigate('/case-management')}
              >
                <Microscope className="h-4 w-4 mr-2" />
                Manage Cases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {workflowMetrics.alerts && workflowMetrics.alerts.length > 0 && (
        <Alert className="border-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {workflowMetrics.alerts.map((alert, index) => (
                <div key={index}>{alert}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PaternityLabDashboard;