'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const emptyForm = {
  name: '',
  generic_salt: '',
  category: '',
  sale_price_per_unit: '',
  purchase_price_per_unit: '',
  tax_rate: 0
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/medicines');
      const data = await res.json();
      if (data.success) {
        setProducts(data.medicines);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Product added successfully!');
        setFormData(emptyForm);
        fetchProducts();
      } else {
        alert(data.message || 'Failed to add product');
      }
    } catch (err) {
      console.error('Error creating product:', err);
    }
  };

  const handleDelete = async (p) => {
    const ok = window.confirm(
      `"${p.name}" delete karna hai?\n\nIska saara stock (batches) bhi delete ho jayega.`
    );
    if (!ok) return;

    try {
      const res = await apiFetch(`/products/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProducts();
      } else {
        alert(data.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Server error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Product & Medicine Management</h1>

      {/* Add Product Form */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Medicine</h2>
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Medicine Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="border rounded-lg p-2 text-sm"
          />
          <input
            type="text"
            placeholder="Generic Salt"
            value={formData.generic_salt}
            onChange={(e) => setFormData({ ...formData, generic_salt: e.target.value })}
            className="border rounded-lg p-2 text-sm"
          />
          <input
            type="text"
            placeholder="Category (e.g. Tablets, Syrup)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            className="border rounded-lg p-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Sale Price per Unit"
            value={formData.sale_price_per_unit}
            onChange={(e) => setFormData({ ...formData, sale_price_per_unit: e.target.value })}
            required
            className="border rounded-lg p-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Purchase Price per Unit"
            value={formData.purchase_price_per_unit}
            onChange={(e) => setFormData({ ...formData, purchase_price_per_unit: e.target.value })}
            required
            className="border rounded-lg p-2 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition md:col-span-3"
          >
            Save Product
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b text-gray-600 text-sm">
              <th className="p-3">Name</th>
              <th className="p-3">Generic Salt</th>
              <th className="p-3">Category</th>
              <th className="p-3">Sale Price</th>
              <th className="p-3">Stock Available</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">No products found.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3 font-semibold text-gray-800">{p.name}</td>
                  <td className="p-3 text-gray-600">{p.generic_salt || '-'}</td>
                  <td className="p-3">{p.category || 'General'}</td>
                  <td className="p-3 font-bold text-green-600">Rs. {Number(p.price).toFixed(2)}</td>
                  <td className="p-3">{p.stock} units</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(p)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}