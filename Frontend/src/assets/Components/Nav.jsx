import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Church, LogOut, FileText } from "lucide-react";

export default function Nav({ logout, currentUser }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-KE", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
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
    <nav className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 text-white shadow-2xl sticky top-0 z-50 border-b-4 border-amber-600">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="font-bold text-xl sm:text-2xl flex items-center gap-2 hover:opacity-80 transition duration-200">
          <Church className="w-7 h-7" />
          <span className="hidden sm:inline bg-gradient-to-r from-white to-amber-100 bg-clip-text text-transparent">Church Ledger</span>
          <span className="sm:hidden bg-gradient-to-r from-white to-amber-100 bg-clip-text text-transparent">Ledger</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8 text-sm">

          {/* Ledger Link */}
          <Link to="/" className="flex items-center gap-1 bg-amber-900 hover:bg-amber-950 px-4 py-2 rounded-lg transition font-medium shadow-md">
            📊 Ledger
          </Link>

          {/* Records Link */}
          <Link to="/records" className="flex items-center gap-1 hover:bg-amber-700 px-4 py-2 rounded-lg transition">
            <FileText className="w-4 h-4" /> Records
          </Link>

          {/* Divider */}
          <div className="h-6 w-px bg-amber-600"></div>

          {/* Date */}
          <div className="flex items-center gap-1 text-amber-50 whitespace-nowrap">
            📅 {today}
          </div>

          {/* Organization */}
          {organizationLabel && (
            <div className="flex items-center gap-1 text-amber-50 whitespace-nowrap">
              🏢 {organizationLabel}
            </div>
          )}

          {/* User */}
          <div className="flex items-center gap-1 text-amber-50 whitespace-nowrap">
            👤 {currentUser?.email?.split('@')[0] || 'User'}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition font-medium flex items-center gap-1 shadow-md"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Tablet Menu */}
        <div className="hidden md:flex lg:hidden items-center gap-4">
          <Link to="/" className="bg-amber-900 hover:bg-amber-950 px-3 py-2 rounded transition text-sm">📊</Link>
          <Link to="/records" className="hover:bg-amber-700 px-3 py-2 rounded transition text-sm"><FileText className="w-4 h-4" /></Link>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition text-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="text-white"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile & Tablet Menu */}
      {open && (
        <div className="md:hidden bg-gradient-to-b from-amber-800 to-amber-900 px-4 pb-4 space-y-3 text-sm border-t border-amber-600 shadow-lg">

          <Link
            to="/"
            className="block bg-amber-900 hover:bg-amber-950 px-4 py-2 rounded-lg transition font-medium"
            onClick={() => setOpen(false)}
          >
            📊 Ledger
          </Link>

          <Link
            to="/records"
            className="block hover:bg-amber-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <FileText className="w-4 h-4" /> Records
          </Link>

          <div className="h-px bg-amber-600 my-2"></div>

          <div className="px-4 py-2 text-amber-50">📅 {today}</div>
          {organizationLabel && <div className="px-4 py-2 text-amber-50">🏢 {organizationLabel}</div>}
          <div className="px-4 py-2 text-amber-50">👤 {currentUser?.email || 'User'}</div>

          <button
            onClick={() => {
              handleLogout();
              setOpen(false);
            }}
            className="block w-full bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition text-left font-medium flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
