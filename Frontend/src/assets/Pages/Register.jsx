import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail || !normalizedPassword) {
      setError('Please provide both email and password.');
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (normalizedPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error || 'Registration failed. Try again.';
        setError(message);
        setLoading(false);
        return;
      }

      const token = payload?.data?.token;
      if (!token) {
        setError('Registration completed but no token received.');
        setLoading(false);
        return;
      }

      const userInfo = payload?.data?.user || { email: normalizedEmail };
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(userInfo));
      onRegister(userInfo);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setError(`Network error while registering. Please try again. ${err?.message || ''}`.trim());
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Register</h2>
          <p className="text-gray-600 mt-2">Create an account to access the Church Ledger</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password || ""}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account? <a href="/login" className="text-amber-600 hover:underline">Login here</a>
        </p>
      </div>
    </div>
  );
}
export default Register;