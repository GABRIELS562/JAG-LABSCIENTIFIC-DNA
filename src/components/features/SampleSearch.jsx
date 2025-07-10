import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { optimizedApi } from '../../services/optimizedApi';

export default function SampleSearch() {
  const [query, setQuery] = useState('');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all samples on component mount
  useEffect(() => {
    loadAllSamples();
  }, []);

  const loadAllSamples = async () => {
    try {
      setLoading(true);
      const response = await optimizedApi.getAllSamples();
      if (response.success) {
        setSamples(response.data);
      } else {
        setError('Failed to load samples');
      }
    } catch (error) {
      setError('Error loading samples');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      loadAllSamples();
      return;
    }

    try {
      setLoading(true);
      const response = await optimizedApi.searchSamples(searchQuery);
      if (response.success) {
        setSamples(response.data);
      } else {
        setError('Failed to search samples');
      }
    } catch (error) {
      setError('Error searching samples');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex justify-center p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Sample Search</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by Lab Number, Name, or Surname"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="mb-4"
          />
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="mb-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading samples...</span>
            </div>
          )}

          <div className="mb-4 text-sm text-gray-600">
            Found {samples.length} sample{samples.length !== 1 ? 's' : ''}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lab Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Surname</TableHead>
                <TableHead>Relation</TableHead>
                <TableHead>Collection Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    {query ? 'No samples found matching your search' : 'No samples available'}
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">{sample.lab_number}</TableCell>
                    <TableCell>{sample.name}</TableCell>
                    <TableCell>{sample.surname}</TableCell>
                    <TableCell>{sample.relation}</TableCell>
                    <TableCell>{sample.collection_date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sample.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sample.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sample.status}
                      </span>
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