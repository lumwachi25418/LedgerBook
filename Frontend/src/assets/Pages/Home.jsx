import { useState, useEffect } from "react";
import { getLedgers, createLedger, createTransaction, updateTransaction, saveLedgerTransactions } from "../../Utilities/api";

const denominations = [1000, 500, 200, 100, 50, 40, 20, 10, 5];
const defaultCategories = ["English Service", "Kiswahili Service", "Youth Service", "Sunday School", "Teens"];

const typeOptions = [
  "offering",
  "tithes",
  "pillar",
  "Thanksgiving",
  "Bearevement",
  "firstfruits"
];
const typeLabels = {
  offering: "Offering",
  tithes: "Tithe",
  pillar: "Pillar",
  Thanksgiving: "Thanksgiving",
  Bearevement: "Bereavement",
  firstfruits: "Firstfruits",
};

const normalizeCategory = (value = "") => {
  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();

  if (lower === "english service") return "English Service";
  if (lower === "kiswahili service") return "Kiswahili Service";
  if (lower === "youth service") return "Youth Service";
  if (lower === "sunday school") return "Sunday School";
  if (lower === "teens") return "Teens";

  return trimmed;
};

const initialRow = Object.fromEntries(denominations.map(d => [d, 0]));
const formatKES = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n || 0);

const selectLedgerForDate = (ledgers = [], date) => {
  const matches = ledgers.filter((ledger) => ledger.name === date);

  return matches.sort((a, b) => {
    const aTransactions = a.Transactions?.length || 0;
    const bTransactions = b.Transactions?.length || 0;
    if (aTransactions !== bTransactions) return bTransactions - aTransactions;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  })[0] || null;
};

export default function LedgerApp() {
  const [categories, setCategories] = useState([...defaultCategories]);
  const [newCategory, setNewCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dataByDate, setDataByDate] = useState({});
  const [activeLedger, setActiveLedger] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ loading: false, error: '' });
  const [specialEventsByDate, setSpecialEventsByDate] = useState({});
  const [newEventName, setNewEventName] = useState("");
  const [newGivingTypeInput, setNewGivingTypeInput] = useState({});
  const [serviceGivingTypesByCategory, setServiceGivingTypesByCategory] = useState({});
  const cashEditable = true;

  const initializeLedger = async (date) => {
    setBackendStatus({ loading: true, error: '' });
    try {
      const result = await getLedgers();
      setActiveLedger(selectLedgerForDate(result?.data || [], date));
    } catch (err) {
      setBackendStatus({ loading: false, error: err.message });
    } finally {
      setBackendStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    initializeLedger(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setDataByDate((prev) => {
      if (prev[selectedDate]) return prev;

      const initialData = Object.fromEntries(
        categories.map(cat => [
          cat,
          {
            cash: [{ category: cat, type: "offering", ...initialRow }],
          }
        ])
      );

      return {
        ...prev,
        [selectedDate]: initialData
      };
    });

    setSpecialEventsByDate((prev) => {
      if (prev[selectedDate]) return prev;
      return {
        ...prev,
        [selectedDate]: [],
      };
    });
  }, [categories, selectedDate]);

  const categoryData = dataByDate[selectedDate] || {};
  const isPastDate = selectedDate < new Date().toISOString().split("T")[0];

  const handleChange = (cat, idx, denom, value) => {
    if (!cashEditable || isPastDate || !categoryData[cat]) return;
    const updated = { ...categoryData };
    updated[cat].cash[idx][denom] = Number(value) || 0;
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const handleTypeChange = (cat, idx, value) => {
    if (!cashEditable || isPastDate || !categoryData[cat]) return;
    const updated = { ...categoryData };
    updated[cat].cash[idx].type = value;
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const addRow = (cat) => {
    if (!cashEditable || isPastDate || ["Sunday School", "Teens"].includes(cat)) return;
    const updated = { ...categoryData };
    updated[cat].cash.push({ category: cat, type: "offering", ...initialRow });
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const removeRow = (cat, idx) => {
    if (!cashEditable || isPastDate || ["Sunday School", "Teens"].includes(cat)) return;
    const updated = { ...categoryData };
    updated[cat].cash = updated[cat].cash.filter((_, i) => i !== idx);
    setDataByDate({ ...dataByDate, [selectedDate]: updated });
  };

  const addCategory = () => {
    if (!newCategory.trim() || isPastDate) return;

    const normalizedCategory = normalizeCategory(newCategory);
    if (categories.includes(normalizedCategory)) {
      setNewCategory("");
      return;
    }

    setCategories([...categories, normalizedCategory]);

    const updated = { ...categoryData };
    updated[normalizedCategory] = {
      cash: [{ category: normalizedCategory, type: "offering", ...initialRow }],
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

  const specialEvents = specialEventsByDate[selectedDate] || [];

  const addSpecialEvent = () => {
    if (!cashEditable || isPastDate || !newEventName.trim()) return;
    const updated = { ...specialEventsByDate };
    updated[selectedDate] = [
      ...specialEvents,
      {
        eventType: newEventName.trim(),
        customTypes: [],
        rows: [{ type: "offering", ...initialRow }],
      },
    ];
    setSpecialEventsByDate(updated);
    setNewEventName("");
  };

  const removeSpecialEvent = (index) => {
    if (!cashEditable || isPastDate) return;
    const updated = { ...specialEventsByDate };
    updated[selectedDate] = specialEvents.filter((_, i) => i !== index);
    setSpecialEventsByDate(updated);
  };

  const addSpecialEventRow = (eventIndex) => {
    if (!cashEditable || isPastDate) return;
    const updatedEvents = [...specialEvents];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      rows: [
        ...updatedEvents[eventIndex].rows,
        { type: "offering", ...initialRow },
      ],
    };
    setSpecialEventsByDate({ ...specialEventsByDate, [selectedDate]: updatedEvents });
  };

  const removeSpecialEventRow = (eventIndex, rowIndex) => {
    if (!cashEditable || isPastDate) return;
    const updatedEvents = [...specialEvents];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      rows: updatedEvents[eventIndex].rows.filter((_, i) => i !== rowIndex),
    };
    setSpecialEventsByDate({ ...specialEventsByDate, [selectedDate]: updatedEvents });
  };

  const updateSpecialEventRowField = (eventIndex, rowIndex, field, value) => {
    if (!cashEditable || isPastDate) return;
    const updatedEvents = [...specialEvents];
    const updatedRows = [...updatedEvents[eventIndex].rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      rows: updatedRows,
    };
    setSpecialEventsByDate({ ...specialEventsByDate, [selectedDate]: updatedEvents });
  };

  const addCustomGivingType = (eventIndex) => {
    if (!cashEditable || isPastDate) return;
    const inputKey = `event_${eventIndex}`;
    const customType = newGivingTypeInput[inputKey]?.trim();
    
    if (!customType) return;

    const updatedEvents = [...specialEvents];
    const customTypes = updatedEvents[eventIndex].customTypes || [];
    
    if (!customTypes.includes(customType)) {
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        customTypes: [...customTypes, customType],
      };
      setSpecialEventsByDate({ ...specialEventsByDate, [selectedDate]: updatedEvents });
      setNewGivingTypeInput({ ...newGivingTypeInput, [inputKey]: "" });
    }
  };

  const removeCustomGivingType = (eventIndex, typeToRemove) => {
    if (!cashEditable || isPastDate) return;
    const updatedEvents = [...specialEvents];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      customTypes: (updatedEvents[eventIndex].customTypes || []).filter(t => t !== typeToRemove),
    };
    setSpecialEventsByDate({ ...specialEventsByDate, [selectedDate]: updatedEvents });
  };

  const addCustomServiceGivingType = (cat) => {
    if (!cashEditable || isPastDate) return;

    const inputKey = `service_${cat}`;
    const customType = newGivingTypeInput[inputKey]?.trim();

    if (!customType) return;

    const existingTypes = serviceGivingTypesByCategory[cat] || [];
    const normalizedStandardTypes = typeOptions.map((type) => type.toLowerCase());
    const alreadyExists =
      existingTypes.some((type) => type.toLowerCase() === customType.toLowerCase()) ||
      normalizedStandardTypes.includes(customType.toLowerCase());

    if (alreadyExists) {
      setNewGivingTypeInput({ ...newGivingTypeInput, [inputKey]: "" });
      return;
    }

    setServiceGivingTypesByCategory({
      ...serviceGivingTypesByCategory,
      [cat]: [...existingTypes, customType],
    });
    setNewGivingTypeInput({ ...newGivingTypeInput, [inputKey]: "" });
  };

  const removeCustomServiceGivingType = (cat, typeToRemove) => {
    if (!cashEditable || isPastDate) return;

    setServiceGivingTypesByCategory({
      ...serviceGivingTypesByCategory,
      [cat]: (serviceGivingTypesByCategory[cat] || []).filter((type) => type !== typeToRemove),
    });
  };

  const calculateRowTotal = (row) =>
    denominations.reduce((sum, d) => sum + ((row?.[d] || 0) * d), 0);

  const calculateSpecialEventTotal = (event) =>
    (event.rows || []).reduce((eventSum, row) => eventSum + calculateRowTotal(row), 0);

  const calculateSpecialEventsSubtotal = () =>
    specialEvents.reduce((sum, event) => sum + calculateSpecialEventTotal(event), 0);

  const calculateCashTotal = (cat) =>
    (categoryData[cat]?.cash || []).reduce((sum, row) => sum + calculateRowTotal(row), 0);

  const calculateCategoryTotal = (cat) => {
    // Home page only has cash - mpesa and cheque are filled in Records later
    return calculateCashTotal(cat);
  };

  const specialEventsSubtotal = calculateSpecialEventsSubtotal();
  const grandTotal = categories.reduce((sum, cat) => sum + calculateCategoryTotal(cat), 0) + specialEventsSubtotal;

  const buildTransactionPayloads = () => {
    const payloads = [];

    categories.forEach((cat) => {
      const normalizedCategory = normalizeCategory(cat);
      const data = categoryData[cat];
      if (!data) return;

      (data.cash || []).forEach((row) => {
        const amount = calculateRowTotal(row);
        if (amount <= 0) return;

        payloads.push({
          description: `${normalizedCategory} cash - ${row.type}`,
          amount,
          date: selectedDate,
          payment_method: "cash",
          category: normalizedCategory,
          transaction_type: row.type,
        });
      });
    });

    specialEvents.forEach((event) => {
      (event.rows || []).forEach((row) => {
        const amount = calculateRowTotal(row);
        if (amount <= 0) return;

        payloads.push({
          description: `${event.eventType || 'Special Event'} ${row.type}`.trim(),
          amount,
          date: selectedDate,
          payment_method: "cash",
          category: "Special Event",
          transaction_type: row.type,
          event_type: event.eventType?.trim() || null,
        });
      });
    });

    return payloads;
  };

  const saveTransactionsOneByOne = async (entries, ledger = activeLedger) => {
    const existingTransactions = ledger?.Transactions || [];

    for (const tx of entries) {
      const existing = existingTransactions.find((item) =>
        item.payment_method === tx.payment_method &&
        normalizeCategory(item.category) === tx.category &&
        item.transaction_type === tx.transaction_type &&
        (item.event_type || null) === (tx.event_type || null)
      );

      if (existing) {
        await updateTransaction(ledger.id, existing.id, tx);
      } else {
        await createTransaction(ledger.id, tx);
      }
    }
  };

  const getOrCreateLedgerForDate = async () => {
    const result = await getLedgers();
    const existing = selectLedgerForDate(result?.data || [], selectedDate);

    if (existing) {
      setActiveLedger(existing);
      return existing;
    }

    const created = await createLedger({ name: selectedDate, description: `Ledger for ${selectedDate}` });
    setActiveLedger(created.data);
    return created.data;
  };

  const saveToBackend = async () => {
    const entries = buildTransactionPayloads();
    if (entries.length === 0) {
      setBackendStatus({ loading: false, error: 'Enter at least one amount before saving.' });
      return;
    }

    setBackendStatus({ loading: true, error: '' });

    try {
      const ledger = activeLedger?.id ? activeLedger : await getOrCreateLedgerForDate();

      try {
        await saveLedgerTransactions(ledger.id, entries);
      } catch (err) {
        if (err.status !== 404) throw err;
        await saveTransactionsOneByOne(entries, ledger);
      }
      await initializeLedger(selectedDate);

    } catch (err) {
      setBackendStatus({ loading: false, error: err.message });
      return;
    }

    setBackendStatus({ loading: false, error: '' });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* UI remains EXACTLY the same */}
      {/* (No changes below this point as requested) */}
      
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-700">⛪ Church Ledger</h1>
        </div>

        <div className="max-w-md mx-auto mb-6 bg-white p-4 rounded shadow">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border rounded"/>
        </div>

        <div className="max-w-md mx-auto mb-6 flex gap-2">
          <input value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Add category..."/>
          <button onClick={addCategory} className="bg-amber-600 text-white px-4 rounded">Add</button>
        </div>

        <div className="max-w-6xl mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md border-2 border-indigo-200">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            ✨ Special Event Collections
          </h2>
          <p className="text-sm text-indigo-700 mb-4">Add special events (Choir Day, Mothering Sunday, Wedding, etc.) and track their collections separately.</p>
          
          {/* Event Input Section */}
          <div className="bg-white p-4 rounded-lg border border-indigo-200 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSpecialEvent()}
                  className="w-full p-3 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Enter event name (e.g., Choir Day, Mothering Sunday, Wedding)"
                  disabled={!cashEditable || isPastDate}
                />
              </div>
              <button
                onClick={addSpecialEvent}
                disabled={!cashEditable || isPastDate || !newEventName.trim()}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-md"
              >
                ➕ Save Event
              </button>
            </div>
          </div>

          {specialEvents.length > 0 ? (
            <div className="mt-6 space-y-6">
              <div className="text-sm font-semibold text-indigo-800 mb-3">📋 Added Events: {specialEvents.length}</div>
              {specialEvents.map((event, eventIndex) => (
                <div key={eventIndex} className="border-2 border-indigo-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        🎯 {event.eventType || "Unnamed Event"}
                      </h3>
                      <p className="text-xs text-indigo-600 mt-1">Event total: <span className="font-semibold">{formatKES(calculateSpecialEventTotal(event))}</span></p>
                    </div>
                    <button
                      onClick={() => removeSpecialEvent(eventIndex)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition font-medium"
                      disabled={!cashEditable || isPastDate}
                    >
                      🗑️ Remove
                    </button>
                  </div>

                  {/* Custom Giving Types Section */}
                  <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-3">Add Custom Giving Types</h4>
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input
                        type="text"
                        value={newGivingTypeInput[`event_${eventIndex}`] || ""}
                        onChange={(e) => setNewGivingTypeInput({
                          ...newGivingTypeInput,
                          [`event_${eventIndex}`]: e.target.value
                        })}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomGivingType(eventIndex)}
                        className="flex-1 p-2 border-2 border-indigo-200 rounded focus:outline-none focus:border-indigo-500"
                        placeholder="e.g., Building Fund, Missions, Emergency Relief"
                        disabled={!cashEditable || isPastDate}
                      />
                      <button
                        onClick={() => addCustomGivingType(eventIndex)}
                        disabled={!cashEditable || isPastDate || !(newGivingTypeInput[`event_${eventIndex}`] || "").trim()}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                      >
                        ➕ Add Type
                      </button>
                    </div>
                    
                    {/* Display Custom Types */}
                    {event.customTypes && event.customTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.customTypes.map((customType) => (
                          <div key={customType} className="bg-white border-2 border-green-300 rounded-full px-3 py-1 flex items-center gap-2 text-sm">
                            <span className="text-indigo-700 font-semibold">{customType}</span>
                            <button
                              onClick={() => removeCustomGivingType(eventIndex, customType)}
                              className="text-red-500 hover:text-red-700 font-bold"
                              disabled={!cashEditable || isPastDate}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center border text-sm">
                      <thead className="bg-gray-800 text-white">
                        <tr>
                          <th>Type</th>
                          {denominations.map(d => <th key={d}>{d}</th>)}
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(event.rows || []).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <td>
                              <select
                                value={row.type}
                                onChange={(e) => updateSpecialEventRowField(eventIndex, rowIndex, 'type', e.target.value)}
                                className="border p-1 rounded w-full"
                                disabled={!cashEditable || isPastDate}
                              >
                                <optgroup label="Standard Types">
                                  {typeOptions.map(type => (
                                    <option key={type} value={type}>{typeLabels[type] || type}</option>
                                  ))}
                                </optgroup>
                                {(event.customTypes && event.customTypes.length > 0) && (
                                  <optgroup label="Custom Types">
                                    {event.customTypes.map(customType => (
                                      <option key={customType} value={customType}>{customType}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </td>
                            {denominations.map(d => (
                              <td key={d}>
                                <input
                                  type="number"
                                  value={row[d]}
                                  onChange={(e) => updateSpecialEventRowField(eventIndex, rowIndex, d, Number(e.target.value) || 0)}
                                  className="w-full text-center border rounded"
                                  readOnly={!cashEditable || isPastDate}
                                />
                              </td>
                            ))}
                            <td>{formatKES(calculateRowTotal(row))}</td>
                            <td>
                              <button
                                onClick={() => removeSpecialEventRow(eventIndex, rowIndex)}
                                className="text-red-500"
                                disabled={!cashEditable || isPastDate}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      onClick={() => addSpecialEventRow(eventIndex)}
                      disabled={!cashEditable || isPastDate}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition font-medium flex items-center gap-2"
                    >
                      ➕ Add Row
                    </button>
                  </div>
                </div>
              ))}

              <div className="text-right font-bold text-lg text-indigo-900 bg-gradient-to-r from-indigo-100 to-blue-100 p-4 rounded-lg border-2 border-indigo-200">
                Total from All Events: {formatKES(specialEventsSubtotal)}
              </div>
            </div>
          ) : (
            <div className="mt-6 p-4 bg-indigo-100 border-2 border-dashed border-indigo-300 rounded-lg text-center">
              <p className="text-indigo-700 font-medium">📝 No special events yet.</p>
              <p className="text-sm text-indigo-600">Enter an event name above and click "Save Event" to begin.</p>
            </div>
          )}
        </div>

        <div className="space-y-6 max-w-6xl mx-auto">
          {categories.map(cat => {
            const showControls = cashEditable && !["Sunday School", "Teens"].includes(cat);
            const serviceCustomTypes = serviceGivingTypesByCategory[cat] || [];
            const serviceInputKey = `service_${cat}`;

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

	                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
	                  <h3 className="text-sm font-semibold text-amber-900 mb-3">Add Custom Giving Type</h3>
	                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
	                    <input
	                      type="text"
	                      value={newGivingTypeInput[serviceInputKey] || ""}
	                      onChange={(e) => setNewGivingTypeInput({
	                        ...newGivingTypeInput,
	                        [serviceInputKey]: e.target.value
	                      })}
	                      onKeyPress={(e) => e.key === 'Enter' && addCustomServiceGivingType(cat)}
	                      className="flex-1 p-2 border-2 border-amber-200 rounded focus:outline-none focus:border-amber-500"
	                      placeholder="e.g., Building Fund, Missions, Emergency Relief"
	                      disabled={!cashEditable || isPastDate}
	                    />
	                    <button
	                      onClick={() => addCustomServiceGivingType(cat)}
	                      disabled={!cashEditable || isPastDate || !(newGivingTypeInput[serviceInputKey] || "").trim()}
	                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
	                    >
	                      ➕ Add Type
	                    </button>
	                  </div>

	                  {serviceCustomTypes.length > 0 && (
	                    <div className="flex flex-wrap gap-2">
	                      {serviceCustomTypes.map((customType) => (
	                        <div key={customType} className="bg-white border-2 border-green-300 rounded-full px-3 py-1 flex items-center gap-2 text-sm">
	                          <span className="text-amber-800 font-semibold">{customType}</span>
	                          <button
	                            onClick={() => removeCustomServiceGivingType(cat, customType)}
	                            className="text-red-500 hover:text-red-700 font-bold"
	                            disabled={!cashEditable || isPastDate}
	                          >
	                            ✕
	                          </button>
	                        </div>
	                      ))}
	                    </div>
	                  )}
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
                            className="border p-1 disabled:bg-gray-100 disabled:text-gray-500"
	                            disabled={!cashEditable || isPastDate}
	                          >
	                            <optgroup label="Standard Types">
	                              {typeOptions.map(type => (
	                                <option key={type} value={type}>{typeLabels[type] || type}</option>
	                              ))}
	                            </optgroup>
	                            {serviceCustomTypes.length > 0 && (
	                              <optgroup label="Custom Types">
	                                {serviceCustomTypes.map(customType => (
	                                  <option key={customType} value={customType}>{customType}</option>
	                                ))}
	                              </optgroup>
	                            )}
	                          </select>
                        </td>

                        {denominations.map(d => (
                          <td key={d}>
                            <input
                              type="number"
                              value={row[d]}
                              onChange={e => handleChange(cat, idx, d, e.target.value)}
                              className="w-full text-center border disabled:bg-gray-100 disabled:text-gray-500"
                              readOnly={!cashEditable || isPastDate}
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
