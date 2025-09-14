import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  MessageSquare,
  UserPlus,
  AlertCircle,
  Activity,
  TrendingUp,
  Gavel
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

const CaseManagement = () => {
  // Initialize with demo data for forensic paternity cases
  const [cases, setCases] = useState([
    {
      id: 1,
      case_number: 'PAT-2024-001',
      test_purpose: 'Paternity Testing',
      priority: 'court_date',
      status: 'in_progress',
      requester_name: 'Family Court District 5',
      requester_organization: 'State Family Court',
      submission_date: '2024-01-15',
      court_date: '2024-02-15',
      sample_count: 3,
      active_alerts: 1
    },
    {
      id: 2,
      case_number: 'PAT-2024-002',
      test_purpose: 'Paternity Testing',
      priority: 'urgent',
      status: 'review',
      requester_name: 'Attorney Jane Smith',
      requester_organization: 'Smith & Associates Law Firm',
      submission_date: '2024-01-18',
      sample_count: 3,
      active_alerts: 0
    },
    {
      id: 3,
      case_number: 'KIN-2024-003',
      test_purpose: 'Kinship Analysis',
      priority: 'routine',
      status: 'completed',
      requester_name: 'Immigration Services',
      requester_organization: 'USCIS',
      submission_date: '2024-01-10',
      sample_count: 5,
      active_alerts: 0
    },
    {
      id: 4,
      case_number: 'PAT-2024-004',
      test_purpose: 'Paternity Testing',
      priority: 'stat',
      status: 'submitted',
      requester_name: 'Dr. Michael Johnson',
      requester_organization: 'Private Request',
      submission_date: '2024-01-20',
      sample_count: 3,
      active_alerts: 2
    }
  ]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [workloadSummary, setWorkloadSummary] = useState({
    total: 4,
    byStatus: {
      submitted: 1,
      in_progress: 1,
      review: 1,
      completed: 1
    },
    upcomingCourtDates: [
      { case_number: 'PAT-2024-001', court_date: '2024-02-15' }
    ],
    alerts: [
      { case_id: 1, message: 'Court date approaching' },
      { case_id: 4, message: 'STAT priority - expedite processing' },
      { case_id: 4, message: 'Missing consent form' }
    ]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [newCase, setNewCase] = useState({
    testPurpose: 'Paternity Testing',
    priority: 'routine',
    requesterName: '',
    requesterOrganization: '',
    requesterContact: '',
    courtCaseNumber: '',
    courtDate: '',
    specialInstructions: '',
    participants: []
  });

  const [newNote, setNewNote] = useState({
    noteType: 'general',
    content: '',
    isConfidential: false
  });

  useEffect(() => {
    // Using demo data - no need to fetch from API
    // fetchCases();
    // fetchWorkloadSummary();
  }, [filterStatus, filterPriority]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (searchTerm) params.caseNumber = searchTerm;

      const response = await axios.get(`${API_BASE_URL}/api/case-management/cases`, { params });
      setCases(response.data.data?.cases || []);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      setError('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkloadSummary = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/case-management/workload`);
      setWorkloadSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch workload:', error);
    }
  };

  const fetchCaseDetails = async (caseId) => {
    // Use demo data instead of API call
    const demoDetails = {
      1: {
        id: 1,
        case_number: 'PAT-2024-001',
        test_purpose: 'Paternity Testing',
        priority: 'court_date',
        status: 'in_progress',
        requester_name: 'Family Court District 5',
        requester_organization: 'State Family Court',
        submission_date: '2024-01-15',
        court_date: '2024-02-15',
        samples: [
          { id: 1, lab_number: 'LAB-001-C', name: 'John', surname: 'Doe', relation: 'Child' },
          { id: 2, lab_number: 'LAB-001-M', name: 'Jane', surname: 'Doe', relation: 'Mother' },
          { id: 3, lab_number: 'LAB-001-AF', name: 'Robert', surname: 'Smith', relation: 'Alleged Father' }
        ],
        timeline: [
          { event_date: '2024-01-15T09:00:00', event_description: 'Case submitted', performed_by: 'Court Clerk' },
          { event_date: '2024-01-16T10:30:00', event_description: 'Samples received', performed_by: 'Lab Reception' },
          { event_date: '2024-01-17T14:00:00', event_description: 'DNA extraction started', performed_by: 'Lab Tech' },
          { event_date: '2024-01-18T11:00:00', event_description: 'qPCR quantification completed', performed_by: 'Lab Tech' },
          { event_date: '2024-01-19T15:30:00', event_description: 'PCR amplification in progress', performed_by: 'Lab Tech' }
        ],
        notes: [
          { created_at: '2024-01-16T11:00:00', created_by: 'Lab Manager', note_content: 'Priority case for court date February 15', is_confidential: false },
          { created_at: '2024-01-17T16:00:00', created_by: 'QC Officer', note_content: 'All consent forms verified', is_confidential: false }
        ],
        alerts: [
          { id: 1, alert_message: 'Court date approaching - February 15, 2024', severity: 'medium', created_at: '2024-01-20T08:00:00', resolved: false }
        ]
      },
      2: {
        id: 2,
        case_number: 'PAT-2024-002',
        test_purpose: 'Paternity Testing',
        priority: 'urgent',
        status: 'review',
        requester_name: 'Attorney Jane Smith',
        requester_organization: 'Smith & Associates Law Firm',
        submission_date: '2024-01-18',
        samples: [
          { id: 4, lab_number: 'LAB-002-C', name: 'Emily', surname: 'Johnson', relation: 'Child' },
          { id: 5, lab_number: 'LAB-002-M', name: 'Sarah', surname: 'Johnson', relation: 'Mother' },
          { id: 6, lab_number: 'LAB-002-AF', name: 'Michael', surname: 'Williams', relation: 'Alleged Father' }
        ],
        timeline: [
          { event_date: '2024-01-18T10:00:00', event_description: 'Case submitted', performed_by: 'Attorney Office' },
          { event_date: '2024-01-18T14:00:00', event_description: 'Samples received', performed_by: 'Lab Reception' },
          { event_date: '2024-01-19T09:00:00', event_description: 'Processing completed', performed_by: 'Lab Tech' },
          { event_date: '2024-01-20T11:00:00', event_description: 'Report under review', performed_by: 'Lab Director' }
        ],
        notes: [
          { created_at: '2024-01-18T15:00:00', created_by: 'Lab Tech', note_content: 'Clean DNA profiles obtained', is_confidential: false }
        ],
        alerts: []
      }
    };
    
    setSelectedCase(demoDetails[caseId] || cases.find(c => c.id === caseId));
  };

  const createCase = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/case-management/cases`, newCase);
      if (response.data.success) {
        setShowCreateDialog(false);
        fetchCases();
        setNewCase({
          testPurpose: 'Paternity Testing',
          priority: 'routine',
          requesterName: '',
          requesterOrganization: '',
          requesterContact: '',
          courtCaseNumber: '',
          courtDate: '',
          specialInstructions: '',
          participants: []
        });
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      setError('Failed to create case');
    }
  };

  const updateCaseStatus = async (caseId, newStatus) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/case-management/cases/${caseId}/status`,
        { status: newStatus }
      );
      if (response.data.success) {
        fetchCases();
        if (selectedCase?.id === caseId) {
          fetchCaseDetails(caseId);
        }
      }
    } catch (error) {
      console.error('Failed to update case status:', error);
      setError('Failed to update case status');
    }
  };

  const addCaseNote = async () => {
    if (!selectedCase) return;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/case-management/cases/${selectedCase.id}/notes`,
        {
          ...newNote,
          createdBy: 'Current User' // In production, get from auth context
        }
      );
      if (response.data.success) {
        setShowNoteDialog(false);
        fetchCaseDetails(selectedCase.id);
        setNewNote({ noteType: 'general', content: '', isConfidential: false });
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      setError('Failed to add note');
    }
  };

  const exportCase = async (caseId, format = 'json') => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/case-management/cases/${caseId}/export`,
        { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' }
      );
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `case_${caseId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `case_${caseId}.json`);
        link.click();
      }
    } catch (error) {
      console.error('Failed to export case:', error);
      setError('Failed to export case');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      review: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'stat':
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'court_date':
        return <Gavel className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Workload Summary */}
      {workloadSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold">{workloadSummary.total}</p>
                </div>
                <Briefcase className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {workloadSummary.byStatus?.in_progress || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming Court</p>
                  <p className="text-2xl font-bold text-orange-600">
                    1
                  </p>
                </div>
                <Gavel className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-red-600">
                    3
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Case Management
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Case</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new case
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Test Purpose</label>
                      <Select 
                        value={newCase.testPurpose} 
                        onValueChange={(v) => setNewCase({...newCase, testPurpose: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paternity Testing">Paternity Testing</SelectItem>
                          <SelectItem value="Kinship Analysis">Kinship Analysis</SelectItem>
                          <SelectItem value="Identification">Identification</SelectItem>
                          <SelectItem value="Criminal Investigation">Criminal Investigation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select 
                        value={newCase.priority} 
                        onValueChange={(v) => setNewCase({...newCase, priority: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="stat">STAT</SelectItem>
                          <SelectItem value="court_date">Court Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Requester Name"
                      value={newCase.requesterName}
                      onChange={(e) => setNewCase({...newCase, requesterName: e.target.value})}
                    />
                    <Input
                      placeholder="Organization"
                      value={newCase.requesterOrganization}
                      onChange={(e) => setNewCase({...newCase, requesterOrganization: e.target.value})}
                    />
                  </div>

                  <Input
                    placeholder="Contact Information"
                    value={newCase.requesterContact}
                    onChange={(e) => setNewCase({...newCase, requesterContact: e.target.value})}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Court Case Number"
                      value={newCase.courtCaseNumber}
                      onChange={(e) => setNewCase({...newCase, courtCaseNumber: e.target.value})}
                    />
                    <Input
                      type="date"
                      placeholder="Court Date"
                      value={newCase.courtDate}
                      onChange={(e) => setNewCase({...newCase, courtDate: e.target.value})}
                    />
                  </div>

                  <textarea
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    placeholder="Special Instructions"
                    value={newCase.specialInstructions}
                    onChange={(e) => setNewCase({...newCase, specialInstructions: e.target.value})}
                  />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createCase}>
                      Create Case
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search by case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchCases()}
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
                <SelectItem value="court_date">Court Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cases List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">Loading cases...</div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No cases found</p>
              </div>
            ) : (
              cases.map((case_) => (
                <Card 
                  key={case_.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => fetchCaseDetails(case_.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{case_.case_number}</p>
                            {getPriorityIcon(case_.priority)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {case_.test_purpose || 'Testing'} • {case_.requester_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(case_.submission_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(case_.status)}>
                          {case_.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {case_.sample_count > 0 && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            {case_.sample_count}
                          </div>
                        )}
                        {case_.active_alerts > 0 && (
                          <Badge variant="destructive">
                            {case_.active_alerts} Alert{case_.active_alerts !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportCase(case_.id, 'json');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Details Modal */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Case {selectedCase.case_number}</span>
                <Badge className={getStatusColor(selectedCase.status)}>
                  {selectedCase.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Test Purpose</p>
                    <p className="font-medium">{selectedCase.test_purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Priority</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedCase.priority}</p>
                      {getPriorityIcon(selectedCase.priority)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submission Date</p>
                    <p className="font-medium">
                      {new Date(selectedCase.submission_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Court Date</p>
                    <p className="font-medium">
                      {selectedCase.court_date ? 
                        new Date(selectedCase.court_date).toLocaleDateString() : 
                        'N/A'}
                    </p>
                  </div>
                </div>

                {selectedCase.samples?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Samples ({selectedCase.samples.length})</h4>
                    <div className="space-y-1">
                      {selectedCase.samples.map(sample => (
                        <div key={sample.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{sample.lab_number} - {sample.name} {sample.surname}</span>
                          <span className="text-gray-600">{sample.relation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Select 
                    value={selectedCase.status} 
                    onValueChange={(v) => updateCaseStatus(selectedCase.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline"
                    onClick={() => setShowNoteDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <div className="space-y-2">
                  {selectedCase.timeline?.map((event, index) => (
                    <div key={index} className="flex gap-3 p-3 border-l-2 border-gray-200">
                      <Clock className="h-4 w-4 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.event_description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.event_date).toLocaleString()} • {event.performed_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="notes">
                <div className="space-y-2">
                  {selectedCase.notes?.map((note, index) => (
                    <Card key={index}>
                      <CardContent className="py-3">
                        <p className="text-sm">{note.note_content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {note.created_by} • {new Date(note.created_at).toLocaleString()}
                          {note.is_confidential && (
                            <Badge className="ml-2" variant="secondary">Confidential</Badge>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="alerts">
                <div className="space-y-2">
                  {selectedCase.alerts?.map((alert, index) => (
                    <Alert key={index} className={alert.severity === 'high' ? 'border-red-500' : ''}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <p>{alert.alert_message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                axios.put(`${API_BASE_URL}/api/case-management/alerts/${alert.id}/resolve`, {
                                  resolvedBy: 'Current User'
                                }).then(() => fetchCaseDetails(selectedCase.id));
                              }}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Case Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select 
              value={newNote.noteType} 
              onValueChange={(v) => setNewNote({...newNote, noteType: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
              </SelectContent>
            </Select>
            
            <textarea
              className="w-full p-2 border rounded-md"
              rows="4"
              placeholder="Note content..."
              value={newNote.content}
              onChange={(e) => setNewNote({...newNote, content: e.target.value})}
            />
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.isConfidential}
                onChange={(e) => setNewNote({...newNote, isConfidential: e.target.checked})}
              />
              <span className="text-sm">Mark as confidential</span>
            </label>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addCaseNote}>
                Add Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert className="bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CaseManagement;