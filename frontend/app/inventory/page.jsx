'use client';
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const badgeStyle = {
  'Expired': 'bg-red-100 text-red-700',
  'Near Expiry': 'bg-yellow-100 text-yellow-700',
  'Low Stock': 'bg-orange-100 text-orange-700'
};

export default function InventoryPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/inventory/alerts');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching inventory alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Inventory Alerts & Expiry Monitoring</h1>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Critical Stock & Expiry Warnings</h2>

        {loading ? (
          <p className="text-gray-500">Checking inventory status...</p>
        ) : alerts.length === 0 ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            ✅ All stocks are healthy! No low stock or near-expiry batches found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b text-gray-600 text-sm">
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Batch No</th>
                  <th className="p-3">Remaining Stock</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 text-sm">
                    <td className="p-3 font-medium text-gray-800">{item.name}</td>
                    <td className="p-3 text-gray-600">{item.batch_number || '-'}</td>
                    <td className="p-3 text-gray-600">{item.stock}</td>
                    <td className="p-3 text-gray-700 font-semibold">
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeStyle[item.alert_type] || 'bg-red-100 text-red-700'}`}>
                        {item.alert_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}