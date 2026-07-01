import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../Utilities/api';

function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    console.log("Register button clicked");
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedOrganisation = organisation.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail || !normalizedPassword || !normalizedOrganisation) {
      setError('Please provide email, organisation, and password.');
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
      const payload = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedEmail,
          organisation: normalizedOrganisation,
          password: normalizedPassword,
        }),
        timeout: 10000,
      });

      const token = payload?.data?.token;
      if (!token) {
        setError('Registration completed but no token received.');
        return;
      }

      const userInfo = payload?.data?.user || { email: normalizedEmail };
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(userInfo));
      onRegister?.(userInfo);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
            <input
              type="text"
              value={organisation || ""}
              onChange={(e) => setOrganisation(e.target.value)} 
              placeholder="Enter your organisation"
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
          Already have an account? <Link to="/login" className="text-amber-600 hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}
export default Register;
