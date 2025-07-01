import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';

const COLORS = ['#1976d2', '#43a047', '#ff9800'];

export default function Statistics() {
  const [view, setView] = useState('daily');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics(view);
  }, [view]);

  const loadStatistics = async (period) => {
    try {
      setLoading(true);
      const response = await api.getStatistics(period);
      if (response.success) {
        setStatistics(response.data);
      } else {
        setError('Failed to load statistics');
      }
    } catch (error) {
      setError('Error loading statistics');
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!statistics) return [];
    
    const { total_counts } = statistics;
    return [
      { name: 'Pending', value: total_counts.pending || 0 },
      { name: 'Processing', value: total_counts.processing || 0 },
      { name: 'Completed', value: total_counts.completed || 0 },
    ].filter(item => item.value > 0);
  };

  const data = getChartData();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: `Sample Status Distribution (${view === 'daily' ? 'Today' : 'This Month'})`
      }
    }
  };

  return (
    <div className="flex justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup type="single" value={view} onValueChange={v => v && setView(v)} className="mb-4">
            <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          </ToggleGroup>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading statistics...</span>
            </div>
          )}

          {statistics && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.total_counts.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{statistics.total_counts.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{statistics.total_counts.processing}</div>
                  <div className="text-sm text-gray-600">Processing</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.total_counts.completed}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>

              {/* Chart */}
              {data.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {data.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No data available for the selected period
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 