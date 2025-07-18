import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useApiData, useTable } from '../../hooks';
import { api } from '../../services/api';

export default function ReportsRefactored() {
  // Replace repetitive state management with custom hooks
  const {
    data: reports = [],
    loading,
    error,
    refetch
  } = useApiData(api.getReports, [], {
    initialData: [],
    onError: (error) => console.error('Failed to load reports:', error)
  });

  // Use table hook for search functionality
  const {
    data: filteredReports,
    searchQuery,
    handleSearchChange,
    totalItems
  } = useTable(reports, {
    searchFields: ['report_number', 'report_type', 'status'],
    initialPageSize: 50 // Show more items since we removed pagination for simplicity
  });

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
              <button 
                onClick={refetch}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mb-4">
            <Input
              placeholder="Search reports by number, type, or status..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredReports.length} of {totalItems} reports
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No reports match your search criteria' : 'No reports found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.report_number}</TableCell>
                    <TableCell>{report.report_type}</TableCell>
                    <TableCell>{new Date(report.date_generated).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </TableCell>
                    <TableCell>{report.case_id || '-'}</TableCell>
                    <TableCell>{report.batch_id || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={report.file_path}>
                      {report.file_path || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}