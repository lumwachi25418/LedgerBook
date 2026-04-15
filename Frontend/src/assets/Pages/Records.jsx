import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  API_BASE,
  createTransaction,
  getLedgers,
  updateLedger,
  updateTransaction,
} from "../../Utilities/api";

const typeOptions = [
  "offering",
  "tithes",
  "pillar",
  "Thanksgiving",
  "Bearevement",
  "firstfruits",
];

const paymentMethods = ["mpesa", "cheque"];
const lockedCashCategories = ["Sunday School", "Teens"];

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

const createPaymentMap = () =>
  Object.fromEntries(
    typeOptions.map((type) => [type, { amount: "", transactionId: null }])
  );

const buildEditorState = (ledgers) =>
  Object.fromEntries(
    ledgers.map((ledger) => {
      const categories = {};

      (ledger.Transactions || []).forEach((transaction) => {
        const category = transaction.category || "General";
        const paymentMethod = transaction.payment_method || "cash";
        const type = transaction.transaction_type || "offering";

        if (!categories[category]) {
          categories[category] = {
            cash: [],
            mpesa: createPaymentMap(),
            cheque: createPaymentMap(),
          };
        }

        if (paymentMethod === "cash") {
          categories[category].cash.push({
            id: transaction.id,
            type,
            amount: Number(transaction.amount) || 0,
          });
          return;
        }

        if (!categories[category][paymentMethod]) {
          categories[category][paymentMethod] = createPaymentMap();
        }

        categories[category][paymentMethod][type] = {
          amount: transaction.amount ?? "",
          transactionId: transaction.id,
        };
      });

      return [ledger.id, categories];
    })
  );

const sortCategoryNames = (categories) => Object.keys(categories).sort();

export default function Records() {
  const [ledgers, setLedgers] = useState([]);
  const [editorState, setEditorState] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingLedgerId, setSavingLedgerId] = useState(null);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await getLedgers();
      const ledgerData = Array.isArray(response?.data) ? response.data : [];
      const sortedLedgers = [...ledgerData].sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || ""))
      );

      setLedgers(sortedLedgers);
      setEditorState(buildEditorState(sortedLedgers));
    } catch (err) {
      console.error("Fetch ledgers error:", err);
      setError(err.message || "Could not load ledger records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const calculateCategoryTotals = (categoryValues) => {
    const cashTotal = (categoryValues?.cash || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    const mpesaTotal = typeOptions.reduce(
      (sum, type) => sum + (Number(categoryValues?.mpesa?.[type]?.amount) || 0),
      0
    );
    const chequeTotal = typeOptions.reduce(
      (sum, type) => sum + (Number(categoryValues?.cheque?.[type]?.amount) || 0),
      0
    );

    return {
      cashTotal,
      mpesaTotal,
      chequeTotal,
      grandTotal: cashTotal + mpesaTotal + chequeTotal,
    };
  };

  const calculateLedgerGrandTotal = (ledgerId) =>
    Object.values(editorState[ledgerId] || {}).reduce(
      (sum, categoryValues) => sum + calculateCategoryTotals(categoryValues).grandTotal,
      0
    );

  const handlePaymentChange = (ledgerId, category, paymentMethod, type, value) => {
    setEditorState((prev) => ({
      ...prev,
      [ledgerId]: {
        ...(prev[ledgerId] || {}),
        [category]: {
          ...(prev[ledgerId]?.[category] || {
            cash: [],
            mpesa: createPaymentMap(),
            cheque: createPaymentMap(),
          }),
          [paymentMethod]: {
            ...(prev[ledgerId]?.[category]?.[paymentMethod] || createPaymentMap()),
            [type]: {
              ...((prev[ledgerId]?.[category]?.[paymentMethod] || createPaymentMap())[type] || {
                amount: "",
                transactionId: null,
              }),
              amount: value,
            },
          },
        },
      },
    }));
  };

  const handleSaveLedger = async (ledger) => {
    if (ledger.isFinalized) return;
    const ledgerState = editorState[ledger.id];
    if (!ledgerState) return;

    setSavingLedgerId(ledger.id);
    setError("");
    setSuccessMessage("");

    try {
      for (const [category, categoryValues] of Object.entries(ledgerState)) {
        for (const paymentMethod of paymentMethods) {
          for (const type of typeOptions) {
            const entry = categoryValues?.[paymentMethod]?.[type] || {
              amount: "",
              transactionId: null,
            };
            const parsedAmount = Number(entry.amount) || 0;

            if (parsedAmount <= 0 && !entry.transactionId) continue;

            const payload = {
              description: `${category} ${paymentMethod} - ${type}`,
              amount: parsedAmount,
              date: ledger.name,
              payment_method: paymentMethod,
              category,
              transaction_type: type,
            };

            if (entry.transactionId) {
              await updateTransaction(ledger.id, entry.transactionId, payload);
            } else {
              const created = await createTransaction(ledger.id, payload);

              setEditorState((prev) => ({
                ...prev,
                [ledger.id]: {
                  ...prev[ledger.id],
                  [category]: {
                    ...prev[ledger.id][category],
                    [paymentMethod]: {
                      ...prev[ledger.id][category][paymentMethod],
                      [type]: {
                        amount: parsedAmount,
                        transactionId: created?.data?.id || null,
                      },
                    },
                  },
                },
              }));
            }
          }
        }
      }

      await fetchLedgers();
      setSuccessMessage(`Records for ${ledger.name} saved successfully.`);
    } catch (err) {
      console.error("Save ledger record error:", err);
      setError(err.message || "Could not save record changes");
    } finally {
      setSavingLedgerId(null);
    }
  };

  const exportFinalPdf = async (ledger) => {
    const categories = editorState[ledger.id] || {};
    const categoryNames = sortCategoryNames(categories);
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Church Collection Report", 14, 12);
    doc.setFontSize(11);
    doc.text(`Ledger Date: ${ledger.name}`, 14, 20);
    doc.text(`Description: ${ledger.description || "No description"}`, 14, 26);

    let y = 32;

    categoryNames.forEach((category) => {
      const categoryValues = categories[category];
      const rows = [];

      (categoryValues.cash || []).forEach((entry) => {
        rows.push([`Cash - ${entry.type}`, formatCurrency(entry.amount)]);
      });

      paymentMethods.forEach((paymentMethod) => {
        typeOptions.forEach((type) => {
          const amount = Number(categoryValues?.[paymentMethod]?.[type]?.amount) || 0;
          if (amount > 0) {
            rows.push([
              `${paymentMethod.toUpperCase()} - ${type}`,
              formatCurrency(amount),
            ]);
          }
        });
      });

      const totals = calculateCategoryTotals(categoryValues);
      rows.push(["Category Total", formatCurrency(totals.grandTotal)]);

      autoTable(doc, {
        startY: y,
        head: [[category, "Amount"]],
        body: rows.length ? rows : [["No entries", formatCurrency(0)]],
      });

      y = doc.lastAutoTable.finalY + 6;
    });

    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(
      `Grand Total: ${formatCurrency(calculateLedgerGrandTotal(ledger.id))}`,
      14,
      y + 8
    );
    doc.setFont(undefined, "normal");

    const fileName = `Church_Ledger_${ledger.name}.pdf`;
    const dataUri = doc.output("datauristring");
    const base64File = dataUri.split(",")[1];

    try {
      await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fileName,
          date: ledger.name,
          file: base64File,
        }),
      });
    } catch (err) {
      console.error("Failed to save final report", err);
    }

    await updateLedger(ledger.id, { isFinalized: true });
    doc.save(fileName);
    await fetchLedgers();
    setSuccessMessage(`Final PDF for ${ledger.name} generated successfully. This record is now read-only.`);
  };

  const filteredLedgers = ledgers.filter((ledger) => {
    const query = search.toLowerCase();
    const ledgerName = ledger.name?.toLowerCase() || "";
    const ledgerDescription = ledger.description?.toLowerCase() || "";
    const categories = editorState[ledger.id] || {};
    const categoryNames = Object.keys(categories).join(" ").toLowerCase();
    const transactionText = (ledger.Transactions || [])
      .map((transaction) =>
        [
          transaction.description,
          transaction.category,
          transaction.payment_method,
          transaction.transaction_type,
          transaction.date,
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(" ")
      .toLowerCase();
    const categorySummary = Object.entries(categories)
      .map(([category, values]) => {
        const paymentSummary = paymentMethods
          .flatMap((paymentMethod) =>
            typeOptions.map((type) => `${paymentMethod} ${type} ${values?.[paymentMethod]?.[type]?.amount ?? ""}`)
          )
          .join(" ");

        const cashSummary = (values.cash || [])
          .map((entry) => `cash ${entry.type} ${entry.amount}`)
          .join(" ");

        return `${category} ${paymentSummary} ${cashSummary}`;
      })
      .join(" ")
      .toLowerCase();

    return (
      ledgerName.includes(query) ||
      ledgerDescription.includes(query) ||
      categoryNames.includes(query) ||
      transactionText.includes(query) ||
      categorySummary.includes(query)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-center">Ledger Records</h1>
      <p className="text-center text-gray-600 mb-4">
        Cash entries are locked after church counting. Update MPESA and cheque here when statements arrive.
      </p>

      <input
        type="text"
        placeholder="Search ledger records..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />

      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}
      {successMessage && (
        <p className="text-center text-green-600 mb-4">{successMessage}</p>
      )}

      {!loading && !error && filteredLedgers.length === 0 && (
        <p className="text-center text-gray-500">No ledger records found</p>
      )}

      <div className="space-y-5">
        {filteredLedgers.map((ledger) => {
          const categories = editorState[ledger.id] || {};
          const categoryNames = sortCategoryNames(categories);
          const ledgerTotal = calculateLedgerGrandTotal(ledger.id);
          const isReadOnly = Boolean(ledger.isFinalized);

          return (
            <div
              key={ledger.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{ledger.name}</h2>
                  <p className="text-sm text-gray-500">
                    {ledger.description || "No description"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Created: {formatDate(ledger.createdAt)}
                  </p>
                  {isReadOnly && (
                    <p className="mt-1 text-sm font-medium text-blue-700">
                      Finalized: this record is read-only.
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500">Current total</p>
                  <p className="text-lg font-semibold text-green-700">
                    {formatCurrency(ledgerTotal)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {categoryNames.map((category) => {
                  const categoryValues = categories[category];
                  const totals = calculateCategoryTotals(categoryValues);
                  const allowsStatementPayments =
                    !lockedCashCategories.includes(category);

                  return (
                    <div
                      key={`${ledger.id}-${category}`}
                      className="rounded border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-semibold text-gray-800">{category}</h3>
                        <span className="text-sm font-medium text-gray-600">
                          Category total: {formatCurrency(totals.grandTotal)}
                        </span>
                      </div>

                      {(categoryValues.cash || []).length > 0 && (
                        <div className="mb-4 space-y-2">
                          {(categoryValues.cash || []).map((cashEntry) => (
                            <div
                              key={cashEntry.id}
                              className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm"
                            >
                              <span className="text-gray-600">Cash - {cashEntry.type}</span>
                              <span className="font-medium text-gray-800">
                                {formatCurrency(cashEntry.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {allowsStatementPayments ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {paymentMethods.map((paymentMethod) => (
                            <div key={`${ledger.id}-${category}-${paymentMethod}`}>
                              <h4 className="mb-2 font-semibold uppercase text-gray-700">
                                {paymentMethod}
                              </h4>

                              <div className="space-y-2">
                                {typeOptions.map((type) => (
                                  <div
                                    key={`${ledger.id}-${category}-${paymentMethod}-${type}`}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <label className="text-sm text-gray-600">{type}</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={
                                        categoryValues?.[paymentMethod]?.[type]?.amount ?? ""
                                      }
                                      disabled={isReadOnly}
                                      onChange={(e) =>
                                        handlePaymentChange(
                                          ledger.id,
                                          category,
                                          paymentMethod,
                                          type,
                                          e.target.value
                                        )
                                      }
                                      className="w-32 rounded border p-2 text-right disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          MPESA and cheque entries are not used for this category.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-gray-700">
                        <span>Cash: {formatCurrency(totals.cashTotal)}</span>
                        <span>MPESA: {formatCurrency(totals.mpesaTotal)}</span>
                        <span>Cheque: {formatCurrency(totals.chequeTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => handleSaveLedger(ledger)}
                  disabled={savingLedgerId === ledger.id || isReadOnly}
                  className="rounded bg-amber-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  {isReadOnly
                    ? "Record Finalized"
                    : savingLedgerId === ledger.id
                      ? "Saving..."
                      : "Save MPESA / Cheque"}
                </button>
                <button
                  onClick={() => exportFinalPdf(ledger)}
                  disabled={isReadOnly}
                  className="rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isReadOnly ? "PDF Finalized" : "Print Final PDF"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
