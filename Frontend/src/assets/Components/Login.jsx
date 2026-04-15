import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../../Utilities/api";

export default function Login({ onLogin }) {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (location.state?.registered) {
      setSuccessMessage(
        location.state?.email
          ? `Registration successful for ${location.state.email}. Please log in.`
          : "Registration successful. Please log in."
      );
      setEmail(location.state?.email || "");
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();
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
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 15, 100));
    }, 60);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Invalid credentials. Please try again.");

      const token = payload?.data?.token;
      if (!token) throw new Error("No token received from server.");

      const userInfo = payload?.data?.user || { email: normalizedEmail };
      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(userInfo));

      clearInterval(interval);
      setProgress(100);
      onLogin(userInfo);
      setLoading(false);
    } catch (err) {
      clearInterval(interval);
      setError(err?.message || "Network error. Please try again.");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-xl max-w-md w-full p-8 relative overflow-hidden">

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50">
            <p className="text-amber-700 font-semibold mb-4">Logging in...</p>
            <div className="w-full bg-gray-200 h-3 rounded overflow-hidden">
              <div
                className="bg-amber-600 h-3 rounded transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-700">Welcome Back!</h1>
          <p className="text-gray-600 mt-2">Login to access the Church Ledger</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-center">
            {successMessage}
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
              placeholder="Enter your password"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Login
          </button>
          <p>Not a user? <a href="/register" className="text-amber-600 hover:underline">Register here</a></p>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          &copy; {new Date().getFullYear()} Church Ledger
        </p>
      </div>

      {/* Animations */}
      <style>{`
        .transition-all {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
