import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  createTransaction,
  deleteTransaction,
  getLedgers,
  saveLedgerTransactions,
  updateLedger,
  updateTransaction,
} from "../../Utilities/api";

const defaultCategories = ["English Service", "Kiswahili Service", "Youth Service", "Sunday School", "Teens"];
const typeOptions = ["offering", "tithes", "pillar", "Thanksgiving", "Bearevement", "firstfruits"];
const typeLabels = {
  offering: "Offering",
  tithes: "Tithe",
  pillar: "Pillar",
  Thanksgiving: "Thanksgiving",
  Bearevement: "Bereavement",
  firstfruits: "Firstfruits",
};
const electronicMethods = ["mpesa", "cheque"];
const electronicCategory = "Electronic Giving";

const normalizePaymentMethod = (value = "") => {
  const normalized = String(value).trim().toLowerCase().replace(/[\s_-]/g, "");

  if (normalized === "mpesa") return "mpesa";
  if (normalized === "cheque" || normalized === "check") return "cheque";

  return normalized;
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

const normalizeTransactionType = (value = "") => {
  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();

  if (lower === "offering") return "offering";
  if (lower === "tithes") return "tithes";
  if (lower === "pillar") return "pillar";
  if (lower === "thanksgiving") return "Thanksgiving";
  if (lower === "bearevement" || lower === "bereavement") return "Bearevement";
  if (lower === "firstfruits") return "firstfruits";

  return trimmed;
};

const getTypeLabel = (type) => typeLabels[type] || type;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatOptionalCurrency = (amount) =>
  amount === null || amount === undefined ? "" : formatCurrency(amount);

const formatDate = (value) => {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getTransactionKey = (paymentMethod, type) =>
  `${normalizePaymentMethod(paymentMethod)}::${normalizeTransactionType(type)}`;

const parseTransactionKey = (key) => {
  const parts = key.split("::");

  if (parts.length === 2) {
    const [paymentMethod, type] = parts;
    return { paymentMethod, type };
  }

  const [, paymentMethod, type] = parts;
  return { paymentMethod, type };
};

const getRecordCategories = (savedRows = []) => {
  const savedCategories = Array.from(
    new Set(savedRows.map((row) => normalizeCategory(row.category)).filter(Boolean))
  );

  return [
    ...defaultCategories.filter((cat) => savedCategories.includes(cat)),
    ...savedCategories.filter((cat) => !defaultCategories.includes(cat)),
  ];
};

const getElectronicTypes = (transactions = [], values = {}) => {
  const types = new Set(typeOptions);

  transactions.forEach((transaction) => {
    if (!electronicMethods.includes(normalizePaymentMethod(transaction.payment_method))) return;
    const type = normalizeTransactionType(transaction.transaction_type);
    if (type) types.add(type);
  });

  Object.keys(values).forEach((key) => {
    const { paymentMethod, type } = parseTransactionKey(key);
    if (!electronicMethods.includes(normalizePaymentMethod(paymentMethod))) return;
    if (type) types.add(type);
  });

  return Array.from(types);
};

const getCashRows = (transactions) => {
  const rowMap = new Map();

  transactions.forEach((transaction) => {
    const category = normalizeCategory(transaction.category);
    if (
      normalizePaymentMethod(transaction.payment_method) !== "cash" ||
      !category ||
      category === "Bereavement Cash" ||
      category === "Bereavement M-Pesa" ||
      category === electronicCategory ||
      transaction.event_type
    ) {
      return;
    }

    const type = normalizeTransactionType(transaction.transaction_type) || "offering";
    const key = `${category}::${type}`;
    const existing = rowMap.get(key);

    if (existing) {
      existing.amount += Number(transaction.amount) || 0;
    } else {
      rowMap.set(key, {
        category,
        type,
        amount: Number(transaction.amount) || 0,
      });
    }
  });

  return Array.from(rowMap.values()).sort((a, b) => {
    const categoryOrder = defaultCategories.indexOf(a.category) - defaultCategories.indexOf(b.category);
    if (categoryOrder !== 0) return categoryOrder;
    return typeOptions.indexOf(a.type) - typeOptions.indexOf(b.type);
  });
};

const buildElectronicState = (transactions) => {
  const values = {};

  transactions.forEach((transaction) => {
    const paymentMethod = normalizePaymentMethod(transaction.payment_method);

    if (!electronicMethods.includes(paymentMethod)) return;
    if (transaction.event_type) return;

    const key = getTransactionKey(paymentMethod, transaction.transaction_type || "");
    values[key] = (Number(values[key]) || 0) + (Number(transaction.amount) || 0);
  });

  return values;
};

const getCashRowsSpecialEvents = (transactions) => {
  const rowMap = new Map();

  transactions.forEach((transaction) => {
    if (!transaction.event_type) return;
    
    if (normalizePaymentMethod(transaction.payment_method) !== "cash") {
      return;
    }

    const eventType = String(transaction.event_type).trim();
    const type = normalizeTransactionType(transaction.transaction_type) || "offering";
    const key = `${eventType}::${type}`;
    const existing = rowMap.get(key);

    if (existing) {
      existing.amount += Number(transaction.amount) || 0;
    } else {
      rowMap.set(key, {
        eventType,
        type,
        amount: Number(transaction.amount) || 0,
      });
    }
  });

  return Array.from(rowMap.values());
};

const getElectronicSpecialEvents = (transactions = []) => {
  const eventMap = new Map();

  transactions.forEach((transaction) => {
    if (!transaction.event_type) return;

    const paymentMethod = normalizePaymentMethod(transaction.payment_method);
    if (!electronicMethods.includes(paymentMethod)) return;

    const eventType = String(transaction.event_type).trim();
    const type = normalizeTransactionType(transaction.transaction_type) || "offering";
    const key = `${eventType}::${paymentMethod}::${type}`;
    const existing = eventMap.get(key);

    if (existing) {
      existing.amount += Number(transaction.amount) || 0;
    } else {
      eventMap.set(key, {
        eventType,
        paymentMethod,
        type,
        amount: Number(transaction.amount) || 0,
      });
    }
  });

  return Array.from(eventMap.values());
};

const getElectronicValues = (transactions, values = {}) => {
  const savedValues = buildElectronicState(transactions);
  const nextValues = { ...savedValues };

  Object.entries(values || {}).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined) return;
    nextValues[key] = value;
  });

  return nextValues;
};

export default function Records() {
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingLedgerId, setSavingLedgerId] = useState(null);
  const [entryValues, setEntryValues] = useState({});

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getLedgers();
      const nextLedgers = Array.isArray(response?.data) ? response.data : [];

      setLedgers(nextLedgers);
      setEntryValues((prev) => {
        const next = { ...prev };

        nextLedgers.forEach((ledger) => {
          next[ledger.id] = {
            ...buildElectronicState(ledger.Transactions || []),
            ...(prev[ledger.id] || {}),
          };
        });

        return next;
      });
    } catch (err) {
      console.error("Fetch ledgers error:", err);
      setError(err.message || "Could not load ledgers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const filteredLedgers = useMemo(() => {
    const query = search.toLowerCase();

    return ledgers.filter((ledger) => {
      const transactionText = (ledger.Transactions || [])
        .map((transaction) => `${transaction.description} ${transaction.category} ${transaction.transaction_type}`)
        .join(" ")
        .toLowerCase();

      return (
        ledger.name?.toLowerCase().includes(query) ||
        ledger.description?.toLowerCase().includes(query) ||
        transactionText.includes(query)
      );
    });
  }, [ledgers, search]);

  const getDisplayCashRows = (transactions) => {
    const savedRows = getCashRows(transactions);
    const rowByKey = new Map(
      savedRows.map((row) => [`${row.category}::${row.type}`, row])
    );
    const categories = getRecordCategories(savedRows);

    return categories.flatMap((category) =>
      typeOptions.map((type) => (
        rowByKey.get(`${category}::${type}`) || { category, type, amount: null }
      ))
    );
  };

  const handleEntryChange = (ledgerId, paymentMethod, type, value) => {
    const key = getTransactionKey(paymentMethod, type);

    setEntryValues((prev) => ({
      ...prev,
      [ledgerId]: {
        ...(prev[ledgerId] || {}),
        [key]: value,
      },
    }));
  };

  const buildElectronicPayloads = (ledger) => {
    const values = entryValues[ledger.id] || {};
    const transactions = ledger.Transactions || [];
    const payloads = [];

    typeOptions.forEach((type) => {
      electronicMethods.forEach((paymentMethod) => {
        const amount = Number(values[getTransactionKey(paymentMethod, type)]) || 0;
        const existing = transactions.some((transaction) =>
          normalizePaymentMethod(transaction.payment_method) === paymentMethod &&
          transaction.category === electronicCategory &&
          normalizeTransactionType(transaction.transaction_type) === type
        );

        if (amount <= 0 && !existing) return;

        payloads.push({
          description: `${type} ${paymentMethod} total`,
          amount,
          date: ledger.name,
          payment_method: paymentMethod,
          category: electronicCategory,
          transaction_type: type,
        });
      });
    });

    return payloads;
  };

  const saveTransactionsOneByOne = async (ledger, entries) => {
    const existingTransactions = ledger.Transactions || [];

    for (const tx of entries) {
      const existing = existingTransactions.find((item) =>
        normalizePaymentMethod(item.payment_method) === tx.payment_method &&
        item.category === tx.category &&
        normalizeTransactionType(item.transaction_type) === tx.transaction_type
      );

      if (existing) {
        await updateTransaction(ledger.id, existing.id, tx);
      } else {
        await createTransaction(ledger.id, tx);
      }
    }
  };

  const deleteLegacyElectronicTransactions = async (ledger) => {
    const legacyTransactions = (ledger.Transactions || []).filter((transaction) =>
      electronicMethods.includes(normalizePaymentMethod(transaction.payment_method)) &&
      transaction.category !== electronicCategory
    );

    for (const transaction of legacyTransactions) {
      await deleteTransaction(ledger.id, transaction.id);
    }
  };

  const saveAndFinalize = async (ledger) => {
    if (ledger.isFinalized) return;

    const entries = buildElectronicPayloads(ledger);

    try {
      setSavingLedgerId(ledger.id);
      setError("");

      await deleteLegacyElectronicTransactions(ledger);

      if (entries.length > 0) {
        try {
          await saveLedgerTransactions(ledger.id, entries);
        } catch (err) {
          if (err.status !== 404) throw err;
          await saveTransactionsOneByOne(ledger, entries);
        }
      }

      await updateLedger(ledger.id, { isFinalized: true });
      await fetchLedgers();
    } catch (err) {
      console.error("Save record error:", err);
      setError(err.message || "Could not save record");
    } finally {
      setSavingLedgerId(null);
    }
  };

  const downloadPdf = (ledger) => {
    const transactions = ledger.Transactions || [];
    const cashRows = getDisplayCashRows(transactions).filter((row) => Number(row.amount) > 0);
    const values = getElectronicValues(transactions, entryValues[ledger.id]);
    const rows = [];

    cashRows.forEach((cashRow) => {
      rows.push([
        cashRow.category,
        getTypeLabel(cashRow.type),
        formatCurrency(cashRow.amount),
        "",
        "",
        formatCurrency(cashRow.amount),
      ]);
    });

    getElectronicTypes(transactions, values).forEach((type) => {
      const mpesa = Number(values[getTransactionKey("mpesa", type)]) || 0;
      const cheque = Number(values[getTransactionKey("cheque", type)]) || 0;
      const total = mpesa + cheque;

      if (total <= 0) return;

      rows.push([
        "Electronic totals",
        getTypeLabel(type),
        "",
        formatCurrency(mpesa),
        formatCurrency(cheque),
        formatCurrency(total),
      ]);
    });

    const grandTotal = rows.reduce((sum, row) => {
      const raw = row[5].replace(/[^\d.-]/g, "");
      return sum + (Number(raw) || 0);
    }, 0);

    // Special Events Section
    const specialEventsCashRows = getCashRowsSpecialEvents(transactions).filter((row) => Number(row.amount) > 0);
    const specialEventsElectronic = getElectronicSpecialEvents(transactions);

    let specialEventsStartY = 46;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Church Ledger Record", 14, 18);
    doc.setFontSize(10);
    doc.text(`Ledger: ${ledger.name}`, 14, 26);
    doc.text(`Created: ${formatDate(ledger.createdAt)}`, 14, 32);
    doc.text(`Status: ${ledger.isFinalized ? "Finalized" : "Draft"}`, 14, 38);

    autoTable(doc, {
      startY: 46,
      head: [["Category", "Type", "Cash", "M-Pesa", "Cheque", "Total"]],
      body: rows,
      foot: [["", "", "", "", "Grand Total", formatCurrency(grandTotal)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [31, 41, 55] },
      footStyles: { fillColor: [245, 158, 11], textColor: [17, 24, 39] },
      didDrawPage: (data) => {
        specialEventsStartY = data.lastAutoTable.finalY + 10;
      },
    });

    // Add Special Events section if there are any
    if (specialEventsCashRows.length > 0 || specialEventsElectronic.length > 0) {
      doc.setFontSize(12);
      doc.text("Special Events Collections", 14, specialEventsStartY);

      const specialEventsRows = [];

      specialEventsCashRows.forEach((row) => {
        specialEventsRows.push([
          row.eventType,
          getTypeLabel(row.type),
          formatCurrency(row.amount),
          "",
          "",
          formatCurrency(row.amount),
        ]);
      });

      specialEventsElectronic.forEach((row) => {
        const total = Number(row.amount) || 0;
        if (total <= 0) return;

        const cash = row.paymentMethod === "cash" ? formatCurrency(row.amount) : "";
        const mpesa = row.paymentMethod === "mpesa" ? formatCurrency(row.amount) : "";
        const cheque = row.paymentMethod === "cheque" ? formatCurrency(row.amount) : "";

        specialEventsRows.push([
          row.eventType,
          getTypeLabel(row.type),
          cash,
          mpesa,
          cheque,
          formatCurrency(row.amount),
        ]);
      });

      const specialEventsTotal = specialEventsRows.reduce((sum, row) => {
        const raw = row[5].replace(/[^\d.-]/g, "");
        return sum + (Number(raw) || 0);
      }, 0);

      autoTable(doc, {
        startY: specialEventsStartY + 6,
        head: [["Event Type", "Type", "Cash", "M-Pesa", "Cheque", "Total"]],
        body: specialEventsRows,
        foot: [["", "", "", "", "Subtotal", formatCurrency(specialEventsTotal)]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [191, 219, 254], textColor: [30, 64, 175] },
      });
    }

    doc.save(`ledger-${ledger.name}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Ledger Records</h1>

      <input
        type="text"
        placeholder="Search ledgers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />

      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      {!loading && !error && filteredLedgers.length === 0 && (
        <p className="text-center text-gray-500">No ledger records found</p>
      )}

      <div className="space-y-6">
        {filteredLedgers.map((ledger) => {
          const transactions = ledger.Transactions || [];
          const cashRows = getDisplayCashRows(transactions);
          const values = getElectronicValues(transactions, entryValues[ledger.id]);
          const readOnly = Boolean(ledger.isFinalized);
          const visibleCashTotal = cashRows.reduce(
            (sum, cashRow) => sum + (Number(cashRow.amount) || 0),
            0
          );
          const electronicDraftTotal = getElectronicTypes(transactions, values).reduce(
            (sum, type) => sum +
              (Number(values[getTransactionKey("mpesa", type)]) || 0) +
              (Number(values[getTransactionKey("cheque", type)]) || 0),
            0
          );
          const totalAmount = visibleCashTotal + electronicDraftTotal;
          const latestDate =
            transactions[transactions.length - 1]?.date ||
            ledger.createdAt ||
            ledger.name;

          return (
            <div
              key={ledger.id}
              className="p-4 bg-white shadow rounded border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="font-bold text-lg">{ledger.name}</p>
                  <p className="text-sm text-gray-500">
                    {ledger.description || "No description"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>Record date: {formatDate(latestDate)}</span>
                    <span>Created: {formatDate(ledger.createdAt)}</span>
                    <span>{readOnly ? "Finalized" : "Draft"}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="font-semibold text-green-700 sm:mr-2">
                    {formatCurrency(totalAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadPdf(ledger)}
                    className="bg-gray-800 text-white px-4 py-2 rounded"
                  >
                    Print PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAndFinalize(ledger)}
                    disabled={readOnly || savingLedgerId === ledger.id}
                    className={`px-4 py-2 rounded text-white ${
                      readOnly || savingLedgerId === ledger.id
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {readOnly ? "Read Only" : savingLedgerId === ledger.id ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border rounded">
                <table className="w-full min-w-[760px] text-sm text-left">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="p-2">Category</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Cash</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashRows.map((cashRow) => (
                      <tr key={`${cashRow.category}-${cashRow.type}`} className="border-t">
                        <td className="p-2 font-medium text-gray-800">{cashRow.category}</td>
                        <td className="p-2 text-gray-600">{getTypeLabel(cashRow.type)}</td>
                        <td className="p-2 text-right">{formatOptionalCurrency(cashRow.amount)}</td>
                        <td className="p-2 text-right font-semibold">{formatOptionalCurrency(cashRow.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 overflow-x-auto border rounded">
                <table className="w-full min-w-[560px] text-sm text-left">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="p-2">Giving Type</th>
                      <th className="p-2 text-right">M-Pesa Total</th>
                      <th className="p-2 text-right">Cheque Total</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeOptions.map((type) => {
                      const mpesaKey = getTransactionKey("mpesa", type);
                      const chequeKey = getTransactionKey("cheque", type);
                      const mpesa = Number(values[mpesaKey]) || 0;
                      const cheque = Number(values[chequeKey]) || 0;

                      return (
                        <tr key={type} className="border-t">
                          <td className="p-2 font-medium text-gray-800">{getTypeLabel(type)}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={values[mpesaKey] ?? ""}
                              onChange={(e) => handleEntryChange(ledger.id, "mpesa", type, e.target.value)}
                              readOnly={readOnly}
                              className="w-full border rounded p-2 text-right disabled:bg-gray-100 read-only:bg-gray-100"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={values[chequeKey] ?? ""}
                              onChange={(e) => handleEntryChange(ledger.id, "cheque", type, e.target.value)}
                              readOnly={readOnly}
                              className="w-full border rounded p-2 text-right disabled:bg-gray-100 read-only:bg-gray-100"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {formatCurrency(mpesa + cheque)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
