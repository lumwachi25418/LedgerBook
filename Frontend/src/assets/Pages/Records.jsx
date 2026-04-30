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
const electronicMethods = ["mpesa", "cheque"];
const electronicCategory = "Electronic Giving";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

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
  `${paymentMethod}::${type}`;

const getCashRows = (transactions) => {
  const rowMap = new Map();

  transactions.forEach((transaction) => {
    if (
      transaction.payment_method !== "cash" ||
      !transaction.category ||
      transaction.category === "Bereavement Cash" ||
      transaction.category === "Bereavement M-Pesa" ||
      transaction.category === electronicCategory
    ) {
      return;
    }

    const type = transaction.transaction_type || "offering";
    const key = `${transaction.category}::${type}`;
    const existing = rowMap.get(key);

    if (existing) {
      existing.amount += Number(transaction.amount) || 0;
    } else {
      rowMap.set(key, {
        category: transaction.category,
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
    if (!electronicMethods.includes(transaction.payment_method)) return;

    const key = getTransactionKey(transaction.payment_method, transaction.transaction_type || "");
    values[key] = (Number(values[key]) || 0) + (Number(transaction.amount) || 0);
  });

  return values;
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

    if (savedRows.length > 0) return savedRows;

    return defaultCategories.flatMap((category) =>
      typeOptions.map((type) => ({ category, type, amount: 0 }))
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
          transaction.payment_method === paymentMethod &&
          transaction.category === electronicCategory &&
          transaction.transaction_type === type
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
        item.payment_method === tx.payment_method &&
        item.category === tx.category &&
        item.transaction_type === tx.transaction_type
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
      electronicMethods.includes(transaction.payment_method) &&
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
    const cashRows = getCashRows(transactions);
    const values = entryValues[ledger.id] || buildElectronicState(transactions);
    const rows = [];

    cashRows.forEach((cashRow) => {
      if (cashRow.amount <= 0) return;

      rows.push([
        cashRow.category,
        cashRow.type,
        formatCurrency(cashRow.amount),
        "",
        "",
        formatCurrency(cashRow.amount),
      ]);
    });

    typeOptions.forEach((type) => {
      const mpesa = Number(values[getTransactionKey("mpesa", type)]) || 0;
      const cheque = Number(values[getTransactionKey("cheque", type)]) || 0;
      const total = mpesa + cheque;

      if (total <= 0) return;

      rows.push([
        "Electronic totals",
        type,
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
    });

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
          const values = entryValues[ledger.id] || {};
          const readOnly = Boolean(ledger.isFinalized);
          const visibleCashTotal = cashRows.reduce(
            (sum, cashRow) => sum + cashRow.amount,
            0
          );
          const electronicDraftTotal = typeOptions.reduce(
            (sum, type) =>
              sum +
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
                        <td className="p-2 text-gray-600">{cashRow.type}</td>
                        <td className="p-2 text-right">{formatCurrency(cashRow.amount)}</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(cashRow.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 overflow-x-auto border rounded">
                <table className="w-full min-w-[560px] text-sm text-left">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="p-2">Electronic Giving Type</th>
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
                          <td className="p-2 font-medium text-gray-800">{type}</td>
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
