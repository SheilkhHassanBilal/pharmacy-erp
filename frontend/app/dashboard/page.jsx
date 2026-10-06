'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todayInvoices: 0,
    todayRevenue: 0,
    totalProducts: 0,
    criticalAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch(err => console.error('Error fetching dashboard stats:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pharmacy Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Loading analytics...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500">Today's Revenue</h3>
            <p className="text-2xl font-bold text-gray-800 mt-2">Rs. {Number(stats.todayRevenue).toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Today's Sales Bills</h3>
            <p className="text-2xl font-bold text-gray-800 mt-2">{stats.todayInvoices}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-500">Registered Medicines</h3>
            <p className="text-2xl font-bold text-gray-800 mt-2">{stats.totalProducts}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Critical / Near Expiry</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.criticalAlerts}</p>
          </div>
        </div>
      )}
    </div>
  );
}