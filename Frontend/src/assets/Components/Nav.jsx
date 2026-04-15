import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Nav({ logout, currentUser }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-KE");
  const organizationLabel =
    currentUser?.organizationName ||
    (currentUser?.organizationId ? `ID ${currentUser.organizationId}` : "");

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      window.location.href = "/login";
    }
  };

  return (
    <nav className="bg-amber-700 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* Logo */}
        <div className="font-bold text-lg sm:text-xl flex items-center gap-2">
          ⛪ Church System
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6 text-sm">

          {/* Active Page */}
          <Link to="/" className="bg-amber-900 px-3 py-1 rounded">
            Ledger
          </Link>

          {/* Date */}
          <span className="opacity-90">
            📅 {today}
          </span>

          {/* User */}
          <span className="opacity-90">
            👤 {currentUser?.email || 'User'}
          </span>
          {organizationLabel ? (
            <span className="opacity-90">🏢 {organizationLabel}</span>
          ) : null}
          <Link
            to="/records"
            className="hover:bg-amber-800 px-3 py-1 rounded"
          >
            Records
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-amber-800 px-4 pb-4 space-y-3 text-sm">

          <div className="bg-amber-900 px-3 py-1 rounded w-fit">
            Ledger
          </div>

          <div>📅 {today}</div>
          <div>👤 {currentUser?.email || 'User'}</div>
          {organizationLabel && <div>🏢 {organizationLabel}</div>}
          <Link
            to="/records"
            className="block hover:bg-amber-700 px-3 py-1 rounded"
            onClick={() => setOpen(false)}
          >
            Records
          </Link>

          <button
            onClick={handleLogout}
            className="bg-red-500 px-3 py-1 rounded w-full text-left"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
