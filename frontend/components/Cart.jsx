'use client';
import { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';
const fmt = (n) => Number(n).toFixed(2);

export default function Cart({ cart, onSaleComplete }) {
  const { items, discount, totals, dispatch } = cart;
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState('cash');
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);

  const checkout = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API}/sales/checkout`, {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity })),
        discount,
        payment_method: payment,
      });
      setInvoice(data);
      dispatch({ type: 'CLEAR' });
      onSaleComplete?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full md:w-96 bg-white rounded-xl shadow p-4 space-y-3">
      <h2 className="text-xl font-bold">Cart</h2>
      {items.length === 0 && <p className="text-gray-500">No items</p>}

      {items.map(i => (
        <div key={i.id} className="flex items-center gap-2">
          <span className="flex-1">{i.name}</span>
          <input
            type="number" min="1" value={i.quantity}
            className="w-16 border rounded px-2 py-1"
            onChange={e => dispatch({ type: 'SET_QTY', id: i.id, quantity: parseInt(e.target.value) || 0 })}
          />
          <span className="w-20 text-right">{fmt(i.price * i.quantity)}</span>
          <button onClick={() => dispatch({ type: 'REMOVE', id: i.id })} className="text-red-500">✕</button>
        </div>
      ))}

      <div className="flex gap-2">
        <select
          value={discount.type}
          className="border rounded px-2 py-1"
          onChange={e => dispatch({ type: 'SET_DISCOUNT', discount: { ...discount, type: e.target.value } })}
        >
          <option value="flat">Flat</option>
          <option value="percent">%</option>
        </select>
        <input
          type="number" min="0" value={discount.value}
          className="flex-1 border rounded px-2 py-1" placeholder="Discount"
          onChange={e => dispatch({ type: 'SET_DISCOUNT', discount: { ...discount, value: e.target.value } })}
        />
      </div>

      <div className="border-t pt-2 space-y-1">
        <p className="flex justify-between"><span>Subtotal</span><span>{fmt(totals.subtotal)}</span></p>
        <p className="flex justify-between"><span>Tax</span><span>{fmt(totals.tax)}</span></p>
        <p className="flex justify-between"><span>Discount</span><span>-{fmt(totals.discount)}</span></p>
        <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{fmt(totals.total)}</span></p>
      </div>

      <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full border rounded px-2 py-1">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
      </select>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        disabled={!items.length || loading}
        onClick={checkout}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Processing…' : 'Complete Sale'}
      </button>

      {invoice && (
        <div className="bg-green-50 border border-green-300 rounded p-3 text-sm">
          ✅ {invoice.invoice_no} — Total {fmt(invoice.total)}
          <button onClick={() => window.print()} className="ml-2 underline">Print</button>
        </div>
      )}
    </div>
  );
}