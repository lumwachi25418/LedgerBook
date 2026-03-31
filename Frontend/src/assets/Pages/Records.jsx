import { useEffect, useState } from "react";

export default function Records() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("saved-pdfs") || "[]");
    setReports([...saved].reverse());
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

  const deletePDF = (index) => {
    if (!window.confirm("Delete this record?")) return;

    const updated = [...reports];
    updated.splice(index, 1);

    setReports(updated);
    localStorage.setItem("saved-pdfs", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6 max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold text-amber-700 mb-6 text-center">
          📂 Saved Reports
        </h1>

        {reports.length === 0 ? (
          <p className="text-center text-gray-500">No records found</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div
                key={index}
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
                    onClick={() => deletePDF(index)}
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