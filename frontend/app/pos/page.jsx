'use client';
import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { printReceipt } from '../utils/printReceipt';

export default function POSPage() {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState(null); // { type: 'ok' | 'error', text }
  const [autoPrint, setAutoPrint] = useState(true);
  const [lastSale, setLastSale] = useState(null);
  const scanRef = useRef(null);

  useEffect(() => {
    fetchMedicines();
    scanRef.current?.focus();
  }, []);

  const fetchMedicines = async (query = '') => {
    try {
      setLoading(true);
      const res = await apiFetch(`/medicines?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setMedicines(data.medicines || []);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchMedicines(val);
  };

  const addToCart = (med) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === med.id);
      if (existing) {
        if (existing.quantity >= med.stock) return prevCart;
        return prevCart.map((item) =>
          item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...med, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) return item;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Scanner: barcode type hota hai aur Enter aata hai
  const handleScan = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue('');
    if (!code) return;

    try {
      const res = await apiFetch(`/medicines?search=${encodeURIComponent(code)}`);
      const data = await res.json();
      const med = (data.medicines || []).find((m) => m.barcode === code);

      if (!med) {
        setStatus({ type: 'error', text: `Barcode ${code} kisi medicine se match nahi hua.` });
      } else if (!med.stock) {
        setStatus({ type: 'error', text: `${med.name} ka stock khatam hai.` });
      } else {
        addToCart(med);
        setStatus({ type: 'ok', text: `${med.name} cart mein add ho gayi.` });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: 'Scan ke waqt server error aaya.' });
    }
    scanRef.current?.focus();
  };

  const subtotal = cart.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    try {
      setCheckingOut(true);
      const res = await apiFetch('/pos/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
          payment_method: paymentMethod.toLowerCase(),
          discount: 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastSale(data.sale);
        if (autoPrint && data.sale) printReceipt(data.sale);
        setStatus({
          type: 'ok',
          text: `Invoice ${data.invoice_no} save ho gaya. Total: Rs. ${Number(data.total).toFixed(2)}`,
        });
        setCart([]);
        fetchMedicines(searchQuery);
        scanRef.current?.focus();
      } else {
        alert(data.message || 'Checkout failed');
      }
    } catch (err) {
      console.error(err);
      alert('Server error during checkout');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Pharmacy POS Counter</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode scan */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <form onSubmit={handleScan}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scan Barcode (is field mein click karke scan karein)
              </label>
              <input
                ref={scanRef}
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                placeholder="Barcode scan karein..."
                autoComplete="off"
                className="w-full px-4 py-2 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>
            {status && (
              <p
                className={`mt-2 text-sm font-medium ${
                  status.type === 'ok' ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {status.text}
              </p>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl shadow-md">
            <input
              type="text"
              placeholder="Search medicines by name, generic salt or barcode..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white p-4 rounded-xl shadow-md min-h-[400px]">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Available Medicines</h2>
            {loading ? (
              <p className="text-gray-500">Loading medicines...</p>
            ) : medicines.length === 0 ? (
              <p className="text-gray-500">No medicines found in database.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medicines.map((med) => (
                  <div key={med.id} className="border p-3 rounded-lg flex justify-between items-center hover:shadow transition bg-white">
                    <div>
                      <h3 className="font-semibold text-gray-800">{med.name}</h3>
                      <p className="text-sm text-gray-500">
                        Stock: {med.stock || 0} | Rs. {Number(med.price).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(med)}
                      disabled={!med.stock}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Active Billing Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">Cart is empty</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Rs. {Number(item.price).toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 bg-gray-200 rounded font-bold hover:bg-gray-300">-</button>
                      <span className="text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 bg-gray-200 rounded font-bold hover:bg-gray-300">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
              />
              Checkout ke baad receipt khud print karein
            </label>

            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total Subtotal:</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {checkingOut ? 'Processing...' : 'Complete Checkout'}
            </button>

            {lastSale && (
              <button
                onClick={() => printReceipt(lastSale)}
                className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-semibold hover:bg-black transition"
              >
                Last Receipt Dobara Print Karein ({lastSale.invoice_no})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}