import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLedgers, createLedger, createTransaction } from "../../Utilities/api";

const denominations = [1000, 500, 200, 100, 50, 40, 20, 10, 5];
const defaultCategories = ["English Service", "Kiswahili Service", "Sunday School", "Teens"];

const typeOptions = [
  "offering",
  "tithes",
  "pillar",
  "Thanksgiving",
  "Bearevement",
  "firstfruits"
];

const formatKES = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function LedgerApp() {
  const initialRow = Object.fromEntries(denominations.map(d => [d, 0]));

  const emptyTypes = Object.fromEntries(typeOptions.map(t => [t, 0]));

  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dataByDate, setDataByDate] = useState({});
  const [ledgers, setLedgers] = useState([]);
  const [activeLedger, setActiveLedger] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ loading: false, error: '' });

  const initializeLedger = async (date) => {
    setBackendStatus({ loading: true, error: '' });
    try {
      const result = await getLedgers();
      const existing = (result?.data || []).find((l) => l.name === date);
      if (existing) {
        setActiveLedger(existing);
        setLedgers(result.data);
      } else {
        const created = await createLedger({ name: date, description: `Ledger for ${date}` });
        setActiveLedger(created.data);
        setLedgers([...(result?.data || []), created.data]);
      }
    } catch (err) {
      setBackendStatus({ loading: false, error: err.message });
    } finally {
      setBackendStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    initializeLedger(selectedDate);
  }, [selectedDate]);

  // INIT
 useEffect(() => {
  if (!dataByDate[selectedDate]) {
    const initialData = Object.fromEntries(
      categories.map(cat => [
        cat,
        {
          cash: [{ category: cat, type: "offering", ...initialRow }],
          mpesa: { ...emptyTypes },
          cheque: { ...emptyTypes }
        }
      ])
    );

    setDataByDate(prev => ({
      ...prev,
      [selectedDate]: initialData
    }));
  }
}, [selectedDate]); 

  const categoryData = dataByDate[selectedDate] || {};
  const isPastDate = selectedDate < new Date().toISOString().split("T")[0];

  // HANDLERS
  const handleChange = (cat, idx, denom, value) => {
    if (isPastDate || !categoryData[cat]) return;
    const updated = { ...categoryData };
    updated[cat].cash[idx][denom] = Number(value) || 0;
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const handleTypeChange = (cat, idx, value) => {
    if (isPastDate || !categoryData[cat]) return;
    const updated = { ...categoryData };
    updated[cat].cash[idx].type = value;
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const addRow = (cat) => {
    if (isPastDate || ["Sunday School", "Teens"].includes(cat)) return;
    const updated = { ...categoryData };
    updated[cat].cash.push({ category: cat, type: "offering", ...initialRow });
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const removeRow = (cat, idx) => {
    if (isPastDate || ["Sunday School", "Teens"].includes(cat)) return;
    const updated = { ...categoryData };
    updated[cat].cash = updated[cat].cash.filter((_, i) => i !== idx);
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const handlePaymentChange = (cat, payment, type, value) => {
    if (isPastDate || !categoryData[cat]) return;
    const updated = { ...categoryData };
    updated[cat][payment][type] = Number(value) || 0;
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const addCategory = () => {
    if (!newCategory.trim() || isPastDate) return;

    setCategories([...categories, newCategory]);

    const updated = { ...categoryData };
    updated[newCategory] = {
      cash: [{ category: newCategory, type: "offering", ...initialRow }],
      mpesa: { ...emptyTypes },
      cheque: { ...emptyTypes }
    };

    setDataByDate({ ...dataByDate, [selectedDate]: updated });
    setNewCategory("");
  };

  const deleteCategory = (cat) => {
    if (isPastDate || !window.confirm(`Delete ${cat}?`)) return;

    setCategories(categories.filter(c => c !== cat));

    const updated = { ...categoryData };
    delete updated[cat];

    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  // CALCULATIONS
  const calculateRowTotal = (row) =>
    denominations.reduce((sum, d) => sum + ((row?.[d] || 0) * d), 0);

  const calculateCashTotal = (cat) =>
    (categoryData[cat]?.cash || []).reduce((sum, row) => sum + calculateRowTotal(row), 0);

  const calculateCategoryTotal = (cat) => {
    const data = categoryData[cat];
    if (!data) return 0;

    let total = calculateCashTotal(cat);

    total += Object.values(data.mpesa || {}).reduce((s, v) => s + (v || 0), 0);
    total += Object.values(data.cheque || {}).reduce((s, v) => s + (v || 0), 0);

    return total;
  };

  const grandTotal = categories.reduce((sum, cat) => sum + calculateCategoryTotal(cat), 0);

  const gatherTransactions = () => {
    return categories.map((cat) => {
      const amount = calculateCategoryTotal(cat);
      return {
        description: `${cat} (${selectedDate})`,
        amount,
        date: selectedDate,
      };
    }).filter((entry) => entry.amount > 0);
  };

  const saveToBackend = async () => {
    if (!activeLedger?.id) return;
    const entries = gatherTransactions();
    if (entries.length === 0) return;

    setBackendStatus({ loading: true, error: '' });

    try {
      for (const tx of entries) {
        await createTransaction(activeLedger.id, tx);
      }
    } catch (err) {
      setBackendStatus({ loading: false, error: err.message });
      return;
    }

    setBackendStatus({ loading: false, error: '' });
  };

  // PDF EXPORT
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Church Ledger Report", 14, 10);

    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 14, 16);

    let y = 20;

    categories.forEach(cat => {
      const rows = [];

      (categoryData[cat]?.cash || []).forEach(row => {
        const total = calculateRowTotal(row);
        if (total > 0) rows.push([row.type, formatKES(total)]);
      });

      Object.entries(categoryData[cat]?.mpesa || {}).forEach(([type, val]) => {
        if (val > 0) rows.push([`M-PESA ${type}`, formatKES(val)]);
      });

      Object.entries(categoryData[cat]?.cheque || {}).forEach(([type, val]) => {
        if (val > 0) rows.push([`CHEQUE ${type}`, formatKES(val)]);
      });

      autoTable(doc, {
        startY: y,
        head: [[cat, "Amount"]],
        body: rows.length ? rows : [["", ""]],
        theme: "grid"
      });

      y = doc.lastAutoTable.finalY + 5;
    });

    doc.text(`Grand Total: ${formatKES(grandTotal)}`, 14, y + 5);

    const fileName = `Church_Ledger_${selectedDate}.pdf`;
    const dataUri = doc.output("datauristring");
    const base64File = dataUri.split(",")[1];

    // Save metadata + base64 to localStorage for Records page
    const saved = JSON.parse(localStorage.getItem("saved-pdfs") || "[]");
    const updated = [
      { name: fileName, date: selectedDate, file: base64File },
      ...saved,
    ];

    try {
      localStorage.setItem("saved-pdfs", JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not save report to localStorage", err);
    }

    doc.save(fileName);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-700">⛪ Church Ledger</h1>
        </div>

        <div className="max-w-md mx-auto mb-6 bg-white p-4 rounded shadow">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border rounded"/>
        </div>

        <div className="max-w-md mx-auto mb-6 flex gap-2">
          <input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border rounded"/>
          <button onClick={addCategory} className="bg-amber-600 text-white px-4 rounded">Add</button>
        </div>

        <div className="space-y-6 max-w-6xl mx-auto">
          {categories.map(cat => {
            const showControls = !["Sunday School", "Teens"].includes(cat);

            return (
              <div key={cat} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between mb-2">
                  <h2 className="font-bold">{cat}</h2>

                  <div className="flex gap-2">
                    {showControls && (
                      <button onClick={() => addRow(cat)} className="bg-amber-500 text-white px-3 py-1 rounded">
                        Add Row
                      </button>
                    )}

                    <button onClick={() => deleteCategory(cat)} className="bg-red-500 text-white px-2 py-1 rounded">
                      ✕
                    </button>
                  </div>
                </div>

                <table className="w-full text-center border text-sm">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th>Type</th>
                      {denominations.map(d => <th key={d}>{d}</th>)}
                      <th>Total</th>
                      {showControls && <th>Action</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {(categoryData[cat]?.cash || []).map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            value={row.type}
                            onChange={e => handleTypeChange(cat, idx, e.target.value)}
                            className="border p-1"
                          >
                            {typeOptions.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>

                        {denominations.map(d => (
                          <td key={d}>
                            <input
                              type="number"
                              value={row[d]}
                              onChange={e => handleChange(cat, idx, d, e.target.value)}
                              className="w-full text-center border"
                            />
                          </td>
                        ))}

                        <td>{formatKES(calculateRowTotal(row))}</td>

                        {showControls && (
                          <td>
                            <button onClick={() => removeRow(cat, idx)} className="text-red-500">
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {showControls && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {["mpesa", "cheque"].map(payment => (
                      <div key={payment}>
                        <h3 className="font-semibold uppercase mb-2">{payment}</h3>

                        {typeOptions.map(type => (
                          <div key={type} className="flex justify-between mb-1">
                            <label className="text-sm">{type}</label>
                            <input
                              type="number"
                              value={categoryData[cat]?.[payment]?.[type] || ""}
                              onChange={e => handlePaymentChange(cat, payment, type, e.target.value)}
                              className="border p-1 w-24 text-right"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 font-bold text-right">
                  Total: {formatKES(calculateCategoryTotal(cat))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white p-4 rounded shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 max-w-6xl mx-auto">
          <span className="font-bold">Grand Total: {formatKES(grandTotal)}</span>
          <div className="flex items-center gap-2">
            <button onClick={saveToBackend} className="bg-green-600 text-white px-4 py-2 rounded">
              Save to Backend
            </button>
            <button onClick={exportPDF} className="bg-blue-600 text-white px-4 py-2 rounded">
              Export PDF
            </button>
          </div>
        </div>

        {backendStatus.error && (
          <div className="max-w-6xl mx-auto mt-2 text-sm text-red-600">{backendStatus.error}</div>
        )}
        {backendStatus.loading && (
          <div className="max-w-6xl mx-auto mt-2 text-sm text-amber-600">Syncing with backend...</div>
        )}
      </div>
    </div>
  );
}