import React from "react";
import DBStatus from "../../components/DBStatus";

export default function Flashcards({ cards, onBack, onDeleteCard }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Flashcards</h2>
        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={onBack}>← Back</button>
      </div>

      {cards.length ? (
        <ul className="grid sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <li key={c.id || c.term} className="border rounded p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{c.term}</div>
                <div className="text-gray-600">{c.meaning}</div>
              </div>
              <button
                className="shrink-0 px-2 py-1 text-xs rounded bg-red-50 text-red-600 border border-red-200"
                onClick={() => onDeleteCard(c.id ? { id: c.id } : { term: c.term })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No flashcards yet. Add some from the Create screen.</p>
      )}

      {/* NEW: DB status inline */}
      <DBStatus />
    </div>
  );
}
