'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const emptyForm = {
  product_id: '',
  batch_number: '',
  quantity: '',
  cost_price: '',
  sale_price: '',
  expiry_date: ''
};

export default function GRNPage() {
  const [medicines, setMedicines] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const loadMedicines = async () => {
    try {
      const res = await apiFetch('/medicines');
      const data = await res.json();
      if (data.success) setMedicines(data.medicines);
    } catch (err) {
      console.error('Error fetching medicines:', err);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch('/grn', {
        method: 'POST',
        body: JSON.stringify({
          product_id: formData.product_id, // UUID hai, Number() nahi
          batch_number: formData.batch_number,
          quantity: Number(formData.quantity),
          cost_price: Number(formData.cost_price),
          sale_price: formData.sale_price ? Number(formData.sale_price) : null,
          expiry_date: formData.expiry_date
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Stock received and batch added successfully!');
        setFormData(emptyForm);
        loadMedicines(); // dropdown ka stock refresh
      } else {
        alert(data.message || 'Failed to add stock');
      }
    } catch (err) {
      console.error(err);
      alert('Server error during stock receiving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Goods Receiving Note (GRN)</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Medicine</label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Medicine --</option>
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} (Current Stock: {med.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <input
              type="text"
              name="batch_number"
              placeholder="e.g. BATCH-9988"
              value={formData.batch_number}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                placeholder="e.g. 100"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                name="cost_price"
                placeholder="e.g. 15.00"
                value={formData.cost_price}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Sale Price (Optional)</label>
              <input
                type="number"
                step="0.01"
                name="sale_price"
                placeholder="e.g. 20.00"
                value={formData.sale_price}
                onChange={handleChange}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {loading ? 'Saving Stock...' : 'Receive Stock (GRN)'}
          </button>
        </form>
      </div>
    </div>
  );
}