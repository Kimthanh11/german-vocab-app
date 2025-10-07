import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function DBStatus() {
  const [counts, setCounts] = useState({ lessons: 0, cards: 0 });
  const [loading, setLoading] = useState(false);
  const [ts, setTs] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const c = await api.getCounts();
      setCounts(c);
      setTs(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
      <span className="font-medium">DB:</span>
      <span className="px-2 py-0.5 rounded bg-gray-100">Lessons: {counts.lessons}</span>
      <span className="px-2 py-0.5 rounded bg-gray-100">Flashcards: {counts.cards}</span>
      <button
        className="ml-2 px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
        onClick={refresh}
        disabled={loading}
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>
      {ts && <span className="ml-1">({ts.toLocaleTimeString()})</span>}
    </div>
  );
}
