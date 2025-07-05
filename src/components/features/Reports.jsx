import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { api } from '../../services/api';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.getReports();
      if (response.success) {
        setReports(response.data);
      } else {
        setError('Failed to load reports');
      }
    } catch (error) {
      setError('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report =>
    report.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.report_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading reports...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <Input
              placeholder="Search reports by number, type, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredReports.length} of {reports.length} reports
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Generated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Case ID</TableHead>
                <TableHead>Batch ID</TableHead>
                <TableHead>File Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    {searchQuery ? 'No reports found matching your search' : 'No reports available'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.report_number}</TableCell>
                    <TableCell>{report.report_type}</TableCell>
                    <TableCell>{report.date_generated}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </TableCell>
                    <TableCell>{report.case_id}</TableCell>
                    <TableCell>{report.batch_id}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-600">
                      {report.file_path}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Summary Statistics */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                <div className="text-sm text-gray-600">Total Reports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {reports.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => r.status === 'sent').length}
                </div>
                <div className="text-sm text-gray-600">Sent</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}