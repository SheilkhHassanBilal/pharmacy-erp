'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const emptySupplier = { name: '', company_name: '', phone: '' };
const emptyLedger = { supplier_id: '', amount: '', transaction_type: 'payment', description: '' };

export default function SupplierKhataPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState(emptySupplier);
  const [formData, setFormData] = useState(emptyLedger);
  const [loading, setLoading] = useState(false);

  const loadSuppliers = async () => {
    try {
      const res = await apiFetch('/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Supplier added!');
        setNewSupplier(emptySupplier);
        loadSuppliers();
      } else {
        alert(data.message || 'Failed to add supplier');
      }
    } catch (err) {
      console.error(err);
      alert('Server error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch('/suppliers/khata', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: formData.supplier_id, // UUID hai, Number() nahi
          amount: Number(formData.amount),
          transaction_type: formData.transaction_type,
          description: formData.description
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Ledger updated successfully!');
        setFormData(emptyLedger);
        loadSuppliers(); // balance refresh
      } else {
        alert(data.message || 'Failed to update khata');
      }
    } catch (err) {
      console.error(err);
      alert('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      {/* Add supplier */}
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Supplier</h2>
        <form onSubmit={handleAddSupplier} className="space-y-3">
          <input
            type="text"
            placeholder="Contact Name"
            value={newSupplier.name}
            onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Company Name"
            value={newSupplier.company_name}
            onChange={(e) => setNewSupplier({ ...newSupplier, company_name: e.target.value })}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Phone"
            value={newSupplier.phone}
            onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
            required
            className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-gray-800 text-white py-2 rounded-lg font-semibold hover:bg-black transition"
          >
            Save Supplier
          </button>
        </form>
      </div>

      {/* Khata */}
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Supplier Khata & Ledger</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              required
              className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} - {s.name} (Balance: Rs. {Number(s.current_balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="payment">Payment Given (Paid)</option>
                <option value="credit">Credit Added (Due)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="e.g. Bill #123 payment via cash"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {loading ? 'Processing...' : 'Save Ledger Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}