// app/utils/api.js
const API_BASE_URL = 'http://localhost:5000/api/pharmacy';

export async function apiFetch(endpoint, options = {}) {
  // LocalStorage se token sirf client-side par get karein
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Agar token invalid ya expire ho jaye (401/403), toh login page par bhej dein
    if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }

    return res;
  } catch (err) {
    console.error('API Fetch Error:', err);
    throw err;
  }
}