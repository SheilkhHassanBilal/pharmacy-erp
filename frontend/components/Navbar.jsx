'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [role, setRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Client-side par token aur role check karein
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (token) {
      setIsLoggedIn(true);
      setRole(userRole);
    }
  }, [pathname]); // Jab bhi route change ho, status update ho

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setRole(null);
    router.push('/login');
  };

  // Agar user login nahi hai ya login page par hai, toh navbar show na karein
  if (!isLoggedIn || pathname === '/login') return null;

  return (
    <nav className="bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        {/* Logo / Brand */}
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold tracking-wide text-blue-400">Pharmacy ERP</span>
        </div>

        {/* Navigation Links based on Role */}
        <div className="hidden md:flex space-x-6 text-sm font-medium">
          <Link href="/dashboard" className={`hover:text-blue-400 transition ${pathname === '/dashboard' ? 'text-blue-400 font-bold' : ''}`}>
            Dashboard
          </Link>
          <Link href="/pos" className={`hover:text-blue-400 transition ${pathname === '/pos' ? 'text-blue-400 font-bold' : ''}`}>
            POS Terminal
          </Link>
          <Link href="/sales" className={`hover:text-blue-400 transition ${pathname === '/sales' ? 'text-blue-400 font-bold' : ''}`}>
            Sales History
          </Link>

          {(role === 'admin' || role === 'manager') && (
            <>
              <Link href="/products" className={`hover:text-blue-400 transition ${pathname === '/products' ? 'text-blue-400 font-bold' : ''}`}>
                Products
              </Link>
              <Link href="/grn" className={`hover:text-blue-400 transition ${pathname === '/grn' ? 'text-blue-400 font-bold' : ''}`}>
                GRN (Stock)
              </Link>
              <Link href="/inventory" className={`hover:text-blue-400 transition ${pathname === '/inventory' ? 'text-blue-400 font-bold' : ''}`}>
                Alerts
              </Link>
              <Link href="/suppliers" className={`hover:text-blue-400 transition ${pathname === '/suppliers' ? 'text-blue-400 font-bold' : ''}`}>
                Suppliers
              </Link>
            </>
          )}
        </div>

        {/* User Role & Logout */}
        <div className="flex items-center space-x-4">
          <span className="text-xs uppercase bg-gray-800 text-blue-300 px-3 py-1 rounded-full border border-gray-700">
            {role || 'User'}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}