import { useEffect, useState } from "react";

export default function Records() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState(""); // new search state
  const [loading, setLoading] = useState(true);

  // Fetch reports from backend
// Fetch reports from backend
const fetchReports = async () => {
  try {
    const res = await fetch("/api/reports"); // endpoint to fetch reports
    const data = await res.json();
    setReports(data); // <-- here is where the reports state is set
    setLoading(false);
  } catch (err) {
    console.error(err);
    setLoading(false);
  }
};

  useEffect(() => {
    fetchReports();
  }, []);

  const openPDF = (base64File) => {
    const byteString = atob(base64File);
    const buffer = new ArrayBuffer(byteString.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < byteString.length; i++) {
      view[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Delete report
  const deletePDF = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
      setReports(reports.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter reports by search
  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-700 mb-6 text-center">
          📂 Saved Reports
        </h1>

        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-center text-gray-500">No records found</p>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white p-4 rounded shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openPDF(report.file)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    View
                  </button>

                  <button
                    onClick={() => deletePDF(report.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}