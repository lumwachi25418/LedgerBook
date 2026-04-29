import { useEffect, useState } from "react";
import { getLedgers } from "../../Utilities/api";

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

export default function Records() {
  const [ledgers, setLedgers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getLedgers();
      setLedgers(Array.isArray(response?.data) ? response.data : []);
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

  const filteredLedgers = ledgers.filter((ledger) => {
    const query = search.toLowerCase();
    const transactionText = (ledger.Transactions || [])
      .map((transaction) => transaction.description)
      .join(" ")
      .toLowerCase();￼
Password

    return (
      ledger.name?.toLowerCase().includes(query) ||
      ledger.description?.toLowerCase().includes(query) ||
      transactionText.includes(query)
    );
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Ledger Records</h1>

      <input
        type="text"
        placeholder="Search ledgers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />

      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && filteredLedgers.length === 0 && (
        <p className="text-center text-gray-500">No ledger records found</p>
      )}

      <div className="space-y-3">
        {filteredLedgers.map((ledger) => {
          const transactions = ledger.Transactions || [];
          const totalAmount = transactions.reduce(
            (sum, transaction) => sum + (Number(transaction.amount) || 0),
            0
          );
          const latestDate =
            transactions[transactions.length - 1]?.date ||
            ledger.createdAt ||
            ledger.name;

          return (
            <div
              key={ledger.id}
              className="p-4 bg-white shadow rounded border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-lg">{ledger.name}</p>
                  <p className="text-sm text-gray-500">
                    {ledger.description || "No description"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-green-700">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transactions.length} transaction
                    {transactions.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
                <span>Record date: {formatDate(latestDate)}</span>
                <span>Created: {formatDate(ledger.createdAt)}</span>
              </div>

              {transactions.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Saved entries
                  </p>

                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(transaction.date)}
                          </p>
                        </div>

                        <p className="font-semibold text-gray-700">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
