'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { printReceipt } from '../utils/printReceipt';

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await apiFetch('/sales/history');
      const data = await res.json();
      if (data.success) {
        setSales(data.sales);
      }
    } catch (err) {
      console.error('Failed to fetch sales history', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sales History & Invoices</h1>

      {loading ? (
        <p className="text-gray-500">Loading sales history...</p>
      ) : sales.length === 0 ? (
        <p className="text-gray-500">No sales recorded yet.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-gray-600 text-sm">
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Total (Rs.)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3 font-semibold text-blue-600">{sale.invoice_no}</td>
                  <td className="p-3">{new Date(sale.created_at).toLocaleString()}</td>
                  <td className="p-3 uppercase">{sale.payment_method}</td>
                  <td className="p-3 font-bold text-green-600">Rs. {Number(sale.total).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => printReceipt(sale)}
                      className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-black transition"
                    >
                      Print Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}